"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled } from "@/lib/modules/guards";
import type { ActionResult } from "@/lib/modules/guards";
import { log } from "@/lib/logger";
import type { InformeClinico, InformeFormData } from "@/types/informe";

// ── getInformes ────────────────────────────────────────────────────────────

export async function getInformes(
  idPaciente: string
): Promise<ActionResult<InformeClinico[]>> {
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
    .from("fce_informes")
    .select("*, profesional:profesionales(nombre, especialidad)")
    .eq("id_paciente", idPaciente)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", { action: "get_informes", id_clinica: idClinica, id_paciente: idPaciente, error });
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as InformeClinico[] };
}

// ── getInforme ─────────────────────────────────────────────────────────────

export async function getInforme(
  id: string
): Promise<ActionResult<InformeClinico>> {
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
    .from("fce_informes")
    .select("*, profesional:profesionales(nombre, especialidad)")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (error || !data) {
    return { success: false, error: "Informe no encontrado." };
  }

  return { success: true, data: data as InformeClinico };
}

// ── crearInforme ───────────────────────────────────────────────────────────

export async function crearInforme(
  idPaciente: string,
  data: InformeFormData,
  idEncuentro?: string
): Promise<ActionResult<InformeClinico>> {
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
  } catch {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M12_informes");
  if (!moduleGuard.success) return moduleGuard;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado." };
  }

  const { data: informe, error: insertError } = await supabase
    .from("fce_informes")
    .insert({
      id_clinica: idClinica,
      id_paciente: idPaciente,
      id_encuentro: idEncuentro ?? null,
      id_profesional: profesional.id,
      tipo: data.tipo,
      destinatario: data.destinatario ?? null,
      titulo: data.titulo,
      contenido: data.contenido,
    })
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (insertError || !informe) {
    log("error", { action: "crear_informe", id_clinica: idClinica, id_paciente: idPaciente, error: insertError });
    return { success: false, error: "No se pudo crear el informe." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_informe",
    tipoEvento: "create",
    tablaAfectada: "fce_informes",
    registroId: informe.id,
    idClinica: idClinica!,
    idPaciente: idPaciente,
  });

  revalidatePath(`/dashboard/pacientes/${idPaciente}`);

  return { success: true, data: informe as InformeClinico };
}

// ── actualizarInforme ──────────────────────────────────────────────────────

export async function actualizarInforme(
  id: string,
  data: InformeFormData
): Promise<ActionResult<InformeClinico>> {
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
  } catch {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("fce_informes")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Informe no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede modificar un informe firmado." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fce_informes")
    .update({
      tipo: data.tipo,
      destinatario: data.destinatario ?? null,
      titulo: data.titulo,
      contenido: data.contenido,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (updateError || !updated) {
    log("error", { action: "actualizar_informe", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo actualizar el informe." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "actualizar_informe",
    tipoEvento: "update",
    tablaAfectada: "fce_informes",
    registroId: id,
    idClinica: idClinica!,
    idPaciente: existing.id_paciente,
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: updated as InformeClinico };
}

// ── firmarInforme ──────────────────────────────────────────────────────────

export async function firmarInforme(
  id: string
): Promise<ActionResult<InformeClinico>> {
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
  } catch {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M12_informes");
  if (!moduleGuard.success) return moduleGuard;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("fce_informes")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Informe no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "El informe ya fue firmado." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fce_informes")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (updateError || !updated) {
    log("error", { action: "firmar_informe", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo firmar el informe." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "firmar_informe",
    tipoEvento: "sign",
    tablaAfectada: "fce_informes",
    registroId: id,
    idClinica: idClinica!,
    idPaciente: existing.id_paciente,
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: updated as InformeClinico };
}

// ── eliminarInforme ────────────────────────────────────────────────────────

export async function eliminarInforme(
  id: string
): Promise<ActionResult> {
  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
  } catch {
    return { success: false, error: "No se encontró la clínica asociada al usuario." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("fce_informes")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Informe no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede eliminar un informe firmado." };
  }

  const { error: deleteError } = await supabase
    .from("fce_informes")
    .delete()
    .eq("id", id)
    .eq("id_clinica", idClinica);

  if (deleteError) {
    log("error", { action: "eliminar_informe", id_clinica: idClinica, error: deleteError });
    return { success: false, error: "No se pudo eliminar el informe." };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "eliminar_informe",
    tipoEvento: "delete",
    tablaAfectada: "fce_informes",
    registroId: id,
    idClinica: idClinica!,
    idPaciente: existing.id_paciente,
  });

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: undefined };
}
