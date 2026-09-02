"use server";

import { dbError } from "@/lib/modules/guards";
import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type {
  PlanTratamiento,
  PlanTratamientoItem,
  EstadoItem,
  PrioridadItem,
} from "@/types/plan-tratamiento";

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

  if (error) return dbError("plan-tratamiento", error);
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
  const { supabase, user, idClinica } = await requireContext();

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

  if (error) return dbError("plan-tratamiento", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_plan_tratamiento",
    tipoEvento: "create",
    tablaAfectada: "fce_plan_tratamiento",
    registroId: data.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: { ...data, items: [] } as PlanTratamiento };
}

// ── addItemPlan ───────────────────────────────────────────────────────────────

export async function addItemPlan(
  planId: string,
  patientId: string,
  input: {
    id_prestacion?: string;
    /** Solo para ítems libres sin prestación del catálogo. */
    procedimiento?: string;
    descripcion?: string;
    pieza?: number | null;
    superficie?: string | null;
    prioridad?: PrioridadItem;
    notas?: string;
  },
): Promise<ActionResult<PlanTratamientoItem>> {
  const { supabase, user, idClinica } = await requireContext();

  // Verificar que el plan pertenece a esta clínica
  const { data: plan } = await supabase
    .from("fce_plan_tratamiento")
    .select("id, cerrado, id_paciente")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (!plan) return { success: false, error: "Plan no encontrado." };
  if (plan.cerrado) return { success: false, error: "El plan está cerrado." };

  // Sprint PRE-1 §8: el ítem referencia una prestación del catálogo dental.
  // El precio NO vive en el plan: se resuelve en el presupuesto M11 al generarlo.
  let etiqueta = input.procedimiento?.trim() ?? "";
  if (input.id_prestacion) {
    const { data: prestacion } = await supabase
      .from("prestaciones_catalogo")
      .select("id, nombre, requiere_pieza, activo")
      .eq("id", input.id_prestacion)
      .eq("id_clinica", idClinica)
      .single();

    if (!prestacion || !prestacion.activo) {
      return { success: false, error: "La prestación no está disponible en el catálogo de la clínica." };
    }
    if (prestacion.requiere_pieza && (input.pieza == null || input.pieza < 11 || input.pieza > 48)) {
      return { success: false, error: "La prestación requiere pieza dentaria (FDI 11–48)." };
    }
    etiqueta = prestacion.nombre;
  }

  if (!etiqueta) {
    return { success: false, error: "Selecciona una prestación del catálogo o indica un procedimiento." };
  }

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
      id_prestacion: input.id_prestacion ?? null,
      procedimiento: etiqueta,
      descripcion: input.descripcion?.trim() || null,
      pieza: input.pieza ?? null,
      superficie: input.superficie?.trim() || null,
      orden: count ?? 0,
      prioridad: input.prioridad ?? "normal",
      estado: "pendiente",
      notas: input.notas?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return dbError("plan-tratamiento", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "agregar_item_plan",
    tipoEvento: "create",
    tablaAfectada: "fce_plan_tratamiento_items",
    registroId: item.id,
    idClinica: idClinica,
    idPaciente: patientId,
  });

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
  const { supabase, user, idClinica } = await requireContext();

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

  if (error) return dbError("plan-tratamiento", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: `item_plan_${nuevoEstado}`,
    tipoEvento: "update",
    tablaAfectada: "fce_plan_tratamiento_items",
    registroId: itemId,
    idClinica: idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── removeItemPlan ────────────────────────────────────────────────────────────

export async function removeItemPlan(
  itemId: string,
  planId: string,
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, idClinica } = await requireContext();

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

  if (error) return dbError("plan-tratamiento", error);

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── cerrarPlan ────────────────────────────────────────────────────────────────

export async function cerrarPlan(
  planId: string,
  patientId: string,
): Promise<ActionResult<undefined>> {
  const { supabase, user, idClinica } = await requireContext();

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

  if (error) return dbError("plan-tratamiento", error);

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "cerrar_plan_tratamiento",
    tipoEvento: "update",
    tablaAfectada: "fce_plan_tratamiento",
    registroId: planId,
    idClinica: idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: undefined };
}

// ── getPresupuestoDePlan / generarPresupuestoDesdePlan (sprint PRE-1 F8) ─────

import { crearPresupuesto } from "@/app/actions/presupuestos";
import type { Presupuesto } from "@/types/presupuesto";

const COLS_ITEM_PLAN = "id, id_prestacion, pieza, superficie, estado";

/** Último presupuesto M11 generado desde este plan (null si no existe). */
export async function getPresupuestoDePlan(
  planId: string,
): Promise<ActionResult<Presupuesto | null>> {
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_presupuestos")
    .select("id, total_clp, firmado, estado, created_at")
    .eq("id_plan_tratamiento", planId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return dbError("plan-tratamiento", error);
  if (!data) return { success: true, data: null };

  const { data: items, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .select("id_prestacion, pieza, total_linea_clp")
    .eq("id_presupuesto", data.id);

  if (itemsError) return dbError("plan-tratamiento", itemsError);

  return {
    success: true,
    data: { ...data, items: items ?? [] } as unknown as Presupuesto,
  };
}

/**
 * Genera (o regenera si no está firmado) el presupuesto M11 desde los ítems
 * seleccionados del plan. Los precios los resuelve el server desde el catálogo
 * (calcular/resolverPrecio): el plan nunca envía precios. Si ya existe un
 * presupuesto firmado, se rechaza (corrección = adenda).
 */
export async function generarPresupuestoDesdePlan(
  planId: string,
  patientId: string,
  itemIds: string[],
): Promise<ActionResult<Presupuesto>> {
  const { supabase, idClinica } = await requireContext();

  const { data: plan } = await supabase
    .from("fce_plan_tratamiento")
    .select("id, cerrado, titulo")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (!plan) return { success: false, error: "Plan no encontrado." };

  if (itemIds.length === 0) {
    return { success: false, error: "Selecciona al menos un procedimiento del plan." };
  }

  const { data: items } = await supabase
    .from("fce_plan_tratamiento_items")
    .select(COLS_ITEM_PLAN)
    .eq("id_plan", planId)
    .eq("id_clinica", idClinica)
    .in("id", itemIds);

  const seleccionados = items ?? [];
  const sinPrestacion = seleccionados.filter((i) => !i.id_prestacion).length;
  if (seleccionados.length === 0) {
    return { success: false, error: "Los ítems seleccionados no existen en el plan." };
  }
  if (sinPrestacion === seleccionados.length) {
    return {
      success: false,
      error: "Los ítems seleccionados no tienen prestación del catálogo asociada. Edítalos para asociarlas.",
    };
  }

  const formData = {
    titulo: `Plan de tratamiento — ${plan.titulo}`,
    id_plan_tratamiento: planId,
    items: seleccionados
      .filter((i) => i.id_prestacion)
      .map((i) => ({
        id_prestacion: i.id_prestacion as string,
        cantidad: 1,
        pieza: i.pieza ?? null,
        superficie: i.superficie ?? null,
      })),
  };

  return crearPresupuesto(patientId, formData);
}

// ── Helpers internos ──────────────────────────────────────────────────────────

// Sprint PRE-1 §7/§8: presupuesto_total/monto_pagado del plan pasan a ser
// derivados de M11 en código — se eliminó recalcularPresupuesto().
