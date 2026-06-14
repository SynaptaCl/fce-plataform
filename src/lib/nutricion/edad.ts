/**
 * src/lib/nutricion/edad.ts
 *
 * Helper puro para calcular edad detallada (años, meses, días) y el total en
 * meses completos que usa la fórmula LMS de la OMS para z-score pediátrico.
 *
 * Módulo server-safe: sin imports React/Next.js.
 * Usando date-fns para cálculo exacto con manejo de meses irregulares.
 */

import {
  differenceInYears, differenceInMonths, differenceInDays,
  addYears, addMonths, startOfDay,
} from 'date-fns';

export interface EdadDetallada {
  años: number;
  meses: number;
  dias: number;
  /** Meses completos desde nacimiento — fuente única de verdad para z-score OMS */
  mesesTotal: number;
  /** Etiqueta legible: "5 años, 4 meses y 1 día". Componentes en cero se omiten. */
  label: string;
}

/**
 * Calcula la edad exacta entre fechaNacimiento y fechaReferencia (default: hoy).
 *
 * Para snapshot histórico pasar la fecha del registro como referencia, NO new Date().
 * Una sola fuente de verdad para mesesTotal → usar aquí en vez de differenceInMonths sueltos.
 *
 * ⚠️ Pasar fechas a medianoche local para evitar artefactos de DST en differenceInDays.
 * Usar parseISO() de date-fns para strings "YYYY-MM-DD" (crea medianoche local),
 * NO new Date("YYYY-MM-DD") (que crea medianoche UTC y diverge en zonas con DST).
 */
export function calcularEdad(
  fechaNacimiento: Date,
  fechaReferencia?: Date,
): EdadDetallada {
  // Normalizar a medianoche local — elimina artefactos de DST en addMonths/differenceInDays
  const nac = startOfDay(fechaNacimiento);
  const ref = startOfDay(fechaReferencia ?? new Date());

  // mesesTotal para OMS — cálculo directo
  const mesesTotal = differenceInMonths(ref, nac);

  // Descomponer en años, meses residuales, días residuales
  const años = differenceInYears(ref, nac);
  const despuesAnios = addYears(nac, años);
  const meses = differenceInMonths(ref, despuesAnios);
  const despuesMeses = addMonths(despuesAnios, meses);
  const dias = differenceInDays(ref, despuesMeses);

  // Construir label — omitir componentes en cero
  const partes: string[] = [];
  if (años > 0) partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);

  let label: string;
  if (partes.length === 0) {
    label = '0 días';
  } else if (partes.length === 1) {
    label = partes[0];
  } else if (partes.length === 2) {
    label = `${partes[0]} y ${partes[1]}`;
  } else {
    label = `${partes[0]}, ${partes[1]} y ${partes[2]}`;
  }

  return { años, meses, dias, mesesTotal, label };
}
