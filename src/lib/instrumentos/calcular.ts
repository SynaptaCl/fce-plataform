import type { SchemaItems } from "@/types/instrumento";

export function calcularPuntaje(
  schema_items: SchemaItems,
  respuestas: Record<string, number | string>
): number | null {
  const { items, calculo } = schema_items;

  // Retorna null si hay respuestas incompletas o no numéricas
  const valores: number[] = [];
  for (const item of items) {
    const val = respuestas[item.codigo];
    if (val === undefined || val === null) return null;
    if (typeof val !== "number") return null;
    valores.push(val);
  }

  if (valores.length === 0) return null;

  switch (calculo) {
    case "suma":
      return valores.reduce((acc, v) => acc + v, 0);
    case "promedio":
      return valores.reduce((acc, v) => acc + v, 0) / valores.length;
    case "max":
      return Math.max(...valores);
    case "min":
      return Math.min(...valores);
    default:
      return null;
  }
}
