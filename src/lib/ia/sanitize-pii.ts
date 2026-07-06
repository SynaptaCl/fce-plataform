/**
 * Seudonimización determinística de PII antes de enviar texto a Claude (Ley 21.719).
 *
 * NO usa NER ni regex de nombres genérica. Reemplaza los valores CONOCIDOS del paciente
 * (nombre, apellidos, rut, teléfono, email) por placeholders, más regex genéricas para
 * RUT / teléfono / email de terceros mencionados en la narrativa.
 *
 * Los placeholders ([NOMBRE], [RUT], [TELEFONO], [EMAIL]) viajan al modelo; el output de
 * la IA puede contenerlos y NO debe des-seudonimizarse.
 */

export interface PIIPaciente {
  nombre?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  rut?: string | null;
  telefono?: string | null;
  email?: string | null;
}

const RUT_RE = /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/gi;
// Email estándar.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
// Teléfono chileno: +56 opcional, móvil 9 + 8 dígitos o fijo, separadores flexibles.
const TELEFONO_RE = /(?:\+?56[\s.-]?)?(?:9[\s.-]?\d{4}[\s.-]?\d{4}|\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4})\b/g;

// Clases de equivalencia por vocal/consonante acentuable — matching tolerante a tildes.
const ACCENT_CLASS: Record<string, string> = {
  a: "aáàäâã",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöô",
  u: "uúùüû",
  n: "nñ",
  c: "cç",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS_RE, "");
}

/**
 * Regex tolerante a tildes con límites Unicode (no ASCII \b, que falla con tildes/ñ).
 * Se construye sobre la forma sin acentos y cada letra acentuable se expande a su clase,
 * de modo que matchea el texto original tenga o no tildes.
 */
function nameRegex(value: string): RegExp {
  const base = stripAccents(value.trim());
  let core = "";
  for (const ch of base) {
    if (ch === " ") {
      core += "\\s+";
      continue;
    }
    const lower = ch.toLowerCase();
    if (ACCENT_CLASS[lower]) {
      const cls = ACCENT_CLASS[lower];
      core += `[${cls}${cls.toUpperCase()}]`;
    } else {
      core += escapeRegExp(ch);
    }
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${core}(?![\\p{L}\\p{N}])`, "giu");
}

/** Regex para el teléfono específico del paciente, tolerante a separadores. */
function phoneRegex(phone: string): RegExp | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const core = digits.split("").join("[\\s.\\-()]*");
  return new RegExp(core, "g");
}

/**
 * Elimina RUTs chilenos de texto plano antes de enviar a Claude.
 * Se mantiene como capa genérica (RUTs de terceros) además de la seudonimización por campos.
 */
export function sanitizeRutFromText(text: string): string {
  if (!text) return text;
  return text.replace(RUT_RE, "[RUT]");
}

/**
 * Seudonimiza el texto reemplazando PII del paciente + patrones genéricos.
 * Debe recibir texto ya procesado con stripHtml() si el campo original es HTML.
 */
export function seudonimizarTexto(text: string, pii: PIIPaciente): string {
  if (!text) return text;
  let out = text;

  // 1. Email y teléfono específicos del paciente (antes que las clases genéricas).
  if (pii.email?.trim()) {
    out = out.replace(new RegExp(escapeRegExp(pii.email.trim()), "gi"), "[EMAIL]");
  }
  if (pii.telefono?.trim()) {
    const re = phoneRegex(pii.telefono);
    if (re) out = out.replace(re, "[TELEFONO]");
  }

  // 2. Nombre completo (más específico primero), luego nombre de pila y apellidos ≥4 chars.
  const partes = [pii.nombre, pii.apellido_paterno, pii.apellido_materno]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  const nombreCompleto = partes.join(" ").trim();
  if (nombreCompleto.length >= 4) {
    out = out.replace(nameRegex(nombreCompleto), "[NOMBRE]");
  }
  if (pii.nombre?.trim() && pii.nombre.trim().length >= 3) {
    out = out.replace(nameRegex(pii.nombre.trim()), "[NOMBRE]");
  }
  for (const ap of [pii.apellido_paterno, pii.apellido_materno]) {
    if (ap?.trim() && ap.trim().length >= 4) {
      out = out.replace(nameRegex(ap.trim()), "[NOMBRE]");
    }
  }

  // 3. Patrones genéricos (terceros). RUT antes que teléfono: el formato con "-DV"
  //    es más específico y evita que la regex de teléfono se coma los dígitos del RUT.
  out = out.replace(EMAIL_RE, "[EMAIL]");
  out = out.replace(RUT_RE, "[RUT]");
  out = out.replace(TELEFONO_RE, "[TELEFONO]");

  return out;
}
