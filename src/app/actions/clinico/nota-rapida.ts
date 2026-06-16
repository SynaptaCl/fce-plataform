"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import { sanitizeRichText } from "@/lib/sanitize";
import { stripHtml } from "@/lib/utils";
import type { ActionResult } from "@/app/actions/patients";
import { log } from "@/lib/logger";
import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// ── Validation ────────────────────────────────────────────────────────────────
// contenido es HTML rich-text — validar longitud sobre el TEXTO PLANO, no el crudo,
// para no penalizar el formato (negrita, listas, párrafos suman overhead de tags).

const quickNoteSchema = z.object({
  contenido: z
    .string()
    .refine((v) => stripHtml(v).length >= 10, "La nota debe tener al menos 10 caracteres.")
    .refine((v) => stripHtml(v).length <= 5000, "La nota no puede superar los 5000 caracteres."),
  motivo: z.string().max(200, "El motivo no puede superar los 200 caracteres.").nullable().optional(),
});

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

  const { supabase, user, idClinica } = await requireContext();

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
      contenido: sanitizeRichText(parsed.data.contenido),
      firmado: true,
      firmado_at: ahora,
      firmado_por: profesional.id,
      created_by: profesional.id,
    })
    .select("id")
    .single();

  if (errNota || !nota) {
    // El encuentro quedó creado pero la nota falló — inocuo (no aparece en Timeline)
    log("error", { action: "create_quick_note", id_clinica: idClinica, id_paciente: patientId, id_encuentro: encuentroId, error: errNota });
    return { success: false, error: errNota?.message ?? "Error al guardar la nota clínica." };
  }

  const notaId = nota.id as string;

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_nota_rapida",
    tipoEvento: "create",
    tablaAfectada: "fce_notas_clinicas",
    registroId: notaId,
    idClinica: idClinica,
    idPaciente: patientId,
  });
  revalidatePath(`/dashboard/pacientes/${patientId}`);

  return { success: true, data: { encuentroId, notaId } };
}
