"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { anamnesisSchema, vitalSignsSchema, type AnamnesisSchemaType, type VitalSignsSchemaType } from "@/lib/validations";
import type { Anamnesis, VitalSigns } from "@/types";
import type { ActionResult } from "./patients";
import { getIdClinica } from "./patients";

// ── getAnamnesis ───────────────────────────────────────────────────────────

export async function getAnamnesis(
  patientId: string
): Promise<ActionResult<Anamnesis | null>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_anamnesis")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Anamnesis | null };
}

// ── upsertAnamnesis ────────────────────────────────────────────────────────

export async function upsertAnamnesis(
  patientId: string,
  formData: AnamnesisSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = anamnesisSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // ¿Ya existe una anamnesis para este paciente?
  const { data: existing } = await supabase
    .from("fce_anamnesis")
    .select("id")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  let id: string;

  if (existing?.id) {
    // UPDATE — incluye id_clinica para bloquear cross-tenant en la escritura
    const { error } = await supabase
      .from("fce_anamnesis")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("id_clinica", idClinica);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "actualizar_anamnesis",
      tipoEvento: "update",
      tablaAfectada: "fce_anamnesis",
      registroId: id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
  } else {
    // INSERT
    if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };
    const { data: created, error } = await supabase
      .from("fce_anamnesis")
      .insert({
        id_paciente: patientId,
        ...parsed.data,
        created_by: profesionalId,
        id_clinica: idClinica,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "crear_anamnesis",
      tipoEvento: "create",
      tablaAfectada: "fce_anamnesis",
      registroId: id,
      idClinica: idClinica,
      idPaciente: patientId,
    });
  }

  revalidatePath(`/dashboard/pacientes/${patientId}/anamnesis`);
  return { success: true, data: { id } };
}

// ── getLatestVitalSigns ────────────────────────────────────────────────────

export async function getLatestVitalSigns(
  patientId: string
): Promise<ActionResult<VitalSigns | null>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_signos_vitales")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as VitalSigns | null };
}

// ── saveVitalSigns ─────────────────────────────────────────────────────────

export async function saveVitalSigns(
  patientId: string,
  formData: VitalSignsSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = vitalSignsSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica, profesionalId } = await requireContext();
  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("fce_signos_vitales")
    .insert({
      id_paciente: patientId,
      id_encuentro: null, // Registro de M2 — sin encuentro activo
      ...parsed.data,
      recorded_by: profesionalId,
      recorded_at: new Date().toISOString(),
      id_clinica: idClinica,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "registrar_signos_vitales",
    tipoEvento: "create",
    tablaAfectada: "fce_signos_vitales",
    registroId: data.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}/anamnesis`);
  return { success: true, data: { id: data.id } };
}
