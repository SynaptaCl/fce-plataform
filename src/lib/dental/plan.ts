import type { PlanTratamientoItem, PrioridadItem } from "@/types/plan-tratamiento";

const PRIORIDAD_ORDEN: Record<PrioridadItem, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baja: 3,
  electivo: 4,
};

export function calcularProgreso(items: PlanTratamientoItem[]): number {
  if (items.length === 0) return 0;
  const completados = items.filter((i) => i.estado === "completado").length;
  return Math.round((completados / items.length) * 100);
}

export function calcularPresupuestoTotal(items: PlanTratamientoItem[]): number {
  return items.reduce((sum, i) => sum + (i.valor_unitario ?? 0), 0);
}

export function calcularMontoRealizado(items: PlanTratamientoItem[]): number {
  return items
    .filter((i) => i.estado === "completado")
    .reduce((sum, i) => sum + (i.valor_unitario ?? 0), 0);
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
