/**
 * Elimina RUTs chilenos de texto plano antes de enviar a Claude.
 * Debe recibir texto ya procesado con stripHtml() si el campo original es HTML.
 * Patrón: 1-2 dígitos + punto opcional + 3 dígitos + punto opcional + 3 dígitos + guión + dígito verificador
 */
export function sanitizeRutFromText(text: string): string {
  if (!text) return text;
  return text.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/gi, "[RUT]");
}
