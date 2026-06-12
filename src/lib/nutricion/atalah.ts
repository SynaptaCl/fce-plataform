/**
 * src/lib/nutricion/atalah.ts
 *
 * Curva de Atalah para clasificación nutricional gestacional.
 * Estándar MINSAL Chile basado en:
 *   Atalah E, et al. "Propuesta de un nuevo estándar de evaluación nutricional
 *   en embarazadas." Rev Med Chile 1997;125:1429–36.
 *
 * La curva clasifica el estado nutricional gestacional según:
 *   1. IMC pregestacional (categoría base)
 *   2. IMC actual en la semana gestacional
 *
 * Bandas definidas para cada categoría por semana de gestación (10–41).
 * Límites P10 (inferior) y P90 (superior) de cada banda.
 *
 * ⚠️ Requiere validación clínica por nutricionista antes de uso en producción.
 *    Estándar específico para población chilena; no usar en otras poblaciones
 *    sin validación específica.
 *
 * Módulo server-safe: sin imports React/Next.js.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CategoriaPregestacional =
  | 'enflaquecida'   // IMC < 19.8
  | 'normal'         // 19.8 ≤ IMC < 25.0
  | 'sobrepeso'      // 25.0 ≤ IMC < 30.0
  | 'obesa';         // IMC ≥ 30.0

export interface ClasificacionGestacional {
  categoria: CategoriaPregestacional;
  imcActual: number;
  semana: number;
  estado: 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesa';
  rangoGananciaTotal: { min: number; max: number };
  descripcion: string;
}

// ─── Categoría pregestacional ─────────────────────────────────────────────────

/**
 * Clasifica el IMC pregestacional según Atalah/MINSAL.
 * Umbral normal: 19.8–24.9 (Atalah 1997 usa <25.0).
 */
export function clasificarIMCPregestacional(imc: number): CategoriaPregestacional {
  if (imc < 19.8) return 'enflaquecida';
  if (imc < 25.0) return 'normal';
  if (imc < 30.0) return 'sobrepeso';
  return 'obesa';
}

/** Rango de ganancia de peso total recomendado según categoría (MINSAL/IOM adaptado). */
export const GANANCIA_TOTAL: Record<CategoriaPregestacional, { min: number; max: number }> = {
  enflaquecida: { min: 12.5, max: 18.0 },
  normal:       { min: 11.5, max: 16.0 },
  sobrepeso:    { min: 7.0,  max: 11.5 },
  obesa:        { min: 5.0,  max: 9.0  },
};

// ─── Bandas de IMC gestacional por semana ─────────────────────────────────────
//
// Formato: [semana, imc_p10_inferior, imc_p90_superior]
// Interpolación lineal para semanas intermedias.
//
// Fuente: Atalah et al. 1997, Tabla 2.
// ⚠️ PENDIENTE_CLINICA: verificar valores contra publicación original.

interface BandaAtalah {
  semana: number;
  inferior: number; // P10 — límite bajo del rango normal
  superior: number; // P90 — límite alto del rango normal
}

const BANDAS: Record<CategoriaPregestacional, BandaAtalah[]> = {
  enflaquecida: [
    { semana: 10, inferior: 19.1, superior: 22.0 },
    { semana: 14, inferior: 19.5, superior: 22.4 },
    { semana: 18, inferior: 20.0, superior: 22.9 },
    { semana: 22, inferior: 20.5, superior: 23.6 },
    { semana: 26, inferior: 21.1, superior: 24.3 },
    { semana: 30, inferior: 21.7, superior: 25.1 },
    { semana: 34, inferior: 22.5, superior: 26.1 },
    { semana: 38, inferior: 23.2, superior: 27.2 },
    { semana: 41, inferior: 23.6, superior: 27.8 },
  ],
  normal: [
    { semana: 10, inferior: 22.0, superior: 25.6 },
    { semana: 14, inferior: 22.3, superior: 25.9 },
    { semana: 18, inferior: 22.6, superior: 26.5 },
    { semana: 22, inferior: 23.2, superior: 27.3 },
    { semana: 26, inferior: 23.8, superior: 28.0 },
    { semana: 30, inferior: 24.5, superior: 28.9 },
    { semana: 34, inferior: 25.4, superior: 29.9 },
    { semana: 38, inferior: 26.2, superior: 31.0 },
    { semana: 41, inferior: 26.6, superior: 31.6 },
  ],
  sobrepeso: [
    { semana: 10, inferior: 25.6, superior: 29.0 },
    { semana: 14, inferior: 25.8, superior: 29.2 },
    { semana: 18, inferior: 26.3, superior: 29.7 },
    { semana: 22, inferior: 27.0, superior: 30.4 },
    { semana: 26, inferior: 27.7, superior: 31.3 },
    { semana: 30, inferior: 28.5, superior: 32.1 },
    { semana: 34, inferior: 29.5, superior: 33.2 },
    { semana: 38, inferior: 30.5, superior: 34.3 },
    { semana: 41, inferior: 30.9, superior: 34.9 },
  ],
  obesa: [
    { semana: 10, inferior: 29.0, superior: 36.0 },
    { semana: 14, inferior: 29.2, superior: 36.3 },
    { semana: 18, inferior: 29.7, superior: 36.8 },
    { semana: 22, inferior: 30.4, superior: 37.5 },
    { semana: 26, inferior: 31.3, superior: 38.5 },
    { semana: 30, inferior: 32.1, superior: 39.4 },
    { semana: 34, inferior: 33.2, superior: 40.6 },
    { semana: 38, inferior: 34.3, superior: 42.0 },
    { semana: 41, inferior: 34.9, superior: 42.9 },
  ],
};

function interpolarBanda(bandas: BandaAtalah[], semana: number): { inferior: number; superior: number } {
  if (semana <= bandas[0].semana) return { inferior: bandas[0].inferior, superior: bandas[0].superior };
  if (semana >= bandas[bandas.length - 1].semana) {
    const last = bandas[bandas.length - 1];
    return { inferior: last.inferior, superior: last.superior };
  }
  for (let i = 0; i < bandas.length - 1; i++) {
    const a = bandas[i];
    const b = bandas[i + 1];
    if (semana >= a.semana && semana <= b.semana) {
      const t = (semana - a.semana) / (b.semana - a.semana);
      return {
        inferior: a.inferior + t * (b.inferior - a.inferior),
        superior: a.superior + t * (b.superior - a.superior),
      };
    }
  }
  return { inferior: bandas[0].inferior, superior: bandas[0].superior };
}

/**
 * Devuelve los límites inferior y superior de la banda Atalah para una semana dada.
 * Útil para graficar las curvas de referencia.
 */
export function getBandaLimites(
  imcPregestacional: number,
  semana: number,
): { inferior: number; superior: number } {
  const categoria = clasificarIMCPregestacional(imcPregestacional);
  return interpolarBanda(BANDAS[categoria], semana);
}

// ─── Función pública ──────────────────────────────────────────────────────────

/**
 * Clasifica el estado nutricional gestacional según Atalah/MINSAL.
 *
 * @param imcPregestacional  IMC antes del embarazo (o en semana < 12)
 * @param imcActual          IMC en la semana de evaluación
 * @param semana             Semana gestacional (10–41)
 */
export function clasificarGestacional(
  imcPregestacional: number,
  imcActual: number,
  semana: number,
): ClasificacionGestacional {
  const categoria = clasificarIMCPregestacional(imcPregestacional);
  const bandas = BANDAS[categoria];
  const { inferior, superior } = interpolarBanda(bandas, semana);

  let estado: ClasificacionGestacional['estado'];
  if (imcActual < inferior) {
    estado = 'bajo_peso';
  } else if (imcActual <= superior) {
    estado = categoria === 'normal'    ? 'normal'
           : categoria === 'sobrepeso' ? 'sobrepeso'
           : categoria === 'obesa'     ? 'obesa'
           : 'normal';
  } else {
    // Por encima del límite superior → un nivel más
    estado = categoria === 'enflaquecida' ? 'normal'
           : categoria === 'normal'       ? 'sobrepeso'
           : 'obesa';
  }

  const DESCRIPCIONES: Record<ClasificacionGestacional['estado'], string> = {
    bajo_peso: 'Bajo peso gestacional',
    normal:    'Estado nutricional normal',
    sobrepeso: 'Sobrepeso gestacional',
    obesa:     'Obesidad gestacional',
  };

  return {
    categoria,
    imcActual,
    semana,
    estado,
    rangoGananciaTotal: GANANCIA_TOTAL[categoria],
    descripcion: DESCRIPCIONES[estado],
  };
}

/**
 * Calcula semana gestacional aproximada a partir de FUR (fecha última regla).
 * @param fur Fecha última regla, ISO string "YYYY-MM-DD"
 * @param hoy Fecha de evaluación, ISO string "YYYY-MM-DD" (default: hoy en Santiago)
 */
export function calcularSemanaGestacional(fur: string, hoy?: string): number {
  const furDate = new Date(fur);
  const hoyDate = hoy ? new Date(hoy) : new Date();
  const diffMs = hoyDate.getTime() - furDate.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDias / 7);
}
