"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled, assertPuedeFirmar } from "@/lib/modules/guards";
import { OrdenExamenInputSchema } from "@/lib/ordenes-examen/validations";
import { buildProfesionalSnapshot } from "@/lib/prescripciones/snapshot";
import type { ActionResult } from "@/lib/modules/guards";
import type { Rol } from "@/lib/modules/registry";
import { log } from "@/lib/logger";
import type { OrdenExamen, ExamenCatalogo, ExamenIndicado } from "@/types/orden-examen";

// ── createAndSignOrdenExamen ───────────────────────────────────────────────

export async function createAndSignOrdenExamen(input: {
  patientId: string;
  encuentroId: string | null;
  examenes: ExamenIndicado[];
  diagnostico_presuntivo: string | null;
  observaciones: string | null;
  prioridad: "normal" | "urgente";
  modoFirma: "impresa" | "canvas";
  firmaCanvas: string | null;
}): Promise<ActionResult<OrdenExamen>> {
  const parsed = OrdenExamenInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let supabase: Awaited<ReturnType<typeof requireContext>>["supabase"];
  let user: Awaited<ReturnType<typeof requireContext>>["user"];
  let idClinica: string;
  let rol: Rol;
  try {
    const ctx = await requireContext();
    supabase = ctx.supabase;
    user = ctx.user;
    idClinica = ctx.idClinica;
    rol = ctx.rol as Rol;
  } catch {
    return { success: false, error: "No se pudo determinar la clínica" };
  }

  const config = await getClinicaConfig(idClinica, supabase);
  if (!config) return { success: false, error: "No se encontró configuración FCE de la clínica." };
  const moduleGuard = assertModuleEnabled(config, "M8_examenes");
  if (!moduleGuard.success) return moduleGuard;

  const roleGuard = assertPuedeFirmar(rol);
  if (!roleGuard.success) return roleGuard;

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado" };
  }

  if (!profesional.puede_indicar_examenes) {
    return { success: false, error: "No tienes permiso para indicar exámenes" };
  }

  if (input.encuentroId) {
    const { data: enc, error: encError } = await supabase
      .from("fce_encuentros")
      .select("id, id_paciente, status")
      .eq("id", input.encuentroId)
      .single();

    if (encError || !enc) {
      return { success: false, error: "Encuentro no encontrado" };
    }
    if (enc.id_paciente !== input.patientId) {
      return { success: false, error: "El encuentro no corresponde al paciente" };
    }
    if (enc.status === "finalizado") {
      return { success: false, error: "El encuentro ya está finalizado" };
    }
  }

  const snapshot = buildProfesionalSnapshot(profesional);

  const { data: orden, error: insertError } = await supabase
    .from("fce_ordenes_examen")
    .insert({
      id_clinica: idClinica,
      id_paciente: input.patientId,
      id_encuentro: input.encuentroId,
      examenes: input.examenes,
      diagnostico_presuntivo: input.diagnostico_presuntivo,
      observaciones: input.observaciones,
      prioridad: input.prioridad,
      modo_firma: input.modoFirma,
      firma_canvas: input.firmaCanvas,
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: profesional.id,
      ...snapshot,
      created_by: profesional.id,
      folio_anio: new Date().getFullYear(),
      folio_numero: 0,
    })
    .select("*")
    .single();

  if (insertError || !orden) {
    log("error", { action: "crear_orden_examen", id_clinica: idClinica, id_paciente: input.patientId, error: insertError });
    return { success: false, error: "No se pudo crear la orden de examen" };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_orden_examen",
    tipoEvento: "sign",
    tablaAfectada: "fce_ordenes_examen",
    registroId: orden.id,
    idClinica: idClinica,
    idPaciente: input.patientId,
  });

  revalidatePath(`/dashboard/pacientes/${input.patientId}`);

  return { success: true, data: orden as OrdenExamen };
}

// ── getOrdenesExamenByPatient ──────────────────────────────────────────────

export async function getOrdenesExamenByPatient(
  patientId: string
): Promise<ActionResult<OrdenExamen[]>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!adminRow?.id_clinica) return { success: false, error: "No se pudo determinar la clínica" };

  const { data, error } = await supabase
    .from("fce_ordenes_examen")
    .select("*")
    .eq("id_paciente", patientId)
    .eq("id_clinica", adminRow.id_clinica)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as OrdenExamen[] };
}

// ── getOrdenExamenById ─────────────────────────────────────────────────────

export async function getOrdenExamenById(
  ordenId: string
): Promise<ActionResult<OrdenExamen>> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!adminRow?.id_clinica) return { success: false, error: "No se pudo determinar la clínica" };

  const { data, error } = await supabase
    .from("fce_ordenes_examen")
    .select("*")
    .eq("id", ordenId)
    .eq("id_clinica", adminRow.id_clinica)
    .single();

  if (error || !data) {
    return { success: false, error: "Orden de examen no encontrada." };
  }
  return { success: true, data: data as OrdenExamen };
}

// ── searchExamenes ─────────────────────────────────────────────────────────

export async function searchExamenes(
  query: string,
  categoria?: string
): Promise<ActionResult<ExamenCatalogo[]>> {
  const { supabase } = await requireAuth();

  let q = supabase
    .from("examenes_catalogo")
    .select("*")
    .eq("activo", true)
    .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
    .limit(20);

  if (categoria) {
    q = q.eq("categoria", categoria);
  }

  const { data, error } = await q;

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ExamenCatalogo[] };
}

// ── logOrdenExamenAction ───────────────────────────────────────────────────

export async function logOrdenExamenAction(
  ordenId: string,
  accion:
    | "ver_orden_examen"
    | "descargar_pdf_orden"
    | "imprimir_orden"
    | "compartir_orden_whatsapp"
    | "compartir_orden_email"
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();

  const { data: orden } = await supabase
    .from("fce_ordenes_examen")
    .select("id_clinica, id_paciente")
    .eq("id", ordenId)
    .maybeSingle();

  if (!orden) return { success: false, error: "Orden no encontrada" };

  await logAudit({
    supabase,
    actorId: user.id,
    accion,
    tipoEvento: "export_pdf",
    tablaAfectada: "fce_ordenes_examen",
    registroId: ordenId,
    idClinica: orden.id_clinica!,
    idPaciente: orden.id_paciente,
  });

  return { success: true, data: undefined };
}
