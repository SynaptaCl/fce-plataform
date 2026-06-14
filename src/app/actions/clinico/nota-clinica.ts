"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notaClinicaSchema } from "@/lib/validations";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ActionResult } from "@/app/actions/patients";
import type { NotaClinica } from "@/types/nota-clinica";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitiza recursivamente los strings de secciones_estructuradas.
 * Conviven 2 formas: M10 (strings planos en raíz) y P2 ({ [campoId]: valor }).
 * Sanitizar texto no-HTML es no-op, así que es seguro aplicar a todos los strings.
 */
function sanitizeSeccionesEstructuradas(
  secciones: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!secciones || typeof secciones !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [seccionId, contenidoSeccion] of Object.entries(secciones)) {
    if (typeof contenidoSeccion === "string") {
      out[seccionId] = sanitizeRichText(contenidoSeccion);
    } else if (contenidoSeccion && typeof contenidoSeccion === "object" && !Array.isArray(contenidoSeccion)) {
      const sub: Record<string, unknown> = {};
      for (const [campoId, valor] of Object.entries(contenidoSeccion as Record<string, unknown>)) {
        sub[campoId] = typeof valor === "string" ? sanitizeRichText(valor) : valor;
      }
      out[seccionId] = sub;
    } else {
      out[seccionId] = contenidoSeccion;
    }
  }
  return out;
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(supabase: any, userId: string, accion: string, registroId: string, idClinica: string | null, idPaciente: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: "fce_notas_clinicas",
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      id_paciente: idPaciente,
    });
  } catch { /* no bloquea */ }
}

// ── getNotaClinica ───────────────────────────────────────────────────────────

export async function getNotaClinica(
  encuentroId: string,
): Promise<ActionResult<NotaClinica | null>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_notas_clinicas")
    .select("*")
    .eq("id_encuentro", encuentroId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as NotaClinica | null };
}

// ── upsertNotaClinica ────────────────────────────────────────────────────────

export async function upsertNotaClinica(
  encuentroId: string,
  patientId: string,
  formData: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = notaClinicaSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);

  // Normalize optional fields: empty strings → null, cie10_codigos vacío → null
  const { motivo_consulta, contenido, diagnostico, cie10_codigos, plan, proxima_sesion } = parsed.data;
  const seccionesEstructuradas = (formData.secciones_estructuradas as Record<string, Record<string, unknown>> | null | undefined) ?? null;
  const cleanedData = {
    motivo_consulta: motivo_consulta || null, // texto plano — no sanitizar
    contenido: sanitizeRichText(contenido),   // rich-text
    diagnostico: diagnostico || null,         // texto plano
    cie10_codigos: cie10_codigos && cie10_codigos.length > 0 ? cie10_codigos : null,
    plan: plan ? sanitizeRichText(plan) : null, // rich-text
    proxima_sesion: proxima_sesion || null,   // texto plano
    secciones_estructuradas: sanitizeSeccionesEstructuradas(seccionesEstructuradas),
  };

  // Check if nota already exists for this encuentro
  const { data: existing } = await supabase
    .from("fce_notas_clinicas")
    .select("id, firmado")
    .eq("id_encuentro", encuentroId)
    .maybeSingle();

  let id: string;

  if (existing) {
    if (existing.firmado) {
      return { success: false, error: "La nota está firmada y no puede modificarse." };
    }

    const { error } = await supabase
      .from("fce_notas_clinicas")
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("id_clinica", idClinica);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit(supabase, user.id, "actualizar_nota_clinica", id, idClinica, patientId);
  } else {
    if (!profesional) {
      return { success: false, error: "No se encontró el perfil profesional del usuario." };
    }

    const { data: created, error } = await supabase
      .from("fce_notas_clinicas")
      .insert({
        id_clinica: idClinica,
        id_paciente: patientId,
        id_encuentro: encuentroId,
        created_by: profesional.id,
        firmado: false,
        ...cleanedData,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit(supabase, user.id, "crear_nota_clinica", id, idClinica, patientId);
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}

// ── signNotaClinica ──────────────────────────────────────────────────────────

export async function signNotaClinica(
  notaId: string,
  patientId: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica ?? undefined);
  if (!profesional) {
    return { success: false, error: "No se encontró el perfil profesional del usuario." };
  }

  // Leer id_encuentro antes de firmar — filtramos por id_clinica para bloquear cross-tenant
  const { data: notaRow } = await supabase
    .from("fce_notas_clinicas")
    .select("id_encuentro, firmado")
    .eq("id", notaId)
    .eq("id_clinica", idClinica ?? "")
    .single();

  if (!notaRow) return { success: false, error: "Nota no encontrada." };
  if (notaRow.firmado) return { success: false, error: "La nota ya está firmada." };

  const { error } = await supabase
    .from("fce_notas_clinicas")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notaId)
    .eq("id_clinica", idClinica ?? "")
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };

  // Finalizar el encuentro
  await supabase
    .from("fce_encuentros")
    .update({ status: "finalizado", ended_at: new Date().toISOString() })
    .eq("id", notaRow.id_encuentro)
    .eq("status", "en_progreso");

  await logAudit(supabase, user.id, "firmar_nota_clinica", notaId, idClinica, patientId);

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { redirectTo: `/dashboard/pacientes/${patientId}` } };
}
