/**
 * Formato de nota de un encuentro de rehabilitación: SOAP o nota clínica simple.
 * Funciones puras (server-safe, sin imports de React/Next).
 */

export type FormatoNota = "soap" | "nota_clinica";

export const COOKIE_FORMATO_NOTA = "fce_formato_nota";

export function esFormatoNota(v: unknown): v is FormatoNota {
  return v === "soap" || v === "nota_clinica";
}

export interface ResolverFormatoInput {
  permiteNotaSimple: boolean;
  /** Existe fila en fce_notas_soap para el encuentro */
  tieneSoap: boolean;
  /** Existe fila en fce_notas_clinicas para el encuentro */
  tieneNotaClinica: boolean;
  /** ?formato= de la URL (elección explícita para este encuentro) */
  formatoUrl?: string | null;
  /** Preferencia guardada del profesional (cookie) */
  preferencia?: string | null;
}

export interface FormatoResuelto {
  formato: FormatoNota;
  /** true si ya hay una nota guardada → el formato no se puede cambiar */
  bloqueado: boolean;
}

/**
 * Prioridad: nota ya existente (bloquea) > URL > preferencia > SOAP.
 * Si la especialidad no permite nota simple, siempre SOAP salvo que ya exista nota clínica (dato legado).
 */
export function resolverFormatoNota(i: ResolverFormatoInput): FormatoResuelto {
  if (i.tieneSoap) return { formato: "soap", bloqueado: true };
  if (i.tieneNotaClinica) return { formato: "nota_clinica", bloqueado: true };
  if (!i.permiteNotaSimple) return { formato: "soap", bloqueado: false };
  if (esFormatoNota(i.formatoUrl)) return { formato: i.formatoUrl, bloqueado: false };
  if (esFormatoNota(i.preferencia)) return { formato: i.preferencia, bloqueado: false };
  return { formato: "soap", bloqueado: false };
}
