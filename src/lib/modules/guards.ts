/**
 * Guards para bloquear acceso a rutas y server actions si el módulo está inactivo
 * o si el rol no tiene permisos suficientes.
 */

import { notFound, redirect } from "next/navigation";
import type { ModuleId, EspecialidadCodigo, Rol } from "./registry";
import { ROLES_CON_ACCESO_FCE, ROLES_QUE_PUEDEN_ESCRIBIR, ROLES_QUE_PUEDEN_FIRMAR, ROLES_QUE_CONFIGURAN } from "./registry";
import type { ClinicaConfig } from "./config";
import { isModuleEnabled, isEspecialidadEnabled } from "./config";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
