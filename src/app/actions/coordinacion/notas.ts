"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dbError, type ActionResult } from "@/lib/modules/guards";
import type { NotaAdministrativa } from "@/types/nota-administrativa";

const notaAdministrativaSchema = z.object({
  contenido: z
    .string()
    .trim()
    .min(1, "La nota no puede estar vacía.")
    .max(2000, "La nota no puede superar los 2000 caracteres."),
});

// ── crearNotaAdministrativa ──────────────────────────────────────────────────

export async function crearNotaAdministrativa(
  patientId: string,
  contenido: string
): Promise<ActionResult<NotaAdministrativa>> {
  const parsed = notaAdministrativaSchema.safeParse({ contenido });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user, idClinica } = await requireContext();

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("id_clinica", idClinica)
    .eq("activo", true)
    .single();

  if (adminError || !adminUser) {
    return { success: false, error: "No se encontró tu usuario administrativo en esta clínica." };
  }

  // Defense-in-depth: RLS ya exige que el paciente sea de la misma clínica
  // (ver migration 20260923_03), pero se verifica explícitamente antes del
  // INSERT para devolver un error claro en vez de un rechazo genérico de RLS.
  const { data: paciente, error: pacienteError } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", patientId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (pacienteError || !paciente) {
    return { success: false, error: "Paciente no encontrado en esta clínica." };
  }

  const { data, error } = await supabase
    .from("fce_notas_administrativas")
    .insert({
      id_clinica: idClinica,
      id_paciente: patientId,
      autor_admin_user_id: adminUser.id,
      contenido: parsed.data.contenido,
    })
    .select("*, autor:admin_users(nombre)")
    .single();

  if (error || !data) {
    return dbError("notas-administrativas", error, { id_clinica: idClinica, id_paciente: patientId });
  }

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_nota_administrativa",
    tipoEvento: "create",
    tablaAfectada: "fce_notas_administrativas",
    registroId: data.id,
    idClinica,
    idPaciente: patientId,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { success: true, data: data as unknown as NotaAdministrativa };
}

// ── getNotasAdministrativas ───────────────────────────────────────────────────

export async function getNotasAdministrativas(
  patientId: string
): Promise<ActionResult<NotaAdministrativa[]>> {
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("fce_notas_administrativas")
    .select("*, autor:admin_users(nombre)")
    .eq("id_paciente", patientId)
    .eq("id_clinica", idClinica)
    .order("created_at", { ascending: false });

  if (error) {
    return dbError("notas-administrativas", error, { id_clinica: idClinica, id_paciente: patientId });
  }
  return { success: true, data: (data ?? []) as unknown as NotaAdministrativa[] };
}
