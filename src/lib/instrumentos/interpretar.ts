import type { InterpretacionRango } from "@/types/instrumento";

export function interpretarPuntaje(
  puntaje: number,
  rangos: InterpretacionRango[]
): { label: string; color: InterpretacionRango["color"] } | null {
  const rango = rangos.find((r) => puntaje >= r.min && puntaje <= r.max);
  if (!rango) return null;
  return { label: rango.label, color: rango.color };
}
