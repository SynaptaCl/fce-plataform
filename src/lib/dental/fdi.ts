/**
 * Helpers para notación FDI (ISO 3950).
 * Dentición permanente: cuadrantes 1-4 (11-18, 21-28, 31-38, 41-48)
 * Dentición temporal: cuadrantes 5-8 (51-55, 61-65, 71-75, 81-85)
 */

export const PIEZAS_ADULTO: number[] = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

export const PIEZAS_NINO: number[] = [
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75,
  81, 82, 83, 84, 85,
];

export function validarPieza(pieza: number): boolean {
  return PIEZAS_ADULTO.includes(pieza) || PIEZAS_NINO.includes(pieza);
}

export function esPermanente(pieza: number): boolean {
  return PIEZAS_ADULTO.includes(pieza);
}

export function esTemporal(pieza: number): boolean {
  return PIEZAS_NINO.includes(pieza);
}

export function getCuadrante(pieza: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  const cuadrante = Math.floor(pieza / 10);
  return cuadrante as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export function getPiezasCuadrante(cuadrante: number): number[] {
  return [...PIEZAS_ADULTO, ...PIEZAS_NINO].filter(
    (p) => Math.floor(p / 10) === cuadrante
  );
}

const LABELS_PERMANENTE: Record<number, string> = {
  11: "Incisivo central superior derecho",
  12: "Incisivo lateral superior derecho",
  13: "Canino superior derecho",
  14: "Primer premolar superior derecho",
  15: "Segundo premolar superior derecho",
  16: "Primer molar superior derecho",
  17: "Segundo molar superior derecho",
  18: "Tercer molar superior derecho",
  21: "Incisivo central superior izquierdo",
  22: "Incisivo lateral superior izquierdo",
  23: "Canino superior izquierdo",
  24: "Primer premolar superior izquierdo",
  25: "Segundo premolar superior izquierdo",
  26: "Primer molar superior izquierdo",
  27: "Segundo molar superior izquierdo",
  28: "Tercer molar superior izquierdo",
  31: "Incisivo central inferior izquierdo",
  32: "Incisivo lateral inferior izquierdo",
  33: "Canino inferior izquierdo",
  34: "Primer premolar inferior izquierdo",
  35: "Segundo premolar inferior izquierdo",
  36: "Primer molar inferior izquierdo",
  37: "Segundo molar inferior izquierdo",
  38: "Tercer molar inferior izquierdo",
  41: "Incisivo central inferior derecho",
  42: "Incisivo lateral inferior derecho",
  43: "Canino inferior derecho",
  44: "Primer premolar inferior derecho",
  45: "Segundo premolar inferior derecho",
  46: "Primer molar inferior derecho",
  47: "Segundo molar inferior derecho",
  48: "Tercer molar inferior derecho",
};

const LABELS_TEMPORAL: Record<number, string> = {
  51: "Incisivo central temporal superior derecho",
  52: "Incisivo lateral temporal superior derecho",
  53: "Canino temporal superior derecho",
  54: "Primer molar temporal superior derecho",
  55: "Segundo molar temporal superior derecho",
  61: "Incisivo central temporal superior izquierdo",
  62: "Incisivo lateral temporal superior izquierdo",
  63: "Canino temporal superior izquierdo",
  64: "Primer molar temporal superior izquierdo",
  65: "Segundo molar temporal superior izquierdo",
  71: "Incisivo central temporal inferior izquierdo",
  72: "Incisivo lateral temporal inferior izquierdo",
  73: "Canino temporal inferior izquierdo",
  74: "Primer molar temporal inferior izquierdo",
  75: "Segundo molar temporal inferior izquierdo",
  81: "Incisivo central temporal inferior derecho",
  82: "Incisivo lateral temporal inferior derecho",
  83: "Canino temporal inferior derecho",
  84: "Primer molar temporal inferior derecho",
  85: "Segundo molar temporal inferior derecho",
};

export function getLabelPieza(pieza: number): string {
  return LABELS_PERMANENTE[pieza] ?? LABELS_TEMPORAL[pieza] ?? `Pieza ${pieza}`;
}
