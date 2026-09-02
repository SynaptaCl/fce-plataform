export type EstadoPlan = 'borrador' | 'activo' | 'completado' | 'cancelado';
export type EstadoItem = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado' | 'rechazado_paciente';
export type PrioridadItem = 'urgente' | 'alta' | 'normal' | 'baja' | 'electivo';

export interface PlanTratamiento {
  id: string;
  id_clinica: string;
  id_paciente: string;
  titulo: string;
  diagnostico: string | null;
  observaciones: string | null;
  estado: EstadoPlan;
  /** Derivado de M11 en código — se deja de escribir (sprint PRE-1 §7/§8). */
  presupuesto_total: number;
  /** Derivado de pagos en código — se deja de escribir (sprint PRE-1 §7). */
  monto_pagado: number;
  cerrado: boolean;
  cerrado_at: string | null;
  cerrado_por: string | null;
  items?: PlanTratamientoItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanTratamientoItem {
  id: string;
  id_plan: string;
  id_clinica: string;
  /** Prestación del catálogo (prestaciones_catalogo, ámbito dental). */
  id_prestacion: string | null;
  /** Etiqueta snapshot del nombre de la prestación (solo display). */
  procedimiento: string;
  descripcion: string | null;
  pieza: number | null;
  superficie: string | null;
  orden: number;
  prioridad: PrioridadItem;
  estado: EstadoItem;
  id_encuentro_realizado: string | null;
  realizado_at: string | null;
  realizado_por: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Prestación del catálogo dental (prestaciones_catalogo, ambito='dental').
 * Reemplaza al procedimientos_catalogo deprecado (0 filas en prod).
 */
export interface ProcedimientoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio_base: number;
  afecta_iva: boolean;
  requiere_pieza: boolean;
}
