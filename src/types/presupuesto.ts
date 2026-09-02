/**
 * Tipos de presupuesto (M11) — Sprint PRE-1.
 *
 * IMPORTANTE (§2 del doc del sprint): PresupuestoItem NO expone honorario_*
 * (capa B — liquidación). Los actions leen con SELECT explícito de columnas;
 * nunca select("*") en el path de lectura/PDF.
 */

export type PresupuestoEstado =
  | "borrador"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "anulado";

export interface Presupuesto {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_profesional: string;
  titulo: string;
  estado: PresupuestoEstado;
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  created_at: string;
  updated_at: string;
  // Totales persistidos, calculados server-side (F4/F5)
  subtotal_clp: number;
  descuento_clp: number;
  neto_clp: number;
  iva_clp: number;
  total_clp: number;
  modelo_precio: string | null;
  id_plan_tratamiento: string | null;
  created_by: string | null;
  validez_dias: number | null;
  items?: PresupuestoItem[];
  profesional?: { nombre: string; especialidad: string };
}

export interface PresupuestoItem {
  id: string;
  id_presupuesto: string;
  id_prestacion: string | null;
  codigo: string | null;
  id_profesional: string | null;
  pieza: number | null;
  superficie: string | null;
  descripcion: string;
  cantidad: number;
  precio_base: number;
  recargo_pct: number;
  precio_unitario: number; // precio resuelto (con recargo), CLP enteros
  descuento_pct: number;
  descuento_clp: number;
  afecta_iva: boolean;
  total_linea_clp: number;
  orden: number;
}

/**
 * Lo único que el cliente envía al guardar: sin precios.
 * El server resuelve precio/descuentos/totales desde el catálogo (F5).
 */
export interface PresupuestoItemInput {
  id_prestacion: string;
  cantidad: number;
  descuento_pct?: number;
  pieza?: number | null;
  superficie?: string | null;
}

export type PresupuestoFormData = {
  titulo: string;
  notas?: string;
  id_plan_tratamiento?: string;
  items: PresupuestoItemInput[];
};

/** Prestación del catálogo para el picker (sin honorarios, capa B jamás al cliente). */
export interface PrestacionParaPicker {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio_base: number;
  afecta_iva: boolean;
  requiere_pieza: boolean;
  ambito: string;
}

/** Override por profesional visible en el FCE (sin honorarios). */
export interface OverrideParaPicker {
  id_prestacion: string;
  precio_override: number | null;
  recargo_pct: number | null;
}
