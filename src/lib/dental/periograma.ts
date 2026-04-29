import type { PeriogramaPiezaDatos } from "@/types/periograma";

// Display order for each arch (patient's right → left, standard FDI dental chart orientation)
export const ARCO_SUPERIOR: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCO_INFERIOR: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// First tooth of the second quadrant in each arch — midline border is drawn before these
export const MIDLINE_SUPERIOR = 21;
export const MIDLINE_INFERIOR = 31;

const MOLARES: Set<number> = new Set([16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48]);

export function esMolar(pieza: number): boolean {
  return MOLARES.has(pieza);
}

export function calcularIndiceSangrado(datos: PeriogramaPiezaDatos[]): number {
  let total = 0;
  let sangrando = 0;
  for (const d of datos) {
    for (const v of [...d.sangrado.vestibular, ...d.sangrado.lingual]) {
      total++;
      if (v) sangrando++;
    }
  }
  if (total === 0) return 0;
  return Math.round((sangrando / total) * 1000) / 10;
}

export function calcularProfundidadMedia(datos: PeriogramaPiezaDatos[]): number {
  let suma = 0;
  let count = 0;
  for (const d of datos) {
    for (const v of [...d.sondaje.vestibular, ...d.sondaje.lingual]) {
      if (v > 0) {
        suma += v;
        count++;
      }
    }
  }
  if (count === 0) return 0;
  return Math.round((suma / count) * 10) / 10;
}

export function calcularSitiosPatologicos(datos: PeriogramaPiezaDatos[]): number {
  let count = 0;
  for (const d of datos) {
    for (const v of [...d.sondaje.vestibular, ...d.sondaje.lingual]) {
      if (v >= 4) count++;
    }
  }
  return count;
}

export function crearPiezaVacia(pieza: number): PeriogramaPiezaDatos {
  return {
    pieza,
    sondaje:         { vestibular: [0, 0, 0], lingual: [0, 0, 0] },
    nivel_insercion: { vestibular: [0, 0, 0], lingual: [0, 0, 0] },
    sangrado:        { vestibular: [false, false, false], lingual: [false, false, false] },
    supuracion:      { vestibular: [false, false, false], lingual: [false, false, false] },
    margen_gingival: { vestibular: [0, 0, 0], lingual: [0, 0, 0] },
    furca: null,
    movilidad: 0,
  };
}

export function initDatos(
  piezas: number[],
  existentes: PeriogramaPiezaDatos[],
): Record<number, PeriogramaPiezaDatos> {
  const map: Record<number, PeriogramaPiezaDatos> = {};
  for (const p of piezas) {
    map[p] = crearPiezaVacia(p);
  }
  for (const d of existentes) {
    if (d.pieza in map) map[d.pieza] = d;
  }
  return map;
}

export function meanOf(arr: [number, number, number]): number {
  return Math.round(((arr[0] + arr[1] + arr[2]) / 3) * 10) / 10;
}

export function sondajeColor(v: number): "green" | "amber" | "red" | "none" {
  if (v >= 6) return "red";
  if (v >= 4) return "amber";
  if (v > 0)  return "green";
  return "none";
}
