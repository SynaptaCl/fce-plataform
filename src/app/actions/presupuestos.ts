"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled } from "@/lib/modules/guards";
import type { ActionResult } from "@/lib/modules/guards";
import { log } from "@/lib/logger";
import type { Presupuesto, PresupuestoItem, PresupuestoFormData } from "@/types/presupuesto";

// ── Helper: sesión activa ──────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

// ── Helper: audit log ──────────────────────────────────────────────────────

async function logAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  accion: string,
  tablaAfectada: string,
  registroId: string,
  idClinica?: string | null,
  idPaciente?: string | null
) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } catch {
    // El audit log no debe romper el flujo principal
  }
}

// ── getPresupuestos ────────────────────────────────────────────────────────

export async function getPresupuestos(
  idPaciente: string
): Promise<ActionResult<Presupuesto[]>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data: presupuestos, error } = await supabase
    .from("fce_presupuestos")
    .select("*, profesional:profesionales(nombre, especialidad)")
    .eq("id_paciente", idPaciente)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", { action: "get_presupuestos", id_clinica: idClinica, id_paciente: idPaciente, error });
    return { success: false, error: error.message };
  }

  const list = presupuestos ?? [];

  // Fetch items for all presupuestos
  if (list.length === 0) return { success: true, data: [] };

  const ids = list.map((p: { id: string }) => p.id);
  const { data: allItems, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .select("*")
    .in("id_presupuesto", ids)
    .order("orden", { ascending: true });

  if (itemsError) {
    log("error", { action: "get_presupuestos_items", id_clinica: idClinica, id_paciente: idPaciente, error: itemsError });
    return { success: false, error: itemsError.message };
  }

  const items: PresupuestoItem[] = allItems ?? [];
  const result: Presupuesto[] = list.map((p: Presupuesto) => ({
    ...p,
    items: items.filter((i) => i.id_presupuesto === p.id),
  }));

  return { success: true, data: result };
}

// ── getPresupuesto ─────────────────────────────────────────────────────────

export async function getPresupuesto(
  id: string
): Promise<ActionResult<Presupuesto>> {
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
    .from("fce_presupuestos")
    .select("*, profesional:profesionales(nombre, especialidad)")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (error || !data) {
    return { success: false, error: "Presupuesto no encontrado." };
  }

  const { data: items, error: itemsError } = await supabase
    .from("fce_presupuesto_items")
    .select("*")
    .eq("id_presupuesto", id)
    .order("orden", { ascending: true });

  if (itemsError) {
    log("error", { action: "get_presupuesto_items", id_clinica: idClinica, error: itemsError });
    return { success: false, error: itemsError.message };
  }

  return {
    success: true,
    data: { ...data, items: items ?? [] } as Presupuesto,
  };
}

// ── crearPresupuesto ───────────────────────────────────────────────────────

export async function crearPresupuesto(
  idPaciente: string,
  data: PresupuestoFormData,
  idEncuentro?: string
): Promise<ActionResult<Presupuesto>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M11_presupuestos");
  if (!moduleGuard.success) return moduleGuard;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado." };
  }

  const { data: presupuesto, error: insertError } = await supabase
    .from("fce_presupuestos")
    .insert({
      id_clinica: idClinica,
      id_paciente: idPaciente,
      id_encuentro: idEncuentro ?? null,
      id_profesional: profesional.id,
      titulo: data.titulo,
      estado: "borrador",
      notas: data.notas ?? null,
    })
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (insertError || !presupuesto) {
    log("error", { action: "crear_presupuesto", id_clinica: idClinica, id_paciente: idPaciente, error: insertError });
    return { success: false, error: "No se pudo crear el presupuesto." };
  }

  // Insert items
  let items: PresupuestoItem[] = [];
  if (data.items.length > 0) {
    const { data: insertedItems, error: itemsError } = await supabase
      .from("fce_presupuesto_items")
      .insert(
        data.items.map((item) => ({
          id_presupuesto: presupuesto.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          orden: item.orden,
        }))
      )
      .select("*");

    if (itemsError) {
      log("error", { action: "crear_presupuesto_items", id_clinica: idClinica, id_paciente: idPaciente, error: itemsError });
      return { success: false, error: "No se pudieron guardar los ítems del presupuesto." };
    }
    items = insertedItems ?? [];
  }

  await logAudit(
    supabase,
    user.id,
    "presupuesto_creado",
    "fce_presupuestos",
    presupuesto.id,
    idClinica,
    idPaciente
  );

  revalidatePath(`/dashboard/pacientes/${idPaciente}`);

  return {
    success: true,
    data: { ...presupuesto, items } as Presupuesto,
  };
}

// ── actualizarPresupuesto ──────────────────────────────────────────────────

export async function actualizarPresupuesto(
  id: string,
  data: PresupuestoFormData
): Promise<ActionResult<Presupuesto>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // Fetch to check ownership and mutability
  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede modificar un presupuesto firmado." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fce_presupuestos")
    .update({
      titulo: data.titulo,
      notas: data.notas ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (updateError || !updated) {
    log("error", { action: "actualizar_presupuesto", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo actualizar el presupuesto." };
  }

  // Replace items
  await supabase
    .from("fce_presupuesto_items")
    .delete()
    .eq("id_presupuesto", id);

  let items: PresupuestoItem[] = [];
  if (data.items.length > 0) {
    const { data: insertedItems, error: itemsError } = await supabase
      .from("fce_presupuesto_items")
      .insert(
        data.items.map((item) => ({
          id_presupuesto: id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          orden: item.orden,
        }))
      )
      .select("*");

    if (itemsError) {
      log("error", { action: "actualizar_presupuesto_items", id_clinica: idClinica, error: itemsError });
      return { success: false, error: "No se pudieron actualizar los ítems del presupuesto." };
    }
    items = insertedItems ?? [];
  }

  await logAudit(
    supabase,
    user.id,
    "presupuesto_actualizado",
    "fce_presupuestos",
    id,
    idClinica,
    existing.id_paciente
  );

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return {
    success: true,
    data: { ...updated, items } as Presupuesto,
  };
}

// ── firmarPresupuesto ──────────────────────────────────────────────────────

export async function firmarPresupuesto(
  id: string
): Promise<ActionResult<Presupuesto>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const config = await getClinicaConfig(idClinica, supabase);
  const moduleGuard = assertModuleEnabled(config, "M11_presupuestos");
  if (!moduleGuard.success) return moduleGuard;

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "El presupuesto ya fue firmado." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fce_presupuestos")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      estado: "enviado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .select("*, profesional:profesionales(nombre, especialidad)")
    .single();

  if (updateError || !updated) {
    log("error", { action: "firmar_presupuesto", id_clinica: idClinica, error: updateError });
    return { success: false, error: "No se pudo firmar el presupuesto." };
  }

  // Fetch items
  const { data: items } = await supabase
    .from("fce_presupuesto_items")
    .select("*")
    .eq("id_presupuesto", id)
    .order("orden", { ascending: true });

  await logAudit(
    supabase,
    user.id,
    "presupuesto_firmado",
    "fce_presupuestos",
    id,
    idClinica,
    existing.id_paciente
  );

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return {
    success: true,
    data: { ...updated, items: items ?? [] } as Presupuesto,
  };
}

// ── eliminarPresupuesto ────────────────────────────────────────────────────

export async function eliminarPresupuesto(
  id: string
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  const idClinica: string | null = adminRow?.id_clinica ?? null;
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data: existing, error: fetchError } = await supabase
    .from("fce_presupuestos")
    .select("id, id_clinica, id_paciente, firmado")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Presupuesto no encontrado." };
  }
  if (existing.firmado) {
    return { success: false, error: "No se puede eliminar un presupuesto firmado." };
  }

  const { error: deleteError } = await supabase
    .from("fce_presupuestos")
    .delete()
    .eq("id", id)
    .eq("id_clinica", idClinica);

  if (deleteError) {
    log("error", { action: "eliminar_presupuesto", id_clinica: idClinica, error: deleteError });
    return { success: false, error: "No se pudo eliminar el presupuesto." };
  }

  await logAudit(
    supabase,
    user.id,
    "presupuesto_eliminado",
    "fce_presupuestos",
    id,
    idClinica,
    existing.id_paciente
  );

  revalidatePath(`/dashboard/pacientes/${existing.id_paciente}`);

  return { success: true, data: undefined };
}
