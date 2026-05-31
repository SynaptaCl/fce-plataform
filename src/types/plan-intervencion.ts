import type { ICDCodeSnap } from "./diagnostico";

export type EstadoPlanIntervencion = "borrador" | "activo" | "en_revision" | "cerrado";
export type PrioridadObjetivo = "alta" | "media" | "baja";
export type EstadoObjetivo = "activo" | "logrado" | "reformulado" | "suspendido";
export type NivelGAS = -2 | -1 | 0 | 1 | 2;

export interface PlanIntervencion {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro_origen: string | null;
  titulo: string;
  condicion_codigo: string | null;
  diagnostico: string | null;
  icd_codigos: ICDCodeSnap[];
  fecha_inicio: string;
  fecha_revision: string | null;
  estado: EstadoPlanIntervencion;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  snapshot_equipo: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanObjetivo {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_plan: string;
  dominio_codigo: string;
  dominio_label: string;
  descripcion: string;
  criterio_logro: string | null;
  gas_menos_2: string | null;
  gas_menos_1: string | null;
  gas_0: string | null;
  gas_mas_1: string | null;
  gas_mas_2: string | null;
  nivel_basal: NivelGAS;
  nivel_actual: NivelGAS;
  prioridad: PrioridadObjetivo;
  estado: EstadoObjetivo;
  responsable_principal: string | null;
  orden: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanProgreso {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_objetivo: string;
  id_encuentro: string | null;
  nivel_gas: NivelGAS;
  observacion: string | null;
  estrategias: string | null;
  registrado_por: string;
  registrado_at: string;
  created_at: string;
}

/** Plan con objetivos enriquecidos (para vista detalle) */
export interface PlanIntervencionDetalle extends PlanIntervencion {
  objetivos: (PlanObjetivo & { ultimo_progreso?: PlanProgreso })[];
}
