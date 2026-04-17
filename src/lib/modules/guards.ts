/**
 * Guards para bloquear acceso a rutas y server actions si el módulo está inactivo.
 *
 * Usar requireModule() en Server Components (page.tsx, layout.tsx).
 * Usar assertModuleEnabled() en Server Actions (retorna ActionResult).
 */

import { notFound } from "next/navigation";
import type { ModuleId, EspecialidadId } from "./registry";
import type { ClinicaConfig } from "./config";
import { isModuleEnabled, isEspecialidadEnabled } from "./config";

// ============================================================================
// TIPO ACTION RESULT (espejo del proyecto)
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// GUARD PARA SERVER COMPONENTS
// ============================================================================

/**
 * Si el módulo NO está activo para esta clínica, llama notFound() → 404.
 * Si la config es null (clínica sin config), también notFound() por seguridad.
 *
 * Usar al inicio de page.tsx/layout.tsx:
 *   requireModule(config, "M2_anamnesis");
 */
export function requireModule(config: ClinicaConfig | null, moduleId: ModuleId): void {
  if (!config) {
    notFound();
  }
  if (!isModuleEnabled(config, moduleId)) {
    notFound();
  }
}

/**
 * Igual que requireModule, pero para especialidades.
 */
export function requireEspecialidad(
  config: ClinicaConfig | null,
  especialidadId: EspecialidadId
): void {
  if (!config) {
    notFound();
  }
  if (!isEspecialidadEnabled(config, especialidadId)) {
    notFound();
  }
}

// ============================================================================
// GUARD PARA SERVER ACTIONS
// ============================================================================

/**
 * Version no-throwing para server actions. Retorna ActionResult<never> con error,
 * o ActionResult<true> si el módulo está habilitado.
 *
 * Usar al inicio de una server action:
 *   const gate = assertModuleEnabled(config, "M4_soap");
 *   if (!gate.success) return gate;
 */
export function assertModuleEnabled(
  config: ClinicaConfig | null,
  moduleId: ModuleId
): ActionResult<true> {
  if (!config) {
    return {
      success: false,
      error: "No se encontró configuración de clínica. Contacta al administrador.",
    };
  }
  if (!isModuleEnabled(config, moduleId)) {
    return {
      success: false,
      error: `El módulo ${moduleId} no está habilitado para esta clínica.`,
    };
  }
  return { success: true, data: true };
}

/**
 * Version para especialidades.
 */
export function assertEspecialidadEnabled(
  config: ClinicaConfig | null,
  especialidadId: EspecialidadId
): ActionResult<true> {
  if (!config) {
    return {
      success: false,
      error: "No se encontró configuración de clínica.",
    };
  }
  if (!isEspecialidadEnabled(config, especialidadId)) {
    return {
      success: false,
      error: `La especialidad ${especialidadId} no está habilitada para esta clínica.`,
    };
  }
  return { success: true, data: true };
}
