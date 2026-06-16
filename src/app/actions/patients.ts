"use server";

import { revalidatePath } from "next/cache";
import { patientSchema, type PatientSchemaType } from "@/lib/validations";
import { formatRut, cleanRut } from "@/lib/run-validator";
import type { Patient, PacienteClinico, CitaAgenda } from "@/types";
import { requireAuth, requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// ── Tipos de respuesta ─────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Helper: id_clinica del usuario autenticado ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getIdClinica(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", userId)
    .single();
  return (data?.id_clinica as string) ?? null;
}

// ── Helper: profesional id ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProfesionalId(supabase: any, authId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profesionales")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// ── getPatients ────────────────────────────────────────────────────────────

export async function getPatients(): Promise<ActionResult<PacienteClinico[]>> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("vista_pacientes_clinicos")
    .select("*")
    .eq("id_clinica", idClinica)
    .order("ultima_atencion", { ascending: false, nullsFirst: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PacienteClinico[] };
}

// ── getAgendaDiaria ────────────────────────────────────────────────────────

export async function getAgendaDiaria(): Promise<ActionResult<CitaAgenda[]>> {
  const { supabase, user } = await requireAuth();

  // Resolver id_clinica y profesional en paralelo (son independientes)
  const [idClinica, { data: prof }] = await Promise.all([
    getIdClinica(supabase, user.id),
    supabase
      .from("profesionales")
      .select("id, especialidad")
      .eq("auth_id", user.id)
      .maybeSingle(),
  ]);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // Fecha en zona horaria de Santiago (UTC-3/UTC-4) para evitar el desfase de medianoche
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }); // "YYYY-MM-DD"

  const baseQuery = supabase
    .from("vista_agenda_diaria")
    .select(
      "id_cita, estado, fecha, hora_inicio, hora_fin, id_paciente, " +
      "paciente_nombre, paciente_apellido, paciente_rut, " +
      "id_profesional, profesional_nombre, profesional_especialidad, " +
      "color_agenda, notas_cita, id_encuentro, encuentro_status, id_clinica"
    )
    .eq("id_clinica", idClinica)
    .eq("fecha", hoy)
    .in("estado", ["confirmada", "completada"])
    .order("hora_inicio");

  // Profesional clínico → solo su agenda; admin sin match → toda la clínica
  const { data, error } = await (prof ? baseQuery.eq("id_profesional", prof.id) : baseQuery);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as unknown as CitaAgenda[] };
}

// ── getPatientById ─────────────────────────────────────────────────────────

export async function getPatientById(
  id: string
): Promise<ActionResult<Patient>> {
  const { supabase, user } = await requireAuth();

  // Defense-in-depth: RLS cubre pacientes via 20260606_02, pero filtramos
  // explícitamente para bloquear cross-tenant antes de llegar a la DB.
  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .eq("id_clinica", idClinica)
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "ver_paciente",
    tipoEvento: "read_ficha",
    tablaAfectada: "pacientes",
    registroId: id,
    idClinica: idClinica,
  });

  return { success: true, data: data as Patient };
}

// ── Helper: normaliza RUT a 3 formatos para búsqueda multi-formato ────────

function rutVariants(rut: string): string[] {
  const clean = cleanRut(rut);                              // "274680938"
  const formatted = formatRut(rut);                         // "27.468.093-8"
  const sinPuntos = `${clean.slice(0, -1)}-${clean.slice(-1)}`; // "27468093-8"
  return [...new Set([formatted, sinPuntos, clean])];
}

// ── Helper: mensaje amigable para violaciones UNIQUE ──────────────────────

function mensajeDuplicado(error: { message?: string; details?: string | null }): string {
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (haystack.includes("rut"))   return "Ya existe una ficha con este RUN.";
  if (haystack.includes("email")) return "Ya existe una ficha con este correo electrónico.";
  // Caso cross-tenant o constraint desconocido — exponer el detalle para diagnóstico
  return `Dato duplicado: ${error.message ?? "constraint violation"}`;
}

// ── createPatient ──────────────────────────────────────────────────────────

export async function createPatient(
  formData: PatientSchemaType
): Promise<ActionResult<{ id: string }>> {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  // Pre-check: buscar RUT en cualquier formato dentro de la clínica antes del INSERT.
  // Cubre: "27.468.093-8", "27468093-8", "274680938" (con o sin puntos/guión).
  if (parsed.data.rut) {
    const variants = rutVariants(parsed.data.rut);
    const { data: dup } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id_clinica", idClinica)
      .or(variants.map((v) => `rut.eq.${v}`).join(","))
      .limit(1)
      .maybeSingle();
    if (dup) return { success: false, error: "Ya existe una ficha con este RUN en esta clínica." };
  }

  // Normalizar RUT al formato canónico XX.XXX.XXX-K antes de persistir
  const payload = { ...parsed.data, rut: formatRut(parsed.data.rut), id_clinica: idClinica };

  const { data, error } = await supabase
    .from("pacientes")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: mensajeDuplicado(error) };
    }
    return { success: false, error: error.message };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_paciente",
    tipoEvento: "create",
    tablaAfectada: "pacientes",
    registroId: data.id,
    idClinica: idClinica,
    idPaciente: data.id,
  });

  revalidatePath("/dashboard/pacientes");
  return { success: true, data: { id: data.id } };
}

// ── updatePatient ──────────────────────────────────────────────────────────

export async function updatePatient(
  id: string,
  formData: PatientSchemaType
): Promise<ActionResult<void>> {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica } = await requireContext();
  if (!idClinica) return { success: false, error: "No se encontró la clínica asociada al usuario." };

  const payload = {
    ...parsed.data,
    rut: formatRut(parsed.data.rut),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("pacientes")
    .update(payload)
    .eq("id", id)
    .eq("id_clinica", idClinica);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: mensajeDuplicado(error) };
    }
    return { success: false, error: error.message };
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "actualizar_paciente",
    tipoEvento: "update",
    tablaAfectada: "pacientes",
    registroId: id,
    idClinica: idClinica,
    idPaciente: id,
  });

  revalidatePath("/dashboard/pacientes");
  revalidatePath(`/dashboard/pacientes/${id}`);
  return { success: true, data: undefined };
}
