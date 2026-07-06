"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizeJsonbStrings } from "@/lib/sanitize";
import type { ActionResult } from "@/app/actions/patients";
import { getIdClinica } from "@/app/actions/patients";
import type { Evaluation } from "@/types";

// ── getEvaluaciones ────────────────────────────────────────────────────────

export async function getEvaluaciones(
  patientId: string
): Promise<ActionResult<Evaluation[]>> {
  const { supabase, user } = await requireAuth();
  const idClinica = await getIdClinica(supabase, user.id);

  const { data, error } = await supabase
    .from("fce_evaluaciones")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Evaluation[] };
}

// ── upsertEvaluacion ───────────────────────────────────────────────────────
// Upsert por patient_id + especialidad + sub_area (una ficha por sub-área).

export async function upsertEvaluacion(
  patientId: string,
  especialidad: string,
  subArea: string,
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, profesionalId, idClinica } = await requireContext();

  if (!profesionalId) return { success: false, error: "No se encontró el profesional asociado al usuario." };

  // Sanitizar todo string HTML dentro del jsonb antes de persistir (stored XSS defense).
  const dataSegura = sanitizeJsonbStrings(data);

  const { data: existing } = await supabase
    .from("fce_evaluaciones")
    .select("id")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .eq("especialidad", especialidad)
    .eq("sub_area", subArea)
    .maybeSingle();

  let id: string;

  if (existing?.id) {
    const { error } = await supabase
      .from("fce_evaluaciones")
      .update({ data: dataSegura })
      .eq("id", existing.id)
      .eq("id_clinica", idClinica);

    if (error) return { success: false, error: error.message };
    id = existing.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "aplicar_evaluacion",
      tipoEvento: "create",
      tablaAfectada: "fce_evaluaciones",
      registroId: id,
      idClinica: idClinica!,
      idPaciente: patientId,
    });
  } else {
    const { data: created, error } = await supabase
      .from("fce_evaluaciones")
      .insert({
        id_paciente: patientId,
        id_encuentro: null,
        id_clinica: idClinica,
        especialidad,
        sub_area: subArea,
        data: dataSegura,
        created_by: profesionalId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    id = created.id;
    await logAudit({
      supabase,
      actorId: user.id,
      accion: "aplicar_evaluacion",
      tipoEvento: "create",
      tablaAfectada: "fce_evaluaciones",
      registroId: id,
      idClinica: idClinica!,
      idPaciente: patientId,
    });
  }

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { id } };
}
