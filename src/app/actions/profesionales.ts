"use server";

import { requireContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/actions/patients";

/**
 * Valida que la especialidad existe en especialidades_catalogo.
 * Retorna error string si inválida, null si válida.
 * NUNCA normaliza el string — debe coincidir exacto (con tilde).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validarEspecialidad(supabase: any, especialidad: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("especialidades_catalogo")
    .select("codigo")
    .eq("codigo", especialidad)
    .eq("activa", true)
    .maybeSingle();

  if (error) return `Error validando especialidad: ${error.message}`;
  if (!data) return `Especialidad inválida: "${especialidad}". Debe coincidir exactamente con el catálogo (incluyendo tildes).`;
  return null;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ProfesionalInput {
  nombre: string;
  especialidad: string;
  rut?: string | null;
  numero_registro?: string | null;
  tipo_registro?: string | null;
  puede_prescribir?: boolean;
  puede_indicar_examenes?: boolean;
  duracion_consulta?: number;
  color_agenda?: string | null;
  es_agendable?: boolean;
  activo?: boolean;
}

// ── crearProfesional ──────────────────────────────────────────────────────────

export async function crearProfesional(
  input: ProfesionalInput & { auth_id: string }
): Promise<ActionResult<{ id: string }>> {
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

  const errorEsp = await validarEspecialidad(supabase, input.especialidad);
  if (errorEsp) return { success: false, error: errorEsp };

  const { data, error } = await supabase
    .from("profesionales")
    .insert({
      ...input,
      id_clinica: idClinica,
      activo: input.activo ?? true,
      es_agendable: input.es_agendable ?? true,
      puede_prescribir: input.puede_prescribir ?? false,
      puede_indicar_examenes: input.puede_indicar_examenes ?? false,
      duracion_consulta: input.duracion_consulta ?? 60,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "crear_profesional",
    tipoEvento: "create",
    tablaAfectada: "profesionales",
    registroId: data.id,
    idClinica: idClinica,
  });
  return { success: true, data: { id: data.id as string } };
}

// ── actualizarProfesional ─────────────────────────────────────────────────────

export async function actualizarProfesional(
  profesionalId: string,
  input: Partial<ProfesionalInput>
): Promise<ActionResult<void>> {
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

  if (input.especialidad !== undefined) {
    const errorEsp = await validarEspecialidad(supabase, input.especialidad);
    if (errorEsp) return { success: false, error: errorEsp };
  }

  const { error } = await supabase
    .from("profesionales")
    .update(input)
    .eq("id", profesionalId)
    .eq("id_clinica", idClinica);

  if (error) return { success: false, error: error.message };

  await logAudit({
    supabase,
    actorId: user.id,
    accion: "actualizar_profesional",
    tipoEvento: "update",
    tablaAfectada: "profesionales",
    registroId: profesionalId,
    idClinica: idClinica,
  });
  return { success: true, data: undefined };
}
