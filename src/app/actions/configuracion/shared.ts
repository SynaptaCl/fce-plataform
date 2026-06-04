/**
 * Helpers puros para el módulo de configuración de profesionales.
 * Sin "use server" — no hay imports de Next.js ni DB aquí.
 */

import type { ActionResult } from "@/lib/modules/guards";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";

// ── Catálogo de tipos de registro ─────────────────────────────────────────────

export const TIPOS_REGISTRO = [
  "RNPI",
  "Colegio Kinesiólogos",
  "Colegio Médico",
  "Colegio Odontólogos",
  "Colegio Psicólogos",
  "Otro",
] as const;

export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

// ── Helpers de autorización ───────────────────────────────────────────────────

/**
 * Retorna true solo si el rol puede gestionar configuración de la clínica.
 * Roles autorizados: superadmin, director, admin.
 */
export function puedeGestionarConfiguracion(rol: string | null): boolean {
  if (!rol) return false;
  return (ROLES_QUE_CONFIGURAN as string[]).includes(rol);
}

// ── Whitelist de campos editables ─────────────────────────────────────────────

/**
 * Extrae SOLO los campos que un admin puede editar en un profesional.
 * Nunca incluye: puede_prescribir, puede_indicar_examenes, especialidad, auth_id.
 */
export function filtrarCamposEditables(
  datos: Record<string, unknown>
): {
  nombre?: string;
  numero_registro?: string | null;
  tipo_registro?: string | null;
  activo?: boolean;
} {
  const resultado: {
    nombre?: string;
    numero_registro?: string | null;
    tipo_registro?: string | null;
    activo?: boolean;
  } = {};

  if ("nombre" in datos && typeof datos.nombre === "string") {
    resultado.nombre = datos.nombre;
  }
  if ("numero_registro" in datos) {
    const v = datos.numero_registro;
    if (v === null || v === undefined || typeof v === "string") {
      resultado.numero_registro = (v ?? null) as string | null;
    }
  }
  if ("tipo_registro" in datos) {
    const v = datos.tipo_registro;
    if (v === null || v === undefined || typeof v === "string") {
      resultado.tipo_registro = (v ?? null) as string | null;
    }
  }
  if ("activo" in datos && typeof datos.activo === "boolean") {
    resultado.activo = datos.activo;
  }

  return resultado;
}

// ── Validaciones ──────────────────────────────────────────────────────────────

const NUMERO_REGISTRO_MAX = 50;
const NUMERO_REGISTRO_PATTERN = /^[a-zA-Z0-9\-_./ ]+$/;

/**
 * Valida el número de registro profesional.
 * - null/undefined/vacío: válido (campo opcional)
 * - Máx 50 caracteres
 * - Solo letras, números, guiones, guiones bajos, puntos, barras, espacios
 */
export function validarNumeroRegistro(
  valor: string | null | undefined
): ActionResult<true> {
  if (valor === null || valor === undefined || valor === "") {
    return { success: true, data: true };
  }
  if (valor.length > NUMERO_REGISTRO_MAX) {
    return {
      success: false,
      error: `El número de registro no puede superar ${NUMERO_REGISTRO_MAX} caracteres.`,
    };
  }
  if (!NUMERO_REGISTRO_PATTERN.test(valor)) {
    return {
      success: false,
      error:
        "El número de registro solo puede contener letras, números, guiones, guiones bajos, puntos, barras y espacios.",
    };
  }
  return { success: true, data: true };
}

/**
 * Valida el tipo de registro.
 * - null/undefined: válido (campo opcional)
 * - Debe pertenecer a TIPOS_REGISTRO si se proporciona
 */
export function validarTipoRegistro(
  valor: string | null | undefined
): ActionResult<true> {
  if (valor === null || valor === undefined) {
    return { success: true, data: true };
  }
  if (!(TIPOS_REGISTRO as readonly string[]).includes(valor)) {
    return {
      success: false,
      error: `Tipo de registro inválido: "${valor}".`,
    };
  }
  return { success: true, data: true };
}
