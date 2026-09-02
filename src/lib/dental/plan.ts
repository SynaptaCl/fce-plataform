import type { PlanTratamientoItem } from "@/types/plan-tratamiento";

const PRIORIDAD_ORDEN: Record<string, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baja: 3,
  electivo: 4,
};

/** Presupuesto M11 mínimo para derivar totales del plan (sprint PRE-1 §8). */
export interface PresupuestoDePlan {
  total_clp: number | null;
  items?: Array<{
    id_prestacion: string | null;
    pieza: number | null;
    total_linea_clp: number;
  }> | null;
}

export function calcularProgreso(items: PlanTratamientoItem[]): number {
  if (items.length === 0) return 0;
  const completados = items.filter((i) => i.estado === "completado").length;
  return Math.round((completados / items.length) * 100);
}

/**
 * Sprint PRE-1 §8: el total del plan es el del presupuesto M11 generado
 * (fce_presupuestos.id_plan_tratamiento). El plan dejó de ser fuente de precio.
 */
export function calcularPresupuestoTotal(
  presupuesto: PresupuestoDePlan | null | undefined,
): number {
  return presupuesto?.total_clp ?? 0;
}

/**
 * Monto realizado: suma de total_linea_clp de los ítems del presupuesto M11
 * que corresponden a procedimientos del plan marcados como completados
 * (match por id_prestacion + pieza).
 */
export function calcularMontoRealizado(
  items: PlanTratamientoItem[],
  presupuesto: PresupuestoDePlan | null | undefined,
): number {
  const itemsPresupuesto = presupuesto?.items ?? [];
  return items
    .filter((i) => i.estado === "completado" && i.id_prestacion)
    .reduce((sum, i) => {
      const match = itemsPresupuesto.find(
        (p) =>
          p.id_prestacion === i.id_prestacion &&
          (p.pieza ?? null) === (i.pieza ?? null),
      );
      return sum + (match?.total_linea_clp ?? 0);
    }, 0);
}

export function proximoProcedimiento(
  items: PlanTratamientoItem[],
): PlanTratamientoItem | null {
  const pendientes = items
    .filter((i) => i.estado === "pendiente" || i.estado === "en_progreso")
    .sort(
      (a, b) =>
        PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad] ||
        a.orden - b.orden,
    );
  return pendientes[0] ?? null;
}
