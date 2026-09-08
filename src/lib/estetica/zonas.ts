/**
 * Catálogo estático de zonas faciales/corporales para la ficha estética.
 * Estático en código (no tabla DB) — mismo criterio que la numeración FDI
 * dental (src/lib/dental/fdi.ts): son fijas, no varían por clínica.
 */

export type ZonaFacial =
  | "frente" | "entrecejo" | "patas_gallo" | "nasolabial"
  | "menton" | "pomulos" | "labios";

export type ZonaCorporal =
  | "abdomen" | "flancos" | "brazos" | "gluteos" | "piernas" | "papada";

export const ZONAS_FACIALES: { codigo: ZonaFacial; label: string }[] = [
  { codigo: "frente", label: "Frente" },
  { codigo: "entrecejo", label: "Entrecejo" },
  { codigo: "patas_gallo", label: "Patas de gallo" },
  { codigo: "nasolabial", label: "Surco nasolabial" },
  { codigo: "menton", label: "Mentón" },
  { codigo: "pomulos", label: "Pómulos" },
  { codigo: "labios", label: "Labios" },
];

export const ZONAS_CORPORALES: { codigo: ZonaCorporal; label: string }[] = [
  { codigo: "abdomen", label: "Abdomen" },
  { codigo: "flancos", label: "Flancos" },
  { codigo: "brazos", label: "Brazos" },
  { codigo: "gluteos", label: "Glúteos" },
  { codigo: "piernas", label: "Piernas" },
  { codigo: "papada", label: "Papada" },
];

export function getLabelZona(region: "facial" | "corporal", codigo: string): string {
  const lista = region === "facial" ? ZONAS_FACIALES : ZONAS_CORPORALES;
  return lista.find((z) => z.codigo === codigo)?.label ?? codigo;
}

export function esZonaValida(region: "facial" | "corporal", codigo: string): boolean {
  const lista = region === "facial" ? ZONAS_FACIALES : ZONAS_CORPORALES;
  return lista.some((z) => z.codigo === codigo);
}
