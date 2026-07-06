/**
 * Guards para bloquear acceso a rutas y server actions si el módulo está inactivo
 * o si el rol no tiene permisos suficientes.
 */

import { notFound, redirect } from "next/navigation";
import type { ModuleId, EspecialidadCodigo, Rol } from "./registry";
import { ROLES_CON_ACCESO_FCE, ROLES_QUE_PUEDEN_ESCRIBIR, ROLES_QUE_PUEDEN_FIRMAR, ROLES_QUE_CONFIGURAN } from "./registry";
import type { ClinicaConfig } from "./config";
import { isModuleEnabled, isEspecialidadEnabled } from "./config";
import { log } from "@/lib/logger";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const GENERIC_DB_ERROR = "Ocurrió un error al procesar la solicitud";

/** Mapea errores de negocio conocidos a mensajes humanizados; null si no aplica. */
function mapKnownDbError(error: unknown): string | null {
  const e = error as { code?: string; message?: string } | null;
  if (!e || typeof e !== "object") return null;
  // 23505 = unique_violation en Postgres.
  if (e.code === "23505") {
    if (typeof e.message === "string" && /rut/i.test(e.message)) {
      return "Ya existe un paciente con este RUT.";
    }
    return "Ya existe un registro con estos datos.";
  }
  return null;
}

/**
 * Retorno de error estándar para Server Actions: NUNCA expone el mensaje raw de
 * Postgres/PostgREST al cliente (evita recon del schema multi-tenant). El detalle
 * se envía solo a log() server-side. Usa ctx SOLO con UUIDs — nunca PII (sección 22).
 */
export function dbError<T = never>(
  action: string,
  error: unknown,
  ctx?: Record<string, unknown>
): ActionResult<T> {
  log("error", { action, error, ...ctx });
  return { success: false, error: mapKnownDbError(error) ?? GENERIC_DB_ERROR };
}

// ============================================================================
// GUARDS PARA SERVER COMPONENTS (page.tsx, layout.tsx)
// ============================================================================

export function requireModule(config: ClinicaConfig | null, moduleId: ModuleId): void {
  if (!config) notFound();
  if (!isModuleEnabled(config, moduleId)) notFound();
}

export function requireEspecialidad(
  config: ClinicaConfig | null,
  especialidad: EspecialidadCodigo
): void {
  if (!config) notFound();
  if (!isEspecialidadEnabled(config, especialidad)) notFound();
}

/**
 * Redirige al login si el rol no puede acceder al FCE.
 * Recepcionista no tiene acceso (queda en agenda/pagos/chat que viven en otro repo).
 */
export function requireAccesoFCE(rol: Rol | null): void {
  if (!rol || !ROLES_CON_ACCESO_FCE.includes(rol)) {
    redirect("/login?error=sin-acceso");
  }
}

// ============================================================================
// GUARDS PARA SERVER ACTIONS (retornan ActionResult)
// ============================================================================

export function assertModuleEnabled(
  config: ClinicaConfig | null,
  moduleId: ModuleId
): ActionResult<true> {
  if (!config) {
    return { success: false, error: "No se encontró configuración FCE de la clínica." };
  }
  if (!isModuleEnabled(config, moduleId)) {
    return { success: false, error: `El módulo ${moduleId} no está habilitado para esta clínica.` };
  }
  return { success: true, data: true };
}

export function assertEspecialidadEnabled(
  config: ClinicaConfig | null,
  especialidad: EspecialidadCodigo
): ActionResult<true> {
  if (!config) {
    return { success: false, error: "No se encontró configuración FCE de la clínica." };
  }
  if (!isEspecialidadEnabled(config, especialidad)) {
    return {
      success: false,
      error: `La especialidad ${especialidad} no está habilitada para esta clínica.`,
    };
  }
  return { success: true, data: true };
}

export function assertPuedeEscribir(rol: Rol | null): ActionResult<true> {
  if (!rol || !ROLES_QUE_PUEDEN_ESCRIBIR.includes(rol)) {
    return { success: false, error: "Tu rol no permite escribir en el FCE." };
  }
  return { success: true, data: true };
}

export function assertPuedeFirmar(rol: Rol | null): ActionResult<true> {
  if (!rol || !ROLES_QUE_PUEDEN_FIRMAR.includes(rol)) {
    return { success: false, error: "Solo profesionales pueden firmar notas SOAP." };
  }
  return { success: true, data: true };
}

export function assertPuedeConfigurar(rol: Rol | null): ActionResult<true> {
  if (!rol || !ROLES_QUE_CONFIGURAN.includes(rol)) {
    return { success: false, error: "Solo admin, director o superadmin pueden editar configuración." };
  }
  return { success: true, data: true };
}

export function requireModuloEgresos(config: ClinicaConfig | null): void {
  requireModule(config, "M9_egresos");
}

export function requirePresupuestos(config: ClinicaConfig | null): ActionResult<true> {
  return assertModuleEnabled(config, "M11_presupuestos");
}

export function requireInformes(config: ClinicaConfig | null): ActionResult<true> {
  return assertModuleEnabled(config, "M12_informes");
}
