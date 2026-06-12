/**
 * src/lib/nutricion/pliegues.ts
 *
 * Fórmulas para estimación de composición corporal por pliegues cutáneos.
 * Módulo server-safe: sin imports React/Next.js.
 *
 * Fórmulas implementadas:
 *   - Durnin-Womersley (1974) — 4 pliegues, adultos ambos sexos
 *   - Jackson-Pollock 3 sitios (1978/1980) — sitios distintos por sexo
 *   - Jackson-Pollock 7 sitios (1978) — 7 sitios, adultos/atletas
 *   - Faulkner (1968) — 4 pliegues, cálculo directo de %grasa
 *
 * Conversión densidad → %grasa: ecuación de Siri (1956).
 *   %grasa = (4.95 / D − 4.50) × 100
 *
 * ⚠️ Requiere validación clínica por nutricionista antes de uso en producción.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FormulaId =
  | 'durnin_womersley'
  | 'jackson_pollock_3'
  | 'jackson_pollock_7'
  | 'faulkner';

export type SitioPliegue =
  | 'biceps'
  | 'triceps'
  | 'subescapular'
  | 'suprailiaco'
  | 'pecho'
  | 'abdomen'
  | 'muslo'
  | 'axilar_medio';

export const SITIO_LABELS: Record<SitioPliegue, string> = {
  biceps:      'Bíceps',
  triceps:     'Tríceps',
  subescapular:'Subescapular',
  suprailiaco: 'Suprailíaco',
  pecho:       'Pecho',
  abdomen:     'Abdomen',
  muslo:       'Muslo',
  axilar_medio:'Axilar medio',
};

export interface FormulaMetadata {
  id: FormulaId;
  label: string;
  descripcion: string;
  poblacion: string;
  requiereSexo: boolean;
  requiereEdad: boolean;
  sitiosPorSexo: { M: SitioPliegue[]; F: SitioPliegue[] };
}

export const FORMULAS_PLIEGUES: Record<FormulaId, FormulaMetadata> = {
  durnin_womersley: {
    id: 'durnin_womersley',
    label: 'Durnin-Womersley',
    descripcion: 'Bíceps, tríceps, subescapular, suprailíaco',
    poblacion: 'Adultos ambos sexos (17–72 años)',
    requiereSexo: true,
    requiereEdad: true,
    sitiosPorSexo: {
      M: ['biceps', 'triceps', 'subescapular', 'suprailiaco'],
      F: ['biceps', 'triceps', 'subescapular', 'suprailiaco'],
    },
  },
  jackson_pollock_3: {
    id: 'jackson_pollock_3',
    label: 'Jackson-Pollock 3 sitios',
    descripcion: '♂ Pecho, abdomen, muslo  ·  ♀ Tríceps, suprailíaco, muslo',
    poblacion: 'Adultos (18–61 años)',
    requiereSexo: true,
    requiereEdad: true,
    sitiosPorSexo: {
      M: ['pecho', 'abdomen', 'muslo'],
      F: ['triceps', 'suprailiaco', 'muslo'],
    },
  },
  jackson_pollock_7: {
    id: 'jackson_pollock_7',
    label: 'Jackson-Pollock 7 sitios',
    descripcion: 'Pecho, axilar medio, tríceps, subescapular, abdomen, suprailíaco, muslo',
    poblacion: 'Adultos / atletas',
    requiereSexo: true,
    requiereEdad: true,
    sitiosPorSexo: {
      M: ['pecho', 'axilar_medio', 'triceps', 'subescapular', 'abdomen', 'suprailiaco', 'muslo'],
      F: ['pecho', 'axilar_medio', 'triceps', 'subescapular', 'abdomen', 'suprailiaco', 'muslo'],
    },
  },
  faulkner: {
    id: 'faulkner',
    label: 'Faulkner',
    descripcion: 'Tríceps, subescapular, suprailíaco, abdomen',
    poblacion: 'Uso clínico general',
    requiereSexo: false,
    requiereEdad: false,
    sitiosPorSexo: {
      M: ['triceps', 'subescapular', 'suprailiaco', 'abdomen'],
      F: ['triceps', 'subescapular', 'suprailiaco', 'abdomen'],
    },
  },
};

export interface ResultadoPliegues {
  percGrasa: number;
  densidadCorporal: number | null;
  formulaId: FormulaId;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function redondear2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Siri (1956): %grasa = (4.95/D − 4.50) × 100 */
function siri(densidad: number): number {
  return (4.95 / densidad - 4.5) * 100;
}

/** Durnin-Womersley (1974): constantes por sexo y edad. */
function getDWConstantes(sexo: 'M' | 'F', edad: number): { c: number; m: number } {
  if (sexo === 'M') {
    if (edad < 20) return { c: 1.1620, m: 0.0630 };
    if (edad < 30) return { c: 1.1631, m: 0.0632 };
    if (edad < 40) return { c: 1.1422, m: 0.0544 };
    if (edad < 50) return { c: 1.1620, m: 0.0700 };
    return           { c: 1.1715, m: 0.0779 };
  }
  // Female
  if (edad < 20) return { c: 1.1549, m: 0.0678 };
  if (edad < 30) return { c: 1.1599, m: 0.0717 };
  if (edad < 40) return { c: 1.1423, m: 0.0632 };
  if (edad < 50) return { c: 1.1333, m: 0.0612 };
  return           { c: 1.1339, m: 0.0645 };
}

function getSitio(pliegues: Partial<Record<SitioPliegue, number>>, sitio: SitioPliegue): number | null {
  const v = pliegues[sitio];
  return typeof v === 'number' && v > 0 ? v : null;
}

function allSitios(
  pliegues: Partial<Record<SitioPliegue, number>>,
  sitios: SitioPliegue[],
): number[] | null {
  const vals: number[] = [];
  for (const s of sitios) {
    const v = getSitio(pliegues, s);
    if (v === null) return null;
    vals.push(v);
  }
  return vals;
}

// ─── Cálculo Durnin-Womersley ─────────────────────────────────────────────────

function calcDurninWomersley(
  pliegues: Partial<Record<SitioPliegue, number>>,
  sexo: 'M' | 'F',
  edad: number,
): ResultadoPliegues | null {
  const vals = allSitios(pliegues, ['biceps', 'triceps', 'subescapular', 'suprailiaco']);
  if (!vals) return null;
  const suma = vals.reduce((a, b) => a + b, 0);
  if (suma <= 0) return null;

  const { c, m } = getDWConstantes(sexo, edad);
  const densidad = c - m * Math.log10(suma);
  return {
    percGrasa: redondear2(siri(densidad)),
    densidadCorporal: redondear2(densidad),
    formulaId: 'durnin_womersley',
  };
}

// ─── Cálculo Jackson-Pollock 3 ────────────────────────────────────────────────

function calcJP3(
  pliegues: Partial<Record<SitioPliegue, number>>,
  sexo: 'M' | 'F',
  edad: number,
): ResultadoPliegues | null {
  const sitios: SitioPliegue[] = sexo === 'M'
    ? ['pecho', 'abdomen', 'muslo']
    : ['triceps', 'suprailiaco', 'muslo'];
  const vals = allSitios(pliegues, sitios);
  if (!vals) return null;
  const s = vals.reduce((a, b) => a + b, 0);

  let densidad: number;
  if (sexo === 'M') {
    densidad = 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * edad;
  } else {
    densidad = 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * edad;
  }

  return {
    percGrasa: redondear2(siri(densidad)),
    densidadCorporal: redondear2(densidad),
    formulaId: 'jackson_pollock_3',
  };
}

// ─── Cálculo Jackson-Pollock 7 ────────────────────────────────────────────────

function calcJP7(
  pliegues: Partial<Record<SitioPliegue, number>>,
  sexo: 'M' | 'F',
  edad: number,
): ResultadoPliegues | null {
  const sitios: SitioPliegue[] = ['pecho', 'axilar_medio', 'triceps', 'subescapular', 'abdomen', 'suprailiaco', 'muslo'];
  const vals = allSitios(pliegues, sitios);
  if (!vals) return null;
  const s = vals.reduce((a, b) => a + b, 0);

  let densidad: number;
  if (sexo === 'M') {
    densidad = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * edad;
  } else {
    densidad = 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * edad;
  }

  return {
    percGrasa: redondear2(siri(densidad)),
    densidadCorporal: redondear2(densidad),
    formulaId: 'jackson_pollock_7',
  };
}

// ─── Cálculo Faulkner ─────────────────────────────────────────────────────────

function calcFaulkner(
  pliegues: Partial<Record<SitioPliegue, number>>,
): ResultadoPliegues | null {
  const vals = allSitios(pliegues, ['triceps', 'subescapular', 'suprailiaco', 'abdomen']);
  if (!vals) return null;
  const suma = vals.reduce((a, b) => a + b, 0);

  return {
    percGrasa: redondear2(0.153 * suma + 5.783),
    densidadCorporal: null,
    formulaId: 'faulkner',
  };
}

// ─── Función pública ──────────────────────────────────────────────────────────

/**
 * Calcula %grasa corporal y densidad a partir de pliegues cutáneos.
 * Devuelve null si faltan pliegues requeridos o parámetros inválidos.
 *
 * @param formula   - Fórmula a usar
 * @param pliegues  - Valores en mm
 * @param sexo      - Requerido para todas las fórmulas salvo Faulkner
 * @param edad      - Años; requerido para D-W y JP
 */
export function calcularGrasaCorporal(params: {
  formula: FormulaId;
  pliegues: Partial<Record<SitioPliegue, number>>;
  sexo?: 'M' | 'F';
  edad?: number;
}): ResultadoPliegues | null {
  const { formula, pliegues, sexo, edad } = params;

  if (formula === 'faulkner') {
    return calcFaulkner(pliegues);
  }

  if (!sexo || (sexo !== 'M' && sexo !== 'F')) return null;
  if (edad === undefined || edad < 1 || edad > 120) return null;

  switch (formula) {
    case 'durnin_womersley':
      return calcDurninWomersley(pliegues, sexo, edad);
    case 'jackson_pollock_3':
      return calcJP3(pliegues, sexo, edad);
    case 'jackson_pollock_7':
      return calcJP7(pliegues, sexo, edad);
    default:
      return null;
  }
}

/** Masa magra = peso × (1 − %grasa/100) */
export function calcularMasaMagra(pesoKg: number, percGrasa: number): number {
  return Math.round(pesoKg * (1 - percGrasa / 100) * 100) / 100;
}

/** Devuelve los sitios requeridos para una fórmula dado el sexo. */
export function getSitiosRequeridos(formula: FormulaId, sexo: 'M' | 'F'): SitioPliegue[] {
  return FORMULAS_PLIEGUES[formula].sitiosPorSexo[sexo];
}
