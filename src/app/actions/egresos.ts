"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { egresoSchema } from "@/lib/validations";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { assertPuedeFirmar } from "@/lib/modules/guards";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type { Egreso } from "@/types/egreso";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      tabla_afectada: "fce_egresos",
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      id_paciente: idPaciente,
    });
  } catch { /* no bloquea */ }
}

// ── createEgreso ──────────────────────────────────────────────────────────────

export async function createEgreso(
  patientId: string,
  formData: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = egresoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) return { success: false, error: "No se encontró el perfil profesional del usuario." };

  const { data: created, error } = await supabase
    .from("fce_egresos")
    .insert({
      id_clinica: idClinica,
      id_paciente: patientId,
      id_encuentro: parsed.data.id_encuentro ?? null,
      tipo_egreso: parsed.data.tipo_egreso,
      diagnostico_egreso: parsed.data.diagnostico_egreso,
      resumen_tratamiento: parsed.data.resumen_tratamiento,
      estado_al_egreso: parsed.data.estado_al_egreso ?? null,
      indicaciones_post_egreso: parsed.data.indicaciones_post_egreso ?? null,
      derivacion_a: parsed.data.derivacion_a ?? null,
      notas: parsed.data.notas ?? null,
      firmado: false,
      created_by: profesional.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "crear_egreso", created.id, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id: created.id } };
}

// ── getEgreso ────────────────────────────────────────────────────────────────

export async function getEgreso(
  egresoId: string,
): Promise<ActionResult<Egreso>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const { data, error } = await supabase
    .from("fce_egresos")
    .select("*")
    .eq("id", egresoId)
    .eq("id_clinica", idClinica)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Egreso };
}

// ── getEgresosByPaciente ──────────────────────────────────────────────────────

export async function getEgresosByPaciente(
  patientId: string,
): Promise<ActionResult<Egreso[]>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const { data, error } = await supabase
    .from("fce_egresos")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Egreso[] };
}

// ── updateEgreso ──────────────────────────────────────────────────────────────

export async function updateEgreso(
  egresoId: string,
  patientId: string,
  formData: Record<string, unknown>,
): Promise<ActionResult<undefined>> {
  const parsed = egresoSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const { data: existing } = await supabase
    .from("fce_egresos")
    .select("firmado")
    .eq("id", egresoId)
    .eq("id_clinica", idClinica)
    .single();

  if (!existing) return { success: false, error: "Egreso no encontrado." };
  if (existing.firmado) return { success: false, error: "El egreso está firmado y no puede modificarse." };

  const { error } = await supabase
    .from("fce_egresos")
    .update({
      tipo_egreso: parsed.data.tipo_egreso,
      diagnostico_egreso: parsed.data.diagnostico_egreso,
      resumen_tratamiento: parsed.data.resumen_tratamiento,
      estado_al_egreso: parsed.data.estado_al_egreso ?? null,
      indicaciones_post_egreso: parsed.data.indicaciones_post_egreso ?? null,
      derivacion_a: parsed.data.derivacion_a ?? null,
      notas: parsed.data.notas ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", egresoId)
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "editar_egreso", egresoId, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── signEgreso ────────────────────────────────────────────────────────────────

export async function signEgreso(
  egresoId: string,
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const guardResult = assertPuedeFirmar(adminRow?.rol ?? null);
  if (!guardResult.success) return guardResult;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) return { success: false, error: "No se encontró el perfil profesional del usuario." };

  const { data: egresoRow } = await supabase
    .from("fce_egresos")
    .select("firmado, id_paciente")
    .eq("id", egresoId)
    .eq("id_clinica", idClinica)
    .single();

  if (!egresoRow) return { success: false, error: "Egreso no encontrado." };
  if (egresoRow.firmado) return { success: false, error: "El egreso ya está firmado." };

  const { error } = await supabase
    .from("fce_egresos")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", egresoId)
    .eq("firmado", false);

  if (error) return { success: false, error: error.message };

  // Marcar paciente como egresado
  await supabase
    .from("pacientes")
    .update({ estado_clinico: "egresado" })
    .eq("id", patientId);

  await logAudit(supabase, user.id, "firmar_egreso", egresoId, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── reingresarPaciente ────────────────────────────────────────────────────────

export async function reingresarPaciente(
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica del usuario." };

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("estado_clinico")
    .eq("id", patientId)
    .eq("id_clinica", idClinica)
    .single();

  if (!paciente) return { success: false, error: "Paciente no encontrado." };
  if (paciente.estado_clinico !== "egresado") {
    return { success: false, error: "El paciente no está en estado egresado." };
  }

  const { error } = await supabase
    .from("pacientes")
    .update({ estado_clinico: "activo" })
    .eq("id", patientId)
    .eq("id_clinica", idClinica);

  if (error) return { success: false, error: error.message };

  await logAudit(supabase, user.id, "reingresar_paciente", patientId, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}
