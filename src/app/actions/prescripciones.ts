"use server";

import { revalidatePath } from "next/cache";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled, assertPuedeFirmar, dbError } from "@/lib/modules/guards";
import { buscarMedicamentos } from "@/lib/medicamentos/catalogo";
import { PrescripcionInputSchema } from "@/lib/prescripciones/validations";
import { buildProfesionalSnapshot } from "@/lib/prescripciones/snapshot";
import type { ActionResult } from "@/lib/modules/guards";
import { log } from "@/lib/logger";
import type { Rol } from "@/lib/modules/registry";
import type { Prescripcion, MedicamentoPrescrito, ModoFirma, TipoPrescripcion } from "@/types/prescripcion";
import type { MedicamentoCatalogo } from "@/types/medicamento";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getPerfilPrescripcion } from "@/lib/prescripciones/perfiles";

// ── getPrescripcionesByPatient ─────────────────────────────────────────────

export async function getPrescripcionesByPatient(
  patientId: string
): Promise<ActionResult<Prescripcion[]>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users").select("id_clinica").eq("auth_id", user.id).eq("activo", true).single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return dbError("prescripciones", error);
  return { success: true, data: (data ?? []) as Prescripcion[] };
}

// ── getPrescripcionById ────────────────────────────────────────────────────

export async function getPrescripcionById(
  prescripcionId: string
): Promise<ActionResult<Prescripcion>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users").select("id_clinica").eq("auth_id", user.id).eq("activo", true).single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id", prescripcionId)
    .eq("id_clinica", idClinica)
    .single();

  if (error || !data) {
    return { success: false, error: "Prescripción no encontrada." };
  }
  return { success: true, data: data as Prescripcion };
}

// ── searchMedicamentos ─────────────────────────────────────────────────────

export async function searchMedicamentos(
  query: string
): Promise<ActionResult<MedicamentoCatalogo[]>> {
  const { supabase, user, idClinica } = await requireContext();

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  const perfil = profesional
    ? getPerfilPrescripcion(profesional.especialidad)
    : undefined;

  const results = await buscarMedicamentos(supabase, query, perfil);
  return { success: true, data: results };
}

// ── createAndSignPrescripcion ──────────────────────────────────────────────

export async function createAndSignPrescripcion(input: {
  patientId: string;
  encuentroId: string | null;
  tipo: TipoPrescripcion;
  medicamentos: MedicamentoPrescrito[] | null;
  indicacionesGenerales: string | null;
  diagnosticoAsociado: string | null;
  modoFirma: ModoFirma;
  firmaCanvas: string | null;
}): Promise<ActionResult<{ prescripcion: Prescripcion; folio: string }>> {
  // I3: Validate input schema first (covers medicamentos + canvas check)
  const parsed = PrescripcionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // C1: Steps 1+2 — auth + idClinica + rol via requireContext
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  let rol: Rol;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
    rol = ctx.rol as Rol;
  } catch {
    return { success: false, error: "No se pudo determinar la clínica" };
  }

  // C2: Step 3 — assertModuleEnabled using getClinicaConfig (avoids double auth roundtrip)
  const config = await getClinicaConfig(idClinica, supabase);
  if (!config) return { success: false, error: "No se encontró configuración FCE de la clínica." };
  const moduleGuard = assertModuleEnabled(config, "M7_prescripciones");
  if (!moduleGuard.success) return moduleGuard;

  // C3: Step 4 — assertPuedeFirmar role-level gate
  const roleGuard = assertPuedeFirmar(rol);
  if (!roleGuard.success) return roleGuard;

  // Step 5 — getProfesionalActivo with idClinica from admin_users
  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado" };
  }

  // Step 6 — puede_prescribir check
  if (!profesional.puede_prescribir) {
    return { success: false, error: "Tu perfil profesional no tiene autorización para prescribir" };
  }

  // Step 6b — Validar medicamentos autorizados para el perfil del profesional
  if (input.tipo === "farmacologica" && input.medicamentos?.length) {
    const perfil = getPerfilPrescripcion(profesional.especialidad);
    const nombresPrescritos = input.medicamentos.map((m) => m.principio_activo);

    const { data: autorizados } = await supabase
      .from("medicamentos_catalogo")
      .select("principio_activo")
      .eq("activo", true)
      .contains("perfiles_autorizados", [perfil])
      .in("principio_activo", nombresPrescritos);

    const autorizadosSet = new Set(autorizados?.map((a) => a.principio_activo) ?? []);
    const noAutorizados = nombresPrescritos.filter((n) => !autorizadosSet.has(n));

    if (noAutorizados.length > 0) {
      return {
        success: false,
        error: `Medicamentos no autorizados para tu perfil: ${noAutorizados.join(", ")}`,
      };
    }
  }

  // Step 7 — Encuentro validation (if provided)
  if (input.encuentroId) {
    const { data: enc, error: encError } = await supabase
      .from("fce_encuentros")
      .select("id, id_paciente, status")
      .eq("id", input.encuentroId)
      .single();

    if (encError || !enc) {
      return { success: false, error: "Encuentro no encontrado" };
    }
    if (enc.id_paciente !== input.patientId) {
      return { success: false, error: "El encuentro no corresponde al paciente" };
    }
    if (enc.status === "finalizado") {
      return { success: false, error: "El encuentro ya está finalizado" };
    }
  }

  // Step 8 — buildProfesionalSnapshot
  const snapshot = buildProfesionalSnapshot(profesional);

  // Step 9 — INSERT using idClinica from admin_users (NOT from profesional.id_clinica)
  const { data: prescripcion, error: insertError } = await supabase
    .from("fce_prescripciones")
    .insert({
      id_clinica: idClinica,
      id_paciente: input.patientId,
      id_encuentro: input.encuentroId,
      tipo: input.tipo,
      medicamentos: input.tipo === "farmacologica" ? input.medicamentos : null,
      indicaciones_generales: input.indicacionesGenerales,
      diagnostico_asociado: input.diagnosticoAsociado,
      modo_firma: input.modoFirma,
      firma_canvas: input.firmaCanvas,
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      ...snapshot,
      created_by: profesional.id,
      folio_anio: new Date().getFullYear(),
      folio_numero: 0,
    })
    .select("*")
    .single();

  if (insertError || !prescripcion) {
    log("error", { action: "crear_prescripcion", id_clinica: idClinica, id_paciente: input.patientId, error: insertError });
    return { success: false, error: "No se pudo crear la prescripción" };
  }

  // Step 10 — Audit log
  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_prescripcion",
    tipoEvento: "sign",
    tablaAfectada: "fce_prescripciones",
    registroId: prescripcion.id,
    idClinica: idClinica,
    idPaciente: input.patientId,
  });

  // I2: Step 11 — revalidatePath after logAudit
  revalidatePath(`/dashboard/pacientes/${input.patientId}`);

  return {
    success: true,
    data: {
      prescripcion: prescripcion as Prescripcion,
      folio: prescripcion.folio_display,
    },
  };
}

// ── Audit tracking R11 ────────────────────────────────────────────────────────

export async function logPrescripcionDownload(
  prescripcionId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

  const { data: presc } = await supabase
    .from("fce_prescripciones")
    .select("id_clinica, id_paciente")
    .eq("id", prescripcionId)
    .maybeSingle();

  if (!presc) return { success: false, error: "Prescripción no encontrada" };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "descargar_prescripcion",
    tipoEvento: "export_pdf",
    tablaAfectada: "fce_prescripciones",
    registroId: prescripcionId,
    idClinica: presc.id_clinica,
    idPaciente: presc.id_paciente,
  });

  return { success: true, data: undefined };
}

export async function logPrescripcionPrint(
  prescripcionId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

  const { data: presc } = await supabase
    .from("fce_prescripciones")
    .select("id_clinica, id_paciente")
    .eq("id", prescripcionId)
    .maybeSingle();

  if (!presc) return { success: false, error: "Prescripción no encontrada" };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "imprimir_prescripcion",
    tipoEvento: "export_pdf",
    tablaAfectada: "fce_prescripciones",
    registroId: prescripcionId,
    idClinica: presc.id_clinica,
    idPaciente: presc.id_paciente,
  });

  return { success: true, data: undefined };
}

export async function logPrescripcionShare(
  prescripcionId: string,
  canal: "email" | "whatsapp" | "otro"
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

  const { data: presc } = await supabase
    .from("fce_prescripciones")
    .select("id_clinica, id_paciente")
    .eq("id", prescripcionId)
    .maybeSingle();

  if (!presc) return { success: false, error: "Prescripción no encontrada" };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: `compartir_prescripcion_${canal}`,
    tipoEvento: "export_pdf",
    tablaAfectada: "fce_prescripciones",
    registroId: prescripcionId,
    idClinica: presc.id_clinica,
    idPaciente: presc.id_paciente,
  });

  return { success: true, data: undefined };
}
