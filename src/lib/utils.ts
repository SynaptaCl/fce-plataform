import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { edadEnAnios, esFechaSinHora, parseDateOnly } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRut(run: string | null | undefined): string {
  if (!run) return "—";
  const clean = run.replace(/[^0-9kK]/g, "");
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

export function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function formatDate(date: Date | string): string {
  // "YYYY-MM-DD" se trata como fecha de calendario (sin conversión de zona).
  const d =
    typeof date === "string"
      ? esFechaSinHora(date)
        ? (parseDateOnly(date) as Date)
        : new Date(date)
      : date;
  return d.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Fecha corta es-CL: "martes 25 de octubre" (para títulos y metadata).
 * "YYYY-MM-DD" se trata como fecha de calendario (sin conversión de zona).
 */
export function formatDateShort(date: Date | string): string {
  const d =
    typeof date === "string"
      ? esFechaSinHora(date)
        ? (parseDateOnly(date) as Date)
        : new Date(date)
      : date;
  const sinAnio = d.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return sinAnio;
}

/**
 * "YYYY-MM-DD" de la fecha actual en TZ America/Santiago, con offset en días.
 * Offset 0 = hoy, 1 = mañana. Se usa en todo el FCE para evitar el desfase
 * de medianoche entre el servidor (UTC) y Chile (UTC-3/UTC-4).
 */
export function fechaCL(offsetDias = 0): string {
  const base = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  const d = new Date(`${base}T12:00:00Z`); // mediodía UTC: estable ante DST
  d.setUTCDate(d.getUTCDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" actual en TZ Santiago, comparable lexicográficamente con horas de agenda. */
export function horaCL(): string {
  return new Date().toLocaleTimeString("sv-SE", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** true si el string es una fecha "YYYY-MM-DD" válida. */
export function esFechaISOValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  if (typeof birthDate === "string") return edadEnAnios(birthDate);
  const iso = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`;
  return edadEnAnios(iso);
}

/**
 * Escapa caracteres HTML especiales. Usado para construir HTML desde texto plano
 * (ej: convertir output de IA en párrafos sin abrir vectores XSS).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Extrae texto plano de HTML rich-text. Usado para:
 * - Input a modelos IA (Resumen, Copiloto)
 * - Previews en cards del Timeline
 * - Búsquedas y exports planos
 *
 * Maneja texto plano legacy sin tocar.
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  // Si no tiene tags, devolver tal cual (texto legacy)
  if (!/<[^>]+>/.test(value)) return value;
  return value
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Detecta si un string contiene HTML rich-text de la whitelist clínica.
 * Distingue contenido legacy (texto plano) de contenido nuevo (HTML del editor RTE).
 * Pure regex — sin dependencias de DOM, usable en cliente y servidor.
 */
export function isRichTextHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<(p|strong|em|u|ul|ol|li|h2|h3|blockquote|br)\b/i.test(value);
}

/**
 * Convierte texto plano (ej: output del copiloto IA) en HTML rich-text simple.
 * Cada bloque separado por línea en blanco se vuelve un <p>; los saltos simples
 * se vuelven <br>. El texto se escapa para evitar inyección.
 */
export function textoPlanoAHtml(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .split(/\n\n+/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean)
    .map((parrafo) => `<p>${escapeHtml(parrafo).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
