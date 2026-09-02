/**
 * Sprint PRE-1 (§2 del doc): dos capas que nunca se mezclan.
 *
 * Capa A (tarificación): lo que paga el paciente — precio_base, recargo_pct,
 * descuentos, totales. Sí se muestra/renderiza.
 * Capa B (liquidación): honorario_tipo / honorario_valor / honorario_clp —
 * reparto interno del profesional. NUNCA se renderiza en PDF, timeline ni
 * ningún action de lectura accesible al paciente.
 *
 * Decisión D-1 (confirmada 2026-08-28): precio_base es precio final al público,
 * IVA incluido. El IVA se desagrega para la boleta (neto = total − iva), nunca se suma.
 */

export type ModeloPrecio = "centralizado" | "base_mas_recargo" | "por_profesional";

export type HonorarioTipo = "sueldo" | "porcentaje" | "monto_fijo" | "arriendo";

export type OrigenPrecio = "clinica" | "profesional" | "recargo";

/** Fila de `prestaciones_catalogo` (dominio synapta, solo-read desde fce). */
export interface PrestacionCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  /** CLP entero. IVA incluido si afecta_iva (D-1). */
  precio_base: number;
  afecta_iva: boolean;
  requiere_pieza?: boolean;
  ambito?: string;
}

/** Fila de `profesional_prestaciones` (capa A: override/recargo, capa B: honorario). */
export interface ProfesionalPrestacion {
  precio_override: number | null;
  recargo_pct: number | null;
  honorario_tipo: HonorarioTipo | null;
  honorario_valor: number | null;
}

/**
 * Override aceptado por resolverPrecio: honorario_* opcional (capa B no viaja
 * al cliente; el picker pasa solo lo que afecta el precio).
 */
export interface OverridePrecioInput {
  precio_override: number | null;
  recargo_pct: number | null;
  honorario_tipo?: HonorarioTipo | null;
  honorario_valor?: number | null;
}

export interface PrecioResuelto {
  precio_base: number;
  recargo_pct: number;
  /** CLP entero: lo que paga el paciente por unidad. Nunca depende de honorario_*. */
  precio_unitario: number;
  afecta_iva: boolean;
  origen: OrigenPrecio;
  /** true si el precio resuelto es <= 0: el presupuesto no puede firmarse (regla §4). */
  pendiente_tarificar: boolean;
  honorario_tipo: HonorarioTipo | null;
  honorario_valor: number | null;
}

/** Entrada por línea para `calcular()`; el caller resuelve override/pieza según contexto. */
export interface LineaInput {
  prestacion: PrestacionCatalogo;
  override: OverridePrecioInput | null;
  cantidad: number;
  descuento_pct?: number;
  descuento_clp?: number;
  pieza?: number | null;
  superficie?: string | null;
  id_profesional?: string | null;
}

/**
 * Línea calculada = snapshot congelable (§6): al firmar, estos valores se
 * persisten tal cual en `fce_presupuesto_items` y no se recalculan jamás.
 */
export interface LineaCalculada extends PrecioResuelto {
  id_prestacion: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  descuento_pct: number;
  descuento_clp: number;
  subtotal_linea: number;
  total_linea_clp: number;
  iva_linea_clp: number;
  pieza: number | null;
  superficie: string | null;
  id_profesional: string | null;
  honorario_clp: number | null;
}

export interface PresupuestoCalculado {
  lineas: LineaCalculada[];
  subtotal_clp: number;
  descuento_clp: number;
  total_clp: number;
  iva_clp: number;
  neto_clp: number;
  pendiente_tarificar: boolean;
}

export interface PoliticaDescuento {
  permite_descuento_item: boolean;
  descuento_max_pct: number;
}

export type ValidacionLineas =
  | { ok: true }
  | { ok: false; error: string };

/** Pago mínimo para `calcularSaldo()`; solo estado 'aprobado' suma (§7). */
export interface PagoParaSaldo {
  monto_clp: number;
  estado: string;
}

export interface SaldoResumen {
  pagado_clp: number;
  saldo_clp: number;
}
