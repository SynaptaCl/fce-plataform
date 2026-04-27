"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";

// ── Validation ────────────────────────────────────────────────────────────────

const quickNoteSchema = z.object({
  contenido: z
    .string()
    .min(10, "La nota debe tener al menos 10 caracteres.")
    .max(5000, "La nota no puede superar los 5000 caracteres."),
  motivo: z.string().max(200, "El motivo no puede superar los 200 caracteres.").nullable().optional(),
});

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
async function logAudit(supabase: any, userId: string, notaId: string, idClinica: string | null, idPaciente: string) {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: userId,
      actor_tipo: "profesional",
      accion: "crear_nota_rapida",
      tabla_afectada: "fce_notas_clinicas",
      registro_id: notaId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
      id_paciente: idPaciente,
    });
  } catch { /* no bloquea el flujo principal */ }
}

// ── createQuickNote ───────────────────────────────────────────────────────────

export async function createQuickNote(
  patientId: string,
  motivo: string | null,
  contenido: string
): Promise<ActionResult<{ encuentroId: string; notaId: string }>> {
  const parsed = quickNoteSchema.safeParse({ contenido, motivo });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica) {
    return { success: false, error: "No se pudo determinar la clínica del usuario." };
  }

  const profesional = await getProfesionalActivo(supabase, user.id, idClinica);
  if (!profesional) {
    return { success: false, error: "No tienes un perfil de profesional activo." };
  }

  const ahora = new Date().toISOString();

  // 1. Micro-encuentro finalizado desde creación — mantiene trazabilidad Decreto 41
  const { data: encuentro, error: errEnc } = await supabase
    .from("fce_encuentros")
    .insert({
      id_paciente: patientId,
      id_clinica: idClinica,
      id_profesional: profesional.id,
      especialidad: profesional.especialidad,
      modalidad: "presencial",
      status: "finalizado",
      started_at: ahora,
      ended_at: ahora,
    })
    .select("id")
    .single();

  if (errEnc || !encuentro) {
    return { success: false, error: errEnc?.message ?? "Error al crear el encuentro." };
  }

  const encuentroId = encuentro.id as string;

  // 2. Nota clínica firmada en la misma secuencia
  const { data: nota, error: errNota } = await supabase
    .from("fce_notas_clinicas")
    .insert({
      id_clinica: idClinica,
      id_paciente: patientId,
      id_encuentro: encuentroId,
      motivo_consulta: parsed.data.motivo || null,
      contenido: parsed.data.contenido,
      firmado: true,
      firmado_at: ahora,
      firmado_por: profesional.id,
      created_by: profesional.id,
    })
    .select("id")
    .single();

  if (errNota || !nota) {
    // El encuentro quedó creado pero la nota falló — inocuo (no aparece en Timeline)
    console.error("[FCE] createQuickNote: encuentro creado pero fallo en nota:", errNota?.message);
    return { success: false, error: errNota?.message ?? "Error al guardar la nota clínica." };
  }

  const notaId = nota.id as string;

  await logAudit(supabase, user.id, notaId, idClinica, patientId);
  revalidatePath(`/dashboard/pacientes/${patientId}`);

  return { success: true, data: { encuentroId, notaId } };
}
