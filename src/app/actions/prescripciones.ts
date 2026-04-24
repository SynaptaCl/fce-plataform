"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getClinicaConfig } from "@/lib/modules/config";
import { assertModuleEnabled, assertPuedeFirmar } from "@/lib/modules/guards";
import { buscarMedicamentos } from "@/lib/medicamentos/catalogo";
import { PrescripcionInputSchema } from "@/lib/prescripciones/validations";
import { buildProfesionalSnapshot } from "@/lib/prescripciones/snapshot";
import type { ActionResult } from "@/lib/modules/guards";
import type { Rol } from "@/lib/modules/registry";
import type { Prescripcion, MedicamentoPrescrito, ModoFirma, TipoPrescripcion } from "@/types/prescripcion";
import type { MedicamentoCatalogo } from "@/types/medicamento";

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

// ── getPrescripcionesByPatient ─────────────────────────────────────────────

export async function getPrescripcionesByPatient(
  patientId: string
): Promise<ActionResult<Prescripcion[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id_paciente", patientId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Prescripcion[] };
}

// ── getPrescripcionById ────────────────────────────────────────────────────

export async function getPrescripcionById(
  prescripcionId: string
): Promise<ActionResult<Prescripcion>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id", prescripcionId)
    .single();

  if (error || !data) {
    return { success: false, error: "Prescripción no encontrada." };
  }
  return { success: true, data: data as Prescripcion };
}

// ── searchMedicamentos ─────────────────────────────────────────────────────

export async function searchMedicamentos(
  query: string
): Promise<ActionResult<MedicamentoCatalogo[]>> {
  const { supabase } = await requireAuth();

  const results = await buscarMedicamentos(supabase, query);
  return { success: true, data: results };
}

// ── createAndSignPrescripcion ──────────────────────────────────────────────

export async function createAndSignPrescripcion(input: {
  patientId: string;
  encuentroId: string | null;
  tipo: TipoPrescripcion;
  medicamentos: MedicamentoPrescrito[] | null;
  indicacionesGenerales: string | null;
  diagnosticoAsociado: string | null;
  modoFirma: ModoFirma;
  firmaCanvas: string | null;
}): Promise<ActionResult<{ prescripcion: Prescripcion; folio: string }>> {
  // I3: Validate input schema first (covers medicamentos + canvas check)
  const parsed = PrescripcionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // C1: Step 1 — requireAuth
  const { supabase, user } = await requireAuth();

  // C1: Step 2 — Fetch admin_users for idClinica + rol (authoritative source)
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();
  if (!adminRow?.id_clinica) return { success: false, error: "No se pudo determinar la clínica" };
  const idClinica = adminRow.id_clinica;
  const rol = adminRow.rol as Rol;

  // C2: Step 3 — assertModuleEnabled using getClinicaConfig (avoids double auth roundtrip)
  const config = await getClinicaConfig(idClinica, supabase);
  if (!config) return { success: false, error: "No se encontró configuración FCE de la clínica." };
  const moduleGuard = assertModuleEnabled(config, "M7_prescripciones");
  if (!moduleGuard.success) return moduleGuard;

  // C3: Step 4 — assertPuedeFirmar role-level gate
  const roleGuard = assertPuedeFirmar(rol);
  if (!roleGuard.success) return roleGuard;

  // Step 5 — getProfesionalActivo with idClinica from admin_users
  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes perfil de profesional asociado" };
  }

  // Step 6 — puede_prescribir check
  if (!profesional.puede_prescribir) {
    return { success: false, error: "Tu perfil profesional no tiene autorización para prescribir" };
  }

  // Step 7 — Encuentro validation (if provided)
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

  // Step 8 — buildProfesionalSnapshot
  const snapshot = buildProfesionalSnapshot(profesional);

  // Step 9 — INSERT using idClinica from admin_users (NOT from profesional.id_clinica)
  const { data: prescripcion, error: insertError } = await supabase
    .from("fce_prescripciones")
    .insert({
      id_clinica: idClinica,
      id_paciente: input.patientId,
      id_encuentro: input.encuentroId,
      tipo: input.tipo,
      medicamentos: input.tipo === "farmacologica" ? input.medicamentos : null,
      indicaciones_generales: input.indicacionesGenerales,
      diagnostico_asociado: input.diagnosticoAsociado,
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

  if (insertError || !prescripcion) {
    console.error("[FCE] Error creando prescripción:", insertError);
    return { success: false, error: "No se pudo crear la prescripción" };
  }

  // Step 10 — Audit log
  await logAudit(
    supabase,
    user.id,
    "emitir_prescripcion",
    "fce_prescripciones",
    prescripcion.id,
    idClinica,
    input.patientId
  );

  // I2: Step 11 — revalidatePath after logAudit
  revalidatePath(`/dashboard/pacientes/${input.patientId}`);

  return {
    success: true,
    data: {
      prescripcion: prescripcion as Prescripcion,
      folio: prescripcion.folio_display,
    },
  };
}

// ── Stubs para R11 audit tracking (will be fully implemented in Task 6) ────────

export async function logPrescripcionDownload(
  _prescripcionId: string
): Promise<ActionResult> {
  return { success: true, data: undefined };
}

export async function logPrescripcionPrint(
  _prescripcionId: string
): Promise<ActionResult> {
  return { success: true, data: undefined };
}

export async function logPrescripcionShare(
  _prescripcionId: string,
  _canal: "email" | "whatsapp" | "otro"
): Promise<ActionResult> {
  return { success: true, data: undefined };
}
