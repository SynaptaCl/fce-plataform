"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoEvento =
  | "create" | "update" | "delete" | "sign"
  | "read_ficha" | "export_pdf" | "export_epicrisis"
  | "create_adenda" | "create_errata" | "create_anulacion"
  | "errata_post_ventana" | "login"
  | "ia_copiloto" | "ia_resumen" | "ia_informe"
  | "config_update"
  // AMB-1 — pendientes de migration que extienda el CHECK/enum de logs_auditoria.tipo_evento
  // (ver AMB-1-ambient-scribe.md §5.5). logAudit es fire-and-forget: si la DB aún no acepta
  // estos valores, el INSERT falla y se loguea a console.error sin romper el flujo clínico.
  | "ia_ambient" | "consent_grabacion_otorgado" | "consent_grabacion_revocado";

export type ActorTipo = "profesional" | "admin" | "sistema" | "bot";

interface LogAuditParams {
  supabase: SupabaseClient;
  actorId: string;
  actorTipo?: ActorTipo;
  accion: string;
  tipoEvento: TipoEvento;
  tablaAfectada: string;
  registroId?: string;
  idClinica: string;
  idPaciente?: string;
  datosBefore?: Record<string, unknown>;
  datosAfter?: Record<string, unknown>;
  sessionId?: string;
}

/**
 * Registra un evento de auditoría. Fire-and-forget con fallback a console.error.
 * Nunca lanza — los errores de audit no deben romper el flujo clínico.
 */
export async function logAudit({
  supabase,
  actorId,
  actorTipo = "profesional",
  accion,
  tipoEvento,
  tablaAfectada,
  registroId,
  idClinica,
  idPaciente,
  datosBefore,
  datosAfter,
  sessionId,
}: LogAuditParams): Promise<void> {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: actorId,
      actor_tipo: actorTipo,
      accion,
      tipo_evento: tipoEvento,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      id_clinica: idClinica,
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
      ...(datosBefore ? { datos_antes: datosBefore } : {}),
      ...(datosAfter ? { datos_despues: datosAfter } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  } catch (err) {
    console.error("[FCE] audit log failed:", {
      accion,
      tipoEvento,
      tablaAfectada,
      registroId,
      error: err,
    });
  }
}
