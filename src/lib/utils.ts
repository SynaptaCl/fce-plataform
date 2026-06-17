import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
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
