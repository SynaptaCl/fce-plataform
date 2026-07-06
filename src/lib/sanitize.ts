import sanitizeHtml from "sanitize-html";
import { isRichTextHtml } from "@/lib/utils";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h2", "h3", "blockquote"],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/**
 * Recorre recursivamente un valor jsonb (objeto/array/string) y sanitiza cada string.
 * Solo se toca lo que parece HTML (isRichTextHtml) — el texto plano se deja intacto para
 * no HTML-encodear campos clínicos normales. Usar en el write-path de columnas jsonb con
 * texto libre (p.ej. fce_evaluaciones.data) antes de INSERT/UPDATE.
 */
export function sanitizeJsonbStrings<T>(value: T): T {
  if (typeof value === "string") {
    return (isRichTextHtml(value) ? sanitizeRichText(value) : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeJsonbStrings(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeJsonbStrings(v);
    }
    return out as T;
  }
  return value;
}
