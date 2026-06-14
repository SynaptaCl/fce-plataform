import DOMPurify from "isomorphic-dompurify";

const CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h2", "h3", "blockquote"],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

/**
 * Sanitiza HTML rich-text de notas clínicas.
 * Whitelist estricta. Sin atributos. Sin scripts. Sin estilos inline.
 * Llamar SIEMPRE en server actions antes de INSERT/UPDATE.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, CONFIG);
}

/**
 * Verifica si un string parece HTML (tiene tags balanceados de la whitelist).
 * Útil para detectar legacy text plain vs HTML nuevo en consumidores.
 */
export function isRichTextHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<(p|strong|em|u|ul|ol|li|h2|h3|blockquote|br)\b/i.test(value);
}
