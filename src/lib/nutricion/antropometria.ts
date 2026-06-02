/**
 * src/lib/nutricion/antropometria.ts
 *
 * Funciones puras para cálculos antropométricos y nutricionales.
 * Clasificaciones según OMS (IMC) y criterios ATP-III / IDF (circunferencia cintura).
 *
 * Este módulo es server-safe: no importa nada de React ni de Next.js.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constantes — rangos fisiológicos válidos
// ─────────────────────────────────────────────────────────────────────────────

const PESO_MIN_KG = 1;
const PESO_MAX_KG = 500;
const TALLA_MIN_CM = 50;
const TALLA_MAX_CM = 250;
const CINTURA_MIN_CM = 30;
const CINTURA_MAX_CM = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoIMC {
  /** IMC calculado, redondeado a 2 decimales */
  imc: number;
  /** Clasificación OMS */
  clasificacion: string;
  /** Descripción de riesgo cardiometabólico, si aplica */
  riesgoCardiometabolico?: string;
}

export interface ResultadoAntropometria {
  imc?: ResultadoIMC;
  /** Clasificación de riesgo basada en circunferencia de cintura */
  riesgoCircunferencia?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function clasificacionOMS(imc: number): string {
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25)   return "Normal";
  if (imc < 30)   return "Sobrepeso";
  if (imc < 35)   return "Obesidad I";
  if (imc < 40)   return "Obesidad II";
  return "Obesidad III";
}

function riesgoCardiometabolicoPorIMC(imc: number): string | undefined {
  if (imc >= 30) return "Riesgo cardiometabólico elevado";
  if (imc >= 25) return "Riesgo cardiometabólico aumentado";
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones exportadas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el Índice de Masa Corporal (IMC) y devuelve clasificación OMS.
 *
 * @param pesoKg  - Peso en kilogramos (rango válido: 1–500)
 * @param tallaCm - Talla en centímetros (rango válido: 50–250)
 * @returns ResultadoIMC o null si algún parámetro está fuera de rango fisiológico
 */
export function calcularIMC(pesoKg: number, tallaCm: number): ResultadoIMC | null {
  if (
    !Number.isFinite(pesoKg)  || pesoKg  < PESO_MIN_KG  || pesoKg  > PESO_MAX_KG ||
    !Number.isFinite(tallaCm) || tallaCm < TALLA_MIN_CM  || tallaCm > TALLA_MAX_CM
  ) {
    return null;
  }

  const tallaM = tallaCm / 100;
  const imc = redondear2(pesoKg / (tallaM * tallaM));
  const clasificacion = clasificacionOMS(imc);
  const riesgoCardiometabolico = riesgoCardiometabolicoPorIMC(imc);

  return { imc, clasificacion, ...(riesgoCardiometabolico ? { riesgoCardiometabolico } : {}) };
}

/**
 * Clasifica el riesgo cardiovascular según circunferencia de cintura.
 *
 * Umbrales OMS / ATP-III:
 *   Mujeres (F): >80 cm → riesgo ligeramente aumentado; >88 cm → riesgo aumentado
 *   Hombres (M): >94 cm → riesgo ligeramente aumentado; >102 cm → riesgo aumentado
 *   Sin sexo: se usan valores masculinos (M) como referencia conservadora.
 *
 * @param circunferenciaCm - Circunferencia de cintura en centímetros (rango válido: 30–200)
 * @param sexo             - "M" (masculino) | "F" (femenino) — opcional
 * @returns String con la clasificación de riesgo
 */
export function clasificarCircunferenciaCintura(
  circunferenciaCm: number,
  sexo?: "M" | "F",
): string {
  if (
    !Number.isFinite(circunferenciaCm) ||
    circunferenciaCm < CINTURA_MIN_CM  ||
    circunferenciaCm > CINTURA_MAX_CM
  ) {
    return "Valor fuera de rango fisiológico";
  }

  // Umbrales por sexo
  const esFemenino = sexo === "F";
  const umbralAlto          = esFemenino ? 88 : 102;
  const umbralLigeramenteAlto = esFemenino ? 80 : 94;
  const sufijo = sexo ? "" : " (referencia masculina — informar sexo para mayor precisión)";

  if (circunferenciaCm > umbralAlto) {
    return `Riesgo aumentado${sufijo}`;
  }
  if (circunferenciaCm > umbralLigeramenteAlto) {
    return `Riesgo ligeramente aumentado${sufijo}`;
  }
  return `Sin riesgo aumentado${sufijo}`;
}

/**
 * Calcula indicadores antropométricos disponibles según los parámetros proporcionados.
 *
 * @param params.pesoKg                 - Peso en kg (opcional)
 * @param params.tallaCm                - Talla en cm (opcional)
 * @param params.circunferenciaCinturaCm - Circunferencia de cintura en cm (opcional)
 * @param params.sexo                   - "M" | "F" (opcional)
 * @returns ResultadoAntropometria con los campos calculados disponibles
 */
export function calcularAntropometria(params: {
  pesoKg?: number;
  tallaCm?: number;
  circunferenciaCinturaCm?: number;
  sexo?: "M" | "F";
}): ResultadoAntropometria {
  const resultado: ResultadoAntropometria = {};

  if (params.pesoKg !== undefined && params.tallaCm !== undefined) {
    const imcResult = calcularIMC(params.pesoKg, params.tallaCm);
    if (imcResult !== null) {
      resultado.imc = imcResult;
    }
  }

  if (params.circunferenciaCinturaCm !== undefined) {
    resultado.riesgoCircunferencia = clasificarCircunferenciaCintura(
      params.circunferenciaCinturaCm,
      params.sexo,
    );
  }

  return resultado;
}
