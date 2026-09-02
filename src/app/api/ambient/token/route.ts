import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEspecialidadConfig } from "@/lib/modules/especialidad-config";
import { ROLES_QUE_PUEDEN_FIRMAR } from "@/lib/modules/registry";
import { assertConsentimientoGrabacion } from "@/lib/ambient/consentimiento";
import { issueEphemeralSttToken, SttProviderNotConfiguredError } from "@/lib/ambient/stt-provider";
import { iaRateLimit, iaRateLimitClinica } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

/**
 * AMB-1 F2 — token efímero de streaming STT.
 *
 * Route Handler (no Server Action): el cliente necesita el token de vuelta
 * en el response body antes de abrir el WebSocket (AMB-1-ambient-scribe.md §4).
 *
 * Hard stops, en orden — cualquiera de estos basta para negar el token:
 *  1. Sesión inválida
 *  2. El encuentro no pertenece al paciente / a una clínica del usuario
 *  3. Rol sin permiso de firma (solo profesional graba, mismo criterio que M4/M7)
 *  4. Encuentro no está en_progreso
 *  5. Especialidad sin tieneAmbientScribe (config, nunca if especialidad===)
 *  6. Sin consentimiento de grabación vigente — assertConsentimientoGrabacion()
 *  7. Rate limit por usuario y por clínica
 *
 * La API key real del proveedor STT nunca llega a este response — solo el
 * token efímero que emite issueEphemeralSttToken() (hoy no configurado, ver
 * lib/ambient/stt-provider.ts).
 */
export async function GET(request: NextRequest) {
  const idEncuentro = request.nextUrl.searchParams.get("idEncuentro");
  const idPaciente = request.nextUrl.searchParams.get("idPaciente");
  if (!idEncuentro || !idPaciente) {
    return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: adminRows } = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true);

  const { data: encuentro, error: encuentroError } = await supabase
    .from("fce_encuentros")
    .select("id, id_paciente, especialidad, id_clinica, status")
    .eq("id", idEncuentro)
    .single();

  if (encuentroError || !encuentro) {
    return NextResponse.json({ error: "Encuentro no encontrado" }, { status: 404 });
  }
  if (encuentro.id_paciente !== idPaciente) {
    return NextResponse.json({ error: "El encuentro no corresponde al paciente" }, { status: 403 });
  }

  const admin = adminRows?.find((r) => r.id_clinica === encuentro.id_clinica);
  if (!admin || !ROLES_QUE_PUEDEN_FIRMAR.includes(admin.rol as (typeof ROLES_QUE_PUEDEN_FIRMAR)[number])) {
    return NextResponse.json({ error: "Sin permiso para grabar este encuentro" }, { status: 403 });
  }
  if (encuentro.status !== "en_progreso") {
    return NextResponse.json({ error: "El encuentro ya no está en progreso" }, { status: 403 });
  }

  if (!getEspecialidadConfig(encuentro.especialidad).tieneAmbientScribe) {
    return NextResponse.json(
      { error: "Ambient Scribe no está habilitado para esta especialidad" },
      { status: 403 }
    );
  }

  const consentimiento = await assertConsentimientoGrabacion(supabase, idPaciente);
  if (!consentimiento.success) {
    return NextResponse.json({ error: consentimiento.error }, { status: 403 });
  }

  const rlUser = await iaRateLimit("ambient_token", user.id, 10, 60_000);
  if (!rlUser.allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }
  const rlClinica = await iaRateLimitClinica("ambient_token", encuentro.id_clinica, 50, 60_000);
  if (!rlClinica.allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes en esta clínica. Espera un momento e inténtalo de nuevo." }, { status: 429 });
  }

  try {
    const { token, expiresInMs, wsUrl } = await issueEphemeralSttToken();

    void logAudit({
      supabase,
      actorId: user.id,
      accion: "emitir_token_ambient_stt",
      tipoEvento: "ia_ambient",
      tablaAfectada: "fce_encuentros",
      registroId: idEncuentro,
      idClinica: encuentro.id_clinica,
      idPaciente,
    });

    return NextResponse.json(
      { token, expiresInMs, wsUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    if (e instanceof SttProviderNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    log("error", { action: "ambient_token_issue", id_clinica: encuentro.id_clinica, error: e });
    return NextResponse.json({ error: "No se pudo emitir el token de grabación" }, { status: 503 });
  }
}
