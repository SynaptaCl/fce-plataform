import { createHash } from "node:crypto";

/**
 * Fase 0 hotfix M5 — validación de firma y huella criptográfica de consentimientos.
 *
 * Server-side únicamente (node:crypto). Usado por:
 *  - src/app/actions/consentimiento.ts (signConsentimiento — M5)
 *  - src/app/actions/ambient/consentimiento.ts (crearConsentimientoGrabacionPresencial — AMB-1)
 *  - scripts/test-m5-consentimientos.ts (tests)
 *
 * La huella reemplaza el "hash" aleatorio anterior (Date.now + Math.random, T2/T3
 * de la auditoría): era cosmético, no vinculaba contenido ni firma. No hay datos
 * legacy — fce_consentimientos tiene 0 filas firmadas a 2026-09-21, así que no
 * se necesita fallback ni verificación de huellas viejas.
 */

// ── Validación de la firma (canvas → dataURL PNG) ───────────────────────────

const FIRMA_PREFIX = "data:image/png;base64,";
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Mínimo razonable para rechazar canvas vacío: un canvas 600×180 completamente
 * en blanco comprime a <2 KB decodificados (PNG de fondo transparente uniforme);
 * cualquier trazo real de firma supera ese umbral con amplio margen.
 */
export const FIRMA_MIN_BYTES = 2_000;

/** Máximo razonable para un PNG 600×180 con firma: evita payloads gigantes en jsonb. */
export const FIRMA_MAX_BYTES = 500_000;

export type ValidacionFirma =
  | { ok: true; bytes: number }
  | { ok: false; error: string };

export function validarFirmaDataUrl(dataUrl: unknown): ValidacionFirma {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(FIRMA_PREFIX)) {
    return {
      ok: false,
      error: "La firma debe ser una imagen PNG generada por el pad de firma.",
    };
  }
  const b64 = dataUrl.slice(FIRMA_PREFIX.length);
  if (b64.length === 0 || !BASE64_RE.test(b64)) {
    return { ok: false, error: "Firma inválida." };
  }
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes < FIRMA_MIN_BYTES) {
    return {
      ok: false,
      error: "La firma está vacía. Solicite al paciente que firme nuevamente.",
    };
  }
  if (bytes > FIRMA_MAX_BYTES) {
    return {
      ok: false,
      error: "La firma excede el tamaño máximo permitido.",
    };
  }
  return { ok: true, bytes };
}

// ── Huella SHA-256 del consentimiento ───────────────────────────────────────

export interface InputHashConsentimiento {
  tipo: string;
  contenido: string;
  id_paciente: string;
  id_clinica: string | null;
  firma_paciente: { data_url: string; timestamp: string };
}

/**
 * Contenido canónico — ORDEN DE CONCATENACIÓN (documentado, T3):
 *
 *   tipo|contenido|id_paciente|id_clinica|firma_paciente.data_url|firma_paciente.timestamp
 *
 * - Separador: "|" (pipe).
 * - id_clinica null (no debería ocurrir en filas nuevas) se serializa como "".
 * - La huella se calcula server-side con los valores LEÍDOS DE LA DB (no de input
 *   del cliente), por lo que cubre exactamente lo que queda almacenado y lo que
 *   protege el trigger de inmutabilidad.
 * - NO cambiar este orden sin una estrategia de versionado de huellas: rompe la
 *   verificabilidad de toda huella ya emitida.
 */
export function canonicalizarConsentimiento(i: InputHashConsentimiento): string {
  return [
    i.tipo,
    i.contenido,
    i.id_paciente,
    i.id_clinica ?? "",
    i.firma_paciente.data_url,
    i.firma_paciente.timestamp,
  ].join("|");
}

/** Huella SHA-256 (hex, 64 caracteres) del contenido canónico del consentimiento. */
export function hashConsentimiento(i: InputHashConsentimiento): string {
  return createHash("sha256").update(canonicalizarConsentimiento(i), "utf8").digest("hex");
}
