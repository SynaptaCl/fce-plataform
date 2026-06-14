/**
 * src/lib/nutricion/zscore.ts
 *
 * Cálculo de z-score y percentil usando la fórmula LMS de la OMS.
 *   z = ((X / M) ^ L − 1) / (L · S)     para L ≠ 0
 *   z = ln(X / M) / S                    para L = 0
 *
 * Corrección WHO para valores extremos (|z| > 3):
 *   SD2pos = M · (1 + L · S · 2) ^ (1/L)
 *   SD3pos = M · (1 + L · S · 3) ^ (1/L)
 *   z* = 3 + (X − SD3pos) / (SD3pos − SD2pos)     si X > SD3pos
 *   (análogo para extremo negativo)
 *
 * Fuente: WHO Software for assessing growth and development of the world's
 *   children. Geneva: WHO; 2011 (https://www.who.int/childgrowth/software/en/)
 *
 * Módulo server-safe: sin imports React/Next.js.
 *
 * ⚠️ Requiere validación clínica por nutricionista antes de uso en producción.
 */

// Datasets estáticos — ver archivos JSON con nota _validation_status
// TODO: cambiar a VALIDADO_<fecha> tras revisión de NTA cuando nutricionista confirme datasets OMS LMS
import bmiBoysO5   from './oms-lms/bmi-boys-0-5.json';
import bmiGirlsO5  from './oms-lms/bmi-girls-0-5.json';
import bmiBoysS19  from './oms-lms/bmi-boys-5-19.json';
import bmiGirlsS19 from './oms-lms/bmi-girls-5-19.json';

export interface LMSEntry {
  age_months: number;
  L: number;
  M: number;
  S: number;
}

export interface LMSDataset {
  _validation_status: string;
  data: LMSEntry[];
}

export interface ResultadoZScore {
  z: number;
  percentil: number;
  clasificacion: string;
}

// ─── CDF normal estándar (Hart, 1968) — precisión 7 decimales ───────────────

function normalCDF(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const poly =
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
  const p = 1 - pdf * poly;
  return z >= 0 ? p : 1 - p;
}

// ─── Interpolación lineal entre dos entradas LMS ─────────────────────────────

function interpolarLMS(a: LMSEntry, b: LMSEntry, ageMths: number): LMSEntry {
  const span = b.age_months - a.age_months;
  if (span === 0) return a;
  const t = (ageMths - a.age_months) / span;
  return {
    age_months: ageMths,
    L: a.L + t * (b.L - a.L),
    M: a.M + t * (b.M - a.M),
    S: a.S + t * (b.S - a.S),
  };
}

/**
 * Devuelve el dataset IMC/edad apropiado según sexo y edad.
 * Combina las tablas 0-5 y 5-19 con el dataset del rango correcto.
 */
export function getBMIDataset(sexo: 'M' | 'F', ageMths: number): LMSEntry[] {
  if (ageMths <= 60) {
    return sexo === 'M' ? (bmiBoysO5.data as LMSEntry[]) : (bmiGirlsO5.data as LMSEntry[]);
  }
  return sexo === 'M' ? (bmiBoysS19.data as LMSEntry[]) : (bmiGirlsS19.data as LMSEntry[]);
}

/**
 * Devuelve el estado de validación del dataset.
 * PENDIENTE_CLINICA = datos representativos, requiere verificación por nutricionista.
 */
export function getDatasetValidationStatus(sexo: 'M' | 'F', ageMths: number): string {
  if (ageMths <= 60) {
    return sexo === 'M' ? bmiBoysO5._validation_status : bmiGirlsO5._validation_status;
  }
  return sexo === 'M' ? bmiBoysS19._validation_status : bmiGirlsS19._validation_status;
}

/** Busca la entrada LMS para la edad dada con interpolación lineal. */
export function getLMS(dataset: LMSEntry[], ageMths: number): LMSEntry | null {
  if (!dataset.length) return null;
  if (ageMths <= dataset[0].age_months) return dataset[0];
  if (ageMths >= dataset[dataset.length - 1].age_months) return dataset[dataset.length - 1];

  for (let i = 0; i < dataset.length - 1; i++) {
    if (ageMths >= dataset[i].age_months && ageMths <= dataset[i + 1].age_months) {
      return interpolarLMS(dataset[i], dataset[i + 1], ageMths);
    }
  }
  return null;
}

// ─── Cálculo z-score LMS ──────────────────────────────────────────────────────

/**
 * Calcula z-score a partir de LMS y el valor medido.
 * Aplica corrección WHO para valores extremos (|z| > 3).
 */
export function calcularZScore(
  valor: number,
  lms: LMSEntry,
): number {
  const { L, M, S } = lms;

  let z: number;
  if (Math.abs(L) < 1e-6) {
    // L ≈ 0: fórmula logarítmica
    z = Math.log(valor / M) / S;
  } else {
    z = (Math.pow(valor / M, L) - 1) / (L * S);
  }

  // Corrección para valores extremos
  if (z > 3) {
    const sd3pos = M * Math.pow(1 + L * S * 3, 1 / L);
    const sd2pos = M * Math.pow(1 + L * S * 2, 1 / L);
    const denom = sd3pos - sd2pos;
    return denom > 0 ? 3 + (valor - sd3pos) / denom : z;
  }
  if (z < -3) {
    const sd3neg = M * Math.pow(1 + L * S * (-3), 1 / L);
    const sd2neg = M * Math.pow(1 + L * S * (-2), 1 / L);
    const denom = sd2neg - sd3neg;
    return denom > 0 ? -3 - (sd3neg - valor) / denom : z;
  }

  return z;
}

/**
 * Clasificación OMS para z-score de IMC/edad (6 categorías).
 * Cortes: z≤-3 severa · z≤-2 desnutrición · z≤+1 normal · z≤+2 sobrepeso · z≤+3 obesidad · >+3 severa
 */
export function clasificarZScoreIMC(z: number): string {
  if (z <= -3) return "Desnutrición severa";
  if (z <= -2) return "Desnutrición";
  if (z <= 1)  return "Normal";
  if (z <= 2)  return "Sobrepeso";
  if (z <= 3)  return "Obesidad";
  return "Obesidad severa";
}

/** True mientras al menos un dataset LMS no haya sido verificado clínicamente. */
export const ZSCORE_PENDIENTE_CLINICA =
  bmiBoysO5._validation_status.startsWith("PENDIENTE") ||
  bmiGirlsO5._validation_status.startsWith("PENDIENTE") ||
  bmiBoysS19._validation_status.startsWith("PENDIENTE") ||
  bmiGirlsS19._validation_status.startsWith("PENDIENTE");

/** Calcula z-score + percentil + clasificación. */
export function calcularIndicadorPediatrico(
  valor: number,
  ageMths: number,
  dataset: LMSEntry[],
): ResultadoZScore | null {
  const lms = getLMS(dataset, ageMths);
  if (!lms) return null;
  if (valor <= 0) return null;

  const z = calcularZScore(valor, lms);
  const percentil = Math.round(normalCDF(z) * 100 * 10) / 10;

  return {
    z: Math.round(z * 100) / 100,
    percentil,
    clasificacion: clasificarZScoreIMC(z),
  };
}
