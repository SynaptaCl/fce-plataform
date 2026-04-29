"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type {
  PlanTratamiento,
  PlanTratamientoItem,
  EstadoItem,
  PrioridadItem,
} from "@/types/plan-tratamiento";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  accion: string,
  tabla: string,
  registroId: string,
  idClinica: string,
  idPaciente: string,
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tabla,
      registro_id: registroId,
      id_clinica: idClinica,
      id_paciente: idPaciente,
    });
  } catch {
    // no bloquea el flujo principal
  }
}

// ── getPlanActivo ─────────────────────────────────────────────────────────────

export async function getPlanActivo(
  patientId: string,
): Promise<ActionResult<PlanTratamiento | null>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const { data, error } = await supabase
    .from("fce_plan_tratamiento")
    .select(`*, items:fce_plan_tratamiento_items(*)`)
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .eq("estado", "activo")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: true, data: null };

  const plan = data as PlanTratamiento & {
    items: PlanTratamientoItem[];
  };

  plan.items = (plan.items ?? []).sort((a, b) => a.orden - b.orden);

  return { success: true, data: plan };
}

// ── createPlan ────────────────────────────────────────────────────────────────

export async function createPlan(
  patientId: string,
  input: { titulo?: string; diagnostico?: string; observaciones?: string },
): Promise<ActionResult<PlanTratamiento>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional)
    return {
      success: false,
      error: "No se encontró el perfil profesional del usuario.",
    };

  const { data, error } = await supabase
    .from("fce_plan_tratamiento")
    .insert({
      id_clinica: idClinica,
      id_paciente: patientId,
      titulo: input.titulo?.trim() || "Plan de tratamiento",
      diagnostico: input.diagnostico?.trim() || null,
      observaciones: input.observaciones?.trim() || null,
      estado: "activo",
      presupuesto_total: 0,
      monto_pagado: 0,
      cerrado: false,
      created_by: profesional.id,
    })
    .select(`*, items:fce_plan_tratamiento_items(*)`)
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit(
    supabase,
    user.id,
    "crear_plan_tratamiento",
    "fce_plan_tratamiento",
    data.id,
    idClinica,
    patientId,
  );

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { ...data, items: [] } as PlanTratamiento };
}

// ── addItemPlan ───────────────────────────────────────────────────────────────

export async function addItemPlan(
  planId: string,
  patientId: string,
  input: {
    procedimiento: string;
    descripcion?: string;
    pieza?: number | null;
    superficie?: string | null;
    prioridad?: PrioridadItem;
    valor_unitario?: number;
    notas?: string;
  },
): Promise<ActionResult<PlanTratamientoItem>> {
  if (!input.procedimiento?.trim())
    return { success: false, error: "El procedimiento es requerido." };

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  // Verificar que el plan pertenece a esta clínica
  const { data: plan } = await supabase
    .from("fce_plan_tratamiento")
    .select("id, cerrado, id_paciente")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (!plan) return { success: false, error: "Plan no encontrado." };
  if (plan.cerrado) return { success: false, error: "El plan está cerrado." };

  // Obtener el próximo orden
  const { count } = await supabase
    .from("fce_plan_tratamiento_items")
    .select("*", { count: "exact", head: true })
    .eq("id_plan", planId);

  const { data: item, error } = await supabase
    .from("fce_plan_tratamiento_items")
    .insert({
      id_plan: planId,
      id_clinica: idClinica,
      procedimiento: input.procedimiento.trim(),
      descripcion: input.descripcion?.trim() || null,
      pieza: input.pieza ?? null,
      superficie: input.superficie?.trim() || null,
      orden: count ?? 0,
      prioridad: input.prioridad ?? "normal",
      estado: "pendiente",
      valor_unitario: input.valor_unitario ?? 0,
      notas: input.notas?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  // Recalcular presupuesto_total del plan
  await recalcularPresupuesto(supabase, planId, idClinica);

  await logAudit(
    supabase,
    user.id,
    "agregar_item_plan",
    "fce_plan_tratamiento_items",
    item.id,
    idClinica,
    patientId,
  );

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: item as PlanTratamientoItem };
}

// ── updateItemEstado ──────────────────────────────────────────────────────────

export async function updateItemEstado(
  itemId: string,
  planId: string,
  patientId: string,
  encuentroId: string | null,
  nuevoEstado: EstadoItem,
): Promise<ActionResult<undefined>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional)
    return {
      success: false,
      error: "No se encontró el perfil profesional del usuario.",
    };

  const updates: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };

  if (nuevoEstado === "completado") {
    updates.id_encuentro_realizado = encuentroId;
    updates.realizado_at = new Date().toISOString();
    updates.realizado_por = profesional.id;
  } else {
    // Revertir si se deshace la finalización
    updates.id_encuentro_realizado = null;
    updates.realizado_at = null;
    updates.realizado_por = null;
  }

  const { error } = await supabase
    .from("fce_plan_tratamiento_items")
    .update(updates)
    .eq("id", itemId)
    .eq("id_plan", planId)
    .eq("id_clinica", idClinica);

  if (error) return { success: false, error: error.message };

  await logAudit(
    supabase,
    user.id,
    `item_plan_${nuevoEstado}`,
    "fce_plan_tratamiento_items",
    itemId,
    idClinica,
    patientId,
  );

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── removeItemPlan ────────────────────────────────────────────────────────────

export async function removeItemPlan(
  itemId: string,
  planId: string,
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  // Solo se pueden eliminar items pendientes o rechazados
  const { data: item } = await supabase
    .from("fce_plan_tratamiento_items")
    .select("estado")
    .eq("id", itemId)
    .eq("id_clinica", idClinica)
    .single();

  if (!item) return { success: false, error: "Ítem no encontrado." };
  if (item.estado === "completado")
    return {
      success: false,
      error: "No se puede eliminar un procedimiento ya realizado.",
    };

  const { error } = await supabase
    .from("fce_plan_tratamiento_items")
    .delete()
    .eq("id", itemId)
    .eq("id_clinica", idClinica);

  if (error) return { success: false, error: error.message };

  await recalcularPresupuesto(supabase, planId, idClinica);

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── cerrarPlan ────────────────────────────────────────────────────────────────

export async function cerrarPlan(
  planId: string,
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional)
    return {
      success: false,
      error: "No se encontró el perfil profesional del usuario.",
    };

  const { error } = await supabase
    .from("fce_plan_tratamiento")
    .update({
      estado: "completado",
      cerrado: true,
      cerrado_at: new Date().toISOString(),
      cerrado_por: profesional.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .eq("cerrado", false);

  if (error) return { success: false, error: error.message };

  await logAudit(
    supabase,
    user.id,
    "cerrar_plan_tratamiento",
    "fce_plan_tratamiento",
    planId,
    idClinica,
    patientId,
  );

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── Helpers internos ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcularPresupuesto(supabase: any, planId: string, idClinica: string) {
  const { data: items } = await supabase
    .from("fce_plan_tratamiento_items")
    .select("valor_unitario")
    .eq("id_plan", planId)
    .eq("id_clinica", idClinica);

  const total = (items ?? []).reduce(
    (sum: number, i: { valor_unitario: number }) => sum + (i.valor_unitario ?? 0),
    0,
  );

  await supabase
    .from("fce_plan_tratamiento")
    .update({ presupuesto_total: total, updated_at: new Date().toISOString() })
    .eq("id", planId);
}
