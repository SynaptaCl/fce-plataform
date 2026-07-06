"use server";

import { dbError } from "@/lib/modules/guards";
import type { ActionResult } from "@/lib/modules/guards";
import { requireConfigAdmin } from "./_shared-server";
import { logAudit } from "@/lib/audit";

// ── asignarProfesionalServicio ────────────────────────────────────────────────

/**
 * Asigna un profesional a un servicio de la clínica.
 * Si ya existe la relación, la reactiva (activo=true).
 * Si no existe, inserta una nueva fila.
 */
export async function asignarProfesionalServicio(
  idProfesional: string,
  idServicio: string
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireConfigAdmin();

  // Verificar que el profesional pertenece a la clínica
  const { data: prof, error: errorProf } = await supabase
    .from("profesionales")
    .select("id")
    .eq("id", idProfesional)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorProf) return dbError("servicios", errorProf);
  if (!prof) {
    return {
      success: false,
      error: "Profesional no encontrado en esta clínica.",
    };
  }

  // Verificar que el servicio pertenece a la clínica
  const { data: servicio, error: errorServ } = await supabase
    .from("servicios")
    .select("id")
    .eq("id", idServicio)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorServ) return dbError("servicios", errorServ);
  if (!servicio) {
    return {
      success: false,
      error: "Servicio no encontrado en esta clínica.",
    };
  }

  // Check-first para evitar depender de UNIQUE constraint en la tabla
  const { data: existente, error: errorCheck } = await supabase
    .from("profesional_servicios")
    .select("id_profesional, id_servicio")
    .eq("id_profesional", idProfesional)
    .eq("id_servicio", idServicio)
    .maybeSingle();

  if (errorCheck) return dbError("servicios", errorCheck);

  if (existente) {
    // Ya existe — reactivar
    const { error: errorUpdate } = await supabase
      .from("profesional_servicios")
      .update({ activo: true })
      .eq("id_profesional", idProfesional)
      .eq("id_servicio", idServicio);

    if (errorUpdate) return dbError("servicios", errorUpdate);
  } else {
    // No existe — insertar
    const { error: errorInsert } = await supabase
      .from("profesional_servicios")
      .insert({ id_profesional: idProfesional, id_servicio: idServicio, activo: true });

    if (errorInsert) return dbError("servicios", errorInsert);
  }

  await logAudit({
    supabase,
    actorId: user.id,
    actorTipo: "admin",
    accion: "asignar_profesional_servicio",
    tipoEvento: "config_update",
    tablaAfectada: "profesional_servicios",
    registroId: idProfesional,
    idClinica,
  });

  return { success: true, data: undefined };
}

// ── desasignarProfesionalServicio ─────────────────────────────────────────────

/**
 * Desasigna (desactiva) la relación profesional-servicio.
 * Soft delete: activo=false, no elimina la fila.
 */
export async function desasignarProfesionalServicio(
  idProfesional: string,
  idServicio: string
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireConfigAdmin();

  // Verificar que el profesional pertenece a la clínica
  const { data: prof, error: errorProf } = await supabase
    .from("profesionales")
    .select("id")
    .eq("id", idProfesional)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorProf) return dbError("servicios", errorProf);
  if (!prof) {
    return {
      success: false,
      error: "Profesional no encontrado en esta clínica.",
    };
  }

  // Fix 2 — verify service belongs to this clinica (same check as asignar)
  const { data: serv, error: errorServ } = await supabase
    .from("servicios")
    .select("id")
    .eq("id", idServicio)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorServ) return dbError("servicios", errorServ);
  if (!serv) {
    return { success: false, error: "Servicio no encontrado en tu clínica." };
  }

  // Soft-delete: marcar como inactivo
  const { error: errorUpdate } = await supabase
    .from("profesional_servicios")
    .update({ activo: false })
    .eq("id_profesional", idProfesional)
    .eq("id_servicio", idServicio);

  if (errorUpdate) return dbError("servicios", errorUpdate);

  await logAudit({
    supabase,
    actorId: user.id,
    actorTipo: "admin",
    accion: "desasignar_profesional_servicio",
    tipoEvento: "config_update",
    tablaAfectada: "profesional_servicios",
    registroId: idProfesional,
    idClinica,
  });

  return { success: true, data: undefined };
}
