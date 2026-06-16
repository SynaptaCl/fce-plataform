"use server";

import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getIdClinica } from "@/app/actions/patients";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled, assertPuedeFirmar } from "@/lib/modules/guards";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { ActionResult } from "@/lib/modules/guards";
import type { Rol } from "@/lib/modules/registry";
import { log } from "@/lib/logger";
import type {
  PlanIntervencion,
  PlanObjetivo,
  PlanProgreso,
  PlanIntervencionDetalle,
  NivelGAS,
  PrioridadObjetivo,
} from "@/types/plan-intervencion";

// ── getPlanesIntervencion ──────────────────────────────────────────────────

/**
 * Retorna todos los planes de intervención de un paciente para la clínica del usuario.
 * Solo requiere auth + idClinica (no assertModuleEnabled — lectura).
 */
export async function getPlanesIntervencion(
  patientId: string
): Promise<ActionResult<PlanIntervencion[]>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica." };

  const { data, error } = await supabase
    .from("fce_planes_intervencion")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PlanIntervencion[] };
}

// ── getPlanIntervencionDetalle ─────────────────────────────────────────────

/**
 * Retorna el detalle completo de un plan (con objetivos y su último progreso).
 * Solo requiere auth + idClinica (no assertModuleEnabled — lectura).
 */
export async function getPlanIntervencionDetalle(
  planId: string
): Promise<ActionResult<PlanIntervencionDetalle>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se pudo determinar la clínica." };

  // 1. Fetch plan con guard RLS por id_clinica
  const { data: plan, error: planError } = await supabase
    .from("fce_planes_intervencion")
    .select("*")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (planError || !plan) {
    return { success: false, error: "Plan de intervención no encontrado." };
  }

  // 2. Fetch objetivos del plan
  const { data: objetivos, error: objError } = await supabase
    .from("fce_plan_objetivos")
    .select("*")
    .eq("id_plan", planId)
    .eq("id_clinica", idClinica)
    .order("orden", { ascending: true });

  if (objError) return { success: false, error: objError.message };

  const objetivosList = (objetivos ?? []) as PlanObjetivo[];

  // 3. Historial completo de progreso de todos los objetivos en una sola query
  const progresoPorObjetivo: Record<string, PlanProgreso[]> = {};
  if (objetivosList.length > 0) {
    const { data: progresos, error: progError } = await supabase
      .from("fce_plan_progreso")
      .select("*")
      .in("id_objetivo", objetivosList.map((o) => o.id))
      .eq("id_clinica", idClinica)
      .order("registrado_at", { ascending: true });

    if (progError) return { success: false, error: progError.message };

    for (const p of (progresos ?? []) as PlanProgreso[]) {
      (progresoPorObjetivo[p.id_objetivo] ??= []).push(p);
    }
  }

  const objetivosConProgreso = objetivosList.map((obj) => {
    const historial = progresoPorObjetivo[obj.id];
    const ultimo = historial?.[historial.length - 1];
    return { ...obj, ...(ultimo ? { ultimo_progreso: ultimo } : {}) };
  });

  const detalle: PlanIntervencionDetalle = {
    ...(plan as PlanIntervencion),
    objetivos: objetivosConProgreso,
    progresoPorObjetivo,
  };

  return { success: true, data: detalle };
}

// ── crearPlanIntervencion ──────────────────────────────────────────────────

export async function crearPlanIntervencion(params: {
  patientId: string;
  idEncuentroOrigen?: string;
  condicionCodigo?: string;
  titulo: string;
}): Promise<ActionResult<{ planId: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  const fechaInicio = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Santiago",
  });

  const { data: plan, error: insertError } = await supabase
    .from("fce_planes_intervencion")
    .insert({
      id_clinica: idClinica,
      id_paciente: params.patientId,
      id_encuentro_origen: params.idEncuentroOrigen ?? null,
      condicion_codigo: params.condicionCodigo ?? null,
      titulo: params.titulo,
      fecha_inicio: fechaInicio,
      estado: "borrador",
      firmado: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !plan) {
    log("error", { action: "crear_plan_intervencion", id_clinica: idClinica, id_paciente: params.patientId, error: insertError });
    return { success: false, error: "No se pudo crear el plan de intervención." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_plan_intervencion",
    tipoEvento: "create",
    tablaAfectada: "fce_planes_intervencion",
    registroId: plan.id,
    idClinica: idClinica!,
    idPaciente: params.patientId,
  });

  return { success: true, data: { planId: plan.id } };
}

// ── actualizarPlanIntervencion ─────────────────────────────────────────────

export async function actualizarPlanIntervencion(
  planId: string,
  campos: Partial<
    Pick<
      PlanIntervencion,
      "titulo" | "diagnostico" | "icd_codigos" | "fecha_revision" | "estado" | "condicion_codigo"
    >
  >
): Promise<ActionResult> {
  const { supabase, user, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  // Verificar que el plan pertenece a la clínica y no está cerrado
  const { data: plan, error: fetchError } = await supabase
    .from("fce_planes_intervencion")
    .select("id, id_paciente, estado")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !plan) {
    return { success: false, error: "Plan de intervención no encontrado." };
  }
  if (plan.estado === "cerrado") {
    return { success: false, error: "No se puede modificar un plan cerrado." };
  }

  const { error: updateError } = await supabase
    .from("fce_planes_intervencion")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", planId);

  if (updateError) return { success: false, error: updateError.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "actualizar_plan_intervencion",
    tipoEvento: "update",
    tablaAfectada: "fce_planes_intervencion",
    registroId: planId,
    idClinica: idClinica!,
    idPaciente: plan.id_paciente,
  });

  return { success: true, data: undefined };
}

// ── upsertObjetivo ─────────────────────────────────────────────────────────

export async function upsertObjetivo(
  planId: string,
  objetivo: {
    id?: string;
    dominio_codigo: string;
    dominio_label: string;
    descripcion: string;
    criterio_logro?: string;
    gas_menos_2?: string;
    gas_menos_1?: string;
    gas_0?: string;
    gas_mas_1?: string;
    gas_mas_2?: string;
    nivel_basal?: NivelGAS;
    prioridad?: PrioridadObjetivo;
    responsable_principal?: string;
    orden?: number;
  }
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  // Verificar que el plan existe, pertenece a la clínica y no está cerrado
  const { data: plan, error: planError } = await supabase
    .from("fce_planes_intervencion")
    .select("id, id_paciente, estado")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (planError || !plan) {
    return { success: false, error: "Plan de intervención no encontrado." };
  }
  if (plan.estado === "cerrado") {
    return { success: false, error: "No se puede modificar un plan cerrado." };
  }

  if (objetivo.id) {
    // UPDATE
    const { data: updated, error: updateError } = await supabase
      .from("fce_plan_objetivos")
      .update({
        dominio_codigo: objetivo.dominio_codigo,
        dominio_label: objetivo.dominio_label,
        descripcion: objetivo.descripcion,
        criterio_logro: objetivo.criterio_logro ?? null,
        gas_menos_2: objetivo.gas_menos_2 ?? null,
        gas_menos_1: objetivo.gas_menos_1 ?? null,
        gas_0: objetivo.gas_0 ?? null,
        gas_mas_1: objetivo.gas_mas_1 ?? null,
        gas_mas_2: objetivo.gas_mas_2 ?? null,
        nivel_basal: objetivo.nivel_basal ?? -1,
        prioridad: objetivo.prioridad ?? "media",
        responsable_principal: objetivo.responsable_principal ?? null,
        ...(objetivo.orden !== undefined ? { orden: objetivo.orden } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", objetivo.id)
      .eq("id_clinica", idClinica)
      .select("id")
      .single();

    if (updateError || !updated) {
      return { success: false, error: "No se pudo actualizar el objetivo." };
    }

    await logAudit({
      supabase,
      actorId: user.id,
      accion: "upsert_objetivo",
      tipoEvento: "update",
      tablaAfectada: "fce_plan_objetivos",
      registroId: updated.id,
      idClinica: idClinica!,
      idPaciente: plan.id_paciente,
    });

    return { success: true, data: { id: updated.id } };
  } else {
    // INSERT — calcular orden si no se especifica
    let orden = objetivo.orden;
    if (orden === undefined) {
      const { data: maxRow } = await supabase
        .from("fce_plan_objetivos")
        .select("orden")
        .eq("id_plan", planId)
        .order("orden", { ascending: false })
        .limit(1)
        .maybeSingle();

      orden = maxRow ? (maxRow.orden as number) + 1 : 0;
    }

    const nivelBasal: NivelGAS = objetivo.nivel_basal ?? -1;

    const { data: inserted, error: insertError } = await supabase
      .from("fce_plan_objetivos")
      .insert({
        id_clinica: idClinica,
        id_paciente: plan.id_paciente,
        id_plan: planId,
        dominio_codigo: objetivo.dominio_codigo,
        dominio_label: objetivo.dominio_label,
        descripcion: objetivo.descripcion,
        criterio_logro: objetivo.criterio_logro ?? null,
        gas_menos_2: objetivo.gas_menos_2 ?? null,
        gas_menos_1: objetivo.gas_menos_1 ?? null,
        gas_0: objetivo.gas_0 ?? null,
        gas_mas_1: objetivo.gas_mas_1 ?? null,
        gas_mas_2: objetivo.gas_mas_2 ?? null,
        nivel_basal: nivelBasal,
        nivel_actual: nivelBasal,
        prioridad: objetivo.prioridad ?? "media",
        estado: "activo",
        responsable_principal: objetivo.responsable_principal ?? null,
        orden,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      log("error", { action: "crear_objetivo_plan", id_clinica: idClinica, error: insertError });
      return { success: false, error: "No se pudo crear el objetivo." };
    }

    await logAudit({
      supabase,
      actorId: user.id,
      accion: "upsert_objetivo",
      tipoEvento: "update",
      tablaAfectada: "fce_plan_objetivos",
      registroId: inserted.id,
      idClinica: idClinica!,
      idPaciente: plan.id_paciente,
    });

    return { success: true, data: { id: inserted.id } };
  }
}

// ── eliminarObjetivo ───────────────────────────────────────────────────────

export async function eliminarObjetivo(objetivoId: string): Promise<ActionResult> {
  const { supabase, user, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  // Fetch objetivo para verificar id_clinica y estado del plan
  const { data: obj, error: fetchError } = await supabase
    .from("fce_plan_objetivos")
    .select("id, id_paciente, id_plan, id_clinica")
    .eq("id", objetivoId)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !obj) {
    return { success: false, error: "Objetivo no encontrado." };
  }

  // Verificar que el plan no esté cerrado
  const { data: plan, error: planError } = await supabase
    .from("fce_planes_intervencion")
    .select("estado")
    .eq("id", obj.id_plan)
    .eq("id_clinica", idClinica)
    .single();

  if (planError || !plan) {
    return { success: false, error: "Plan de intervención no encontrado." };
  }
  if (plan.estado === "cerrado") {
    return { success: false, error: "No se puede modificar un plan cerrado." };
  }

  const { error: deleteError } = await supabase
    .from("fce_plan_objetivos")
    .delete()
    .eq("id", objetivoId);

  if (deleteError) return { success: false, error: deleteError.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_objetivo",
    tipoEvento: "delete",
    tablaAfectada: "fce_plan_objetivos",
    registroId: objetivoId,
    idClinica: idClinica!,
    idPaciente: obj.id_paciente,
  });

  return { success: true, data: undefined };
}

// ── registrarProgreso ──────────────────────────────────────────────────────

export async function registrarProgreso(params: {
  objetivoId: string;
  idEncuentro?: string;
  nivelGas: NivelGAS;
  observacion?: string;
  estrategias?: string;
}): Promise<ActionResult<{ id: string }>> {
  const { supabase, user, idClinica } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  // Fetch objetivo para obtener id_clinica e id_paciente
  const { data: obj, error: objError } = await supabase
    .from("fce_plan_objetivos")
    .select("id, id_clinica, id_paciente")
    .eq("id", params.objetivoId)
    .eq("id_clinica", idClinica)
    .single();

  if (objError || !obj) {
    return { success: false, error: "Objetivo no encontrado." };
  }

  // INSERT en fce_plan_progreso
  const { data: progreso, error: insertError } = await supabase
    .from("fce_plan_progreso")
    .insert({
      id_clinica: obj.id_clinica,
      id_paciente: obj.id_paciente,
      id_objetivo: params.objetivoId,
      id_encuentro: params.idEncuentro ?? null,
      nivel_gas: params.nivelGas,
      observacion: params.observacion ?? null,
      estrategias: params.estrategias ?? null,
      registrado_por: user.id,
      registrado_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !progreso) {
    log("error", { action: "registrar_progreso_plan", id_clinica: idClinica, error: insertError });
    return { success: false, error: "No se pudo registrar el progreso." };
  }

  // UPDATE nivel_actual en el objetivo
  const { error: updateObjError } = await supabase
    .from("fce_plan_objetivos")
    .update({ nivel_actual: params.nivelGas, updated_at: new Date().toISOString() })
    .eq("id", params.objetivoId)
    .eq("id_clinica", idClinica);
  if (updateObjError) {
    return { success: false, error: "Progreso insertado pero no se pudo actualizar nivel_actual: " + updateObjError.message };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "registrar_progreso",
    tipoEvento: "create",
    tablaAfectada: "fce_plan_progreso",
    registroId: progreso.id,
    idClinica: obj.id_clinica!,
    idPaciente: obj.id_paciente,
  });

  return { success: true, data: { id: progreso.id } };
}

// ── firmarPlanIntervencion ─────────────────────────────────────────────────

export async function firmarPlanIntervencion(planId: string): Promise<ActionResult> {
  const { supabase, user, idClinica, rol: rolCtx } = await requireContext();

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M10_plan_intervencion");
  if (!moduleGuard.success) return moduleGuard;

  const rol = rolCtx as Rol;

  const firmaGuard = assertPuedeFirmar(rol);
  if (!firmaGuard.success) return firmaGuard;

  // Fetch plan con guard RLS
  const { data: plan, error: planError } = await supabase
    .from("fce_planes_intervencion")
    .select("id, id_paciente, estado")
    .eq("id", planId)
    .eq("id_clinica", idClinica)
    .single();

  if (planError || !plan) {
    return { success: false, error: "Plan de intervención no encontrado." };
  }

  // Fetch profesional activo para nombre y especialidad
  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado." };
  }

  // Fetch todos los objetivos del plan para el snapshot
  const { data: objetivos } = await supabase
    .from("fce_plan_objetivos")
    .select("id, responsable_principal")
    .eq("id_plan", planId)
    .eq("id_clinica", idClinica);

  const snapshotEquipo = {
    firmado_por_nombre: profesional.nombre,
    firmado_por_especialidad: profesional.especialidad,
    objetivos_count: (objetivos ?? []).length,
    firmado_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("fce_planes_intervencion")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: user.id,
      snapshot_equipo: snapshotEquipo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (updateError) return { success: false, error: updateError.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_plan_intervencion",
    tipoEvento: "sign",
    tablaAfectada: "fce_planes_intervencion",
    registroId: planId,
    idClinica: idClinica!,
    idPaciente: plan.id_paciente,
  });

  return { success: true, data: undefined };
}
