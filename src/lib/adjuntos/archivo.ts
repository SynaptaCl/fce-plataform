/**
 * ADJ-1 — Helpers puros de archivos para adjuntos clínicos.
 * Sin DB, sin React: testables con tsx directo (scripts/test-sprint-adj1.ts).
 * Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
 */

import type { MimeAdjunto } from "@/types/adjunto";
import { MIMES_ADJUNTO } from "@/types/adjunto";

export const BUCKET_ADJUNTOS = "adjuntos-clinicos";
export const TTL_URL_FIRMADA_SEG = 60 * 10; // 10 minutos (mismo criterio que M13)

export const LIMITE_IMAGEN_BYTES = 8 * 1024 * 1024; // 8 MB
export const LIMITE_PDF_BYTES = 15 * 1024 * 1024; // 15 MB
export const LIMITE_BUCKET_BYTES = LIMITE_PDF_BYTES; // file_size_limit del bucket (defense in depth)

export const MIME_A_EXT: Record<MimeAdjunto, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function esMimePermitido(mime: string): mime is MimeAdjunto {
  return (MIMES_ADJUNTO as string[]).includes(mime);
}

/** Límite de tamaño por MIME (imágenes 8MB, PDF 15MB). Null si el MIME no está permitido. */
export function limiteParaMime(mime: string): number | null {
  if (!esMimePermitido(mime)) return null;
  return mime === "application/pdf" ? LIMITE_PDF_BYTES : LIMITE_IMAGEN_BYTES;
}

// ── Magic bytes ─────────────────────────────────────────────────────────────

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((b, i) => bytes[i] === b);
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.slice(from, to));
}

/**
 * Detecta el tipo real del archivo por su contenido (no por lo que declara el
 * header HTTP). Fuente de verdad del lado servidor: un EXE renombrado a .pdf
 * se detecta aquí.
 */
export function detectarMime(bytes: Uint8Array): MimeAdjunto | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WEBP: contenedor RIFF — bytes 0..3 "RIFF", bytes 8..11 "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // "%PDF-"
  return null;
}

/** Wrapper de compatibilidad: ¿el contenido corresponde al MIME declarado? */
export function magicBytesValidos(bytes: Uint8Array, mime: string): boolean {
  if (!esMimePermitido(mime)) return false;
  return detectarMime(bytes) === mime;
}

// ── Path y nombre de archivo ────────────────────────────────────────────────

/**
 * Path canónico del objeto: `{id_clinica}/{id_paciente}/{uuid}.{ext}`.
 * El primer segmento ES el tenant para las policies RLS de storage.objects —
 * no cambiar el orden. El nombre original del archivo jamás va al path.
 */
export function construirStoragePath(idClinica: string, idPaciente: string, ext: string): string {
  const uuid = globalThis.crypto.randomUUID();
  return `${idClinica}/${idPaciente}/${uuid}.${ext}`;
}

/**
 * Sanitiza el nombre original para display/guardado en DB:
 * - basename (sin path traversal ni directorios)
 * - sin caracteres de control ni puntos iniciales
 * - longitud ≤180
 */
export function sanitizarNombreArchivo(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "";
  const limpio = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^[. ]+/, "")
    .trim()
    .slice(0, 180)
    .trim();
  return limpio.length > 0 ? limpio : "archivo";
}

/** Fecha de hoy (YYYY-MM-DD) en zona Santiago — CLAUDE.md §9. */
export function hoySantiago(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
}
