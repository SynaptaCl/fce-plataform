"use server";

import { dbError } from "@/lib/modules/guards";
import type { ActionResult } from "@/lib/modules/guards";
import {
  filtrarCamposEditables,
  validarNumeroRegistro,
  validarTipoRegistro,
} from "./shared";
import { requireConfigAdmin } from "./_shared-server";
import { logAudit } from "@/lib/audit";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ProfesionalSelfServiceInput {
  nombre?: string;
  numero_registro?: string | null;
  tipo_registro?: string | null;
  activo?: boolean;
  // NOTA: puede_prescribir y puede_indicar_examenes NO están en este tipo
}

// ── updateProfesionalSelfService ──────────────────────────────────────────────

/**
 * Actualiza campos no-clínicos de un profesional.
 * NUNCA modifica puede_prescribir, puede_indicar_examenes, especialidad ni auth_id.
 * Solo admin/director/superadmin pueden llamar esta acción.
 */
export async function updateProfesionalSelfService(
  profesionalId: string,
  datos: ProfesionalSelfServiceInput
): Promise<ActionResult<void>> {
  const { supabase, user, idClinica } = await requireConfigAdmin();

  // Whitelist — nunca exponer campos de prescripción/exámenes/especialidad
  const camposEditables = filtrarCamposEditables(
    datos as Record<string, unknown>
  );

  // Fix 4 — guard empty camposEditables
  if (Object.keys(camposEditables).length === 0) {
    return { success: false, error: "No hay campos editables en la solicitud." };
  }

  // Validaciones
  const validNR = validarNumeroRegistro(camposEditables.numero_registro);
  if (!validNR.success) return validNR;

  const validTR = validarTipoRegistro(camposEditables.tipo_registro);
  if (!validTR.success) return validTR;

  // Verificar propiedad: el profesional debe pertenecer a la clínica del admin
  const { data: profExistente, error: errorLectura } = await supabase
    .from("profesionales")
    .select("id")
    .eq("id", profesionalId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorLectura) {
    return dbError("profesionales", errorLectura);
  }
  if (!profExistente) {
    return {
      success: false,
      error: "Profesional no encontrado en esta clínica.",
    };
  }

  // Update — filtrando por id Y id_clinica (defensa en profundidad más allá de RLS)
  const { error: errorUpdate } = await supabase
    .from("profesionales")
    .update(camposEditables)
    .eq("id", profesionalId)
    .eq("id_clinica", idClinica);

  if (errorUpdate) {
    return dbError("profesionales", errorUpdate);
  }

  await logAudit({
    supabase,
    actorId: user.id,
    actorTipo: "admin",
    accion: "actualizar_profesional_self_service",
    tipoEvento: "config_update",
    tablaAfectada: "profesionales",
    registroId: profesionalId,
    idClinica,
  });

  return { success: true, data: undefined };
}

// ── toggleProfesionalActivo ───────────────────────────────────────────────────

/**
 * Activa o desactiva un profesional.
 * Retorna el nuevo estado activo.
 */
export async function toggleProfesionalActivo(
  profesionalId: string
): Promise<ActionResult<{ activo: boolean }>> {
  const { supabase, user, idClinica } = await requireConfigAdmin();

  // Leer estado actual + verificar propiedad simultáneamente
  const { data: prof, error: errorLectura } = await supabase
    .from("profesionales")
    .select("id, activo")
    .eq("id", profesionalId)
    .eq("id_clinica", idClinica)
    .maybeSingle();

  if (errorLectura) {
    return dbError("profesionales", errorLectura);
  }
  if (!prof) {
    return {
      success: false,
      error: "Profesional no encontrado en esta clínica.",
    };
  }

  const nuevoActivo = !(prof.activo as boolean);

  const { error: errorUpdate } = await supabase
    .from("profesionales")
    .update({ activo: nuevoActivo })
    .eq("id", profesionalId)
    .eq("id_clinica", idClinica);

  if (errorUpdate) {
    return dbError("profesionales", errorUpdate);
  }

  await logAudit({
    supabase,
    actorId: user.id,
    actorTipo: "admin",
    accion: nuevoActivo ? "activar_profesional" : "desactivar_profesional",
    tipoEvento: "config_update",
    tablaAfectada: "profesionales",
    registroId: profesionalId,
    idClinica,
  });

  return { success: true, data: { activo: nuevoActivo } };
}
