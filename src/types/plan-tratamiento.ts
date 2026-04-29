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
  presupuesto_total: number;
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
  valor_unitario: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcedimientoCatalogo {
  id: string;
  id_clinica: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  precio_base: number;
  duracion_min: number | null;
  activo: boolean;
  orden: number;
}
