// src/lib/dates.ts
// Utilidad central de fechas. Funciones puras, seguras en server y client.
//
// Dos tipos de dato, dos tratamientos:
//  - Columnas `date` ("YYYY-MM-DD", sin hora): fecha de calendario. NUNCA pasar por
//    `new Date("YYYY-MM-DD")` (se interpreta como medianoche UTC y al mostrarla en
//    America/Santiago retrocede un día). Se tratan por componentes (año/mes/día).
//  - Columnas `timestamptz` (ISO con hora): instante. Se muestran en America/Santiago.
//
// El resultado no depende de la zona horaria del proceso (navegador o servidor UTC).

const TZ_CLINICA = "America/Santiago";
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type EstiloFecha = "corta" | "numerica" | "larga";

const OPCIONES: Record<EstiloFecha, Intl.DateTimeFormatOptions> = {
  corta: { day: "2-digit", month: "short", year: "numeric" },
  numerica: { day: "2-digit", month: "2-digit", year: "numeric" },
  larga: { day: "numeric", month: "long", year: "numeric" },
};

/** true si el string es exactamente "YYYY-MM-DD". */
export function esFechaSinHora(s: string | null | undefined): s is string {
  return typeof s === "string" && DATE_ONLY_RE.test(s);
}

/**
 * "YYYY-MM-DD" (o ISO con hora, usando solo la parte de fecha) → Date en medianoche LOCAL.
 * Devuelve null si el valor no es una fecha válida.
 */
export function parseDateOnly(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = DATE_ONLY_RE.exec(s.slice(0, 10));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * Formatea una fecha sin hora ("YYYY-MM-DD") sin conversión de zona.
 * Si el string trae hora, se usa solo su parte de fecha.
 * Devuelve "—" si es nulo o inválido.
 */
export function formatDateOnly(
  s: string | null | undefined,
  estilo: EstiloFecha = "numerica",
): string {
  const d = parseDateOnly(s);
  if (!d) return "—";
  // Se construye en UTC con los componentes locales y se formatea en UTC: sin desfase.
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return utc.toLocaleDateString("es-CL", { ...OPCIONES[estilo], timeZone: "UTC" });
}

/** Formatea un instante (timestamptz / ISO con hora) en America/Santiago. */
export function formatTimestamp(
  iso: string | Date | null | undefined,
  estilo: EstiloFecha = "numerica",
): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { ...OPCIONES[estilo], timeZone: TZ_CLINICA });
}

/**
 * Para campos que pueden ser `date` o `timestamptz` según el origen:
 * decide por forma del string.
 */
export function formatFechaAuto(
  s: string | Date | null | undefined,
  estilo: EstiloFecha = "numerica",
): string {
  if (typeof s === "string" && esFechaSinHora(s)) return formatDateOnly(s, estilo);
  return formatTimestamp(s, estilo);
}

/** Hoy en Santiago como "YYYY-MM-DD". */
export function hoyISO(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("sv-SE", { timeZone: TZ_CLINICA });
}

/**
 * Edad en años cumplidos. `referencia` es "YYYY-MM-DD" (default: hoy en Santiago).
 * Devuelve null si falta o es inválida la fecha de nacimiento.
 */
export function edadEnAnios(
  nacimiento: string | null | undefined,
  referencia?: string,
): number | null {
  const n = parseDateOnly(nacimiento);
  const r = parseDateOnly(referencia ?? hoyISO());
  if (!n || !r) return null;
  let edad = r.getFullYear() - n.getFullYear();
  const antesDeCumple =
    r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate());
  if (antesDeCumple) edad--;
  return edad < 0 ? null : edad;
}
