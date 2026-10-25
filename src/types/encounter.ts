export type EncounterStatus = "planificado" | "en_progreso" | "finalizado" | "cancelado";
export type Modalidad = "presencial" | "domicilio" | "virtual";

/** Estados del enum `estado_cita` de la BD (ecosistema agenda Synapta). */
export type EstadoCita =
  | "pendiente_pago"
  | "agendada"
  | "recordatorio_enviado"
  | "confirmada"
  | "completada"
  | "anulada"
  | "no_asiste";

/** Estados que representan una cita viva en agenda (excluye anuladas/no_asiste). */
export const ESTADOS_CITA_ACTIVOS: Exclude<EstadoCita, "anulada" | "no_asiste">[] = [
  "pendiente_pago",
  "agendada",
  "recordatorio_enviado",
  "confirmada",
  "completada",
];

/** true si la cita aún no ha sido confirmada por recepción/el paciente. */
export function citaPorConfirmar(estado: EstadoCita): boolean {
  return estado === "pendiente_pago" || estado === "agendada" || estado === "recordatorio_enviado";
}

export interface Encounter {
  id: string;
  id_paciente: string;
  id_profesional: string;
  especialidad: string;
  modalidad: Modalidad;
  status: EncounterStatus;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface CitaAgenda {
  id_cita: string;
  estado: EstadoCita;
  fecha: string;
  hora_inicio: string;    // "HH:MM:SS"
  hora_fin: string;       // "HH:MM:SS"
  id_paciente: string;
  paciente_nombre: string;
  paciente_apellido: string;
  paciente_rut: string | null;
  id_profesional: string;
  profesional_nombre: string;
  profesional_especialidad: string | null;
  color_agenda: string | null;
  notas_cita: string | null;
  id_encuentro: string | null;
  encuentro_status: EncounterStatus | null;
  id_clinica: string;
  servicio_nombre?: string | null;
  requiere_pago?: boolean | null;
}
