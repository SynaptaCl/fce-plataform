/**
 * onboarding-templates/index.ts
 *
 * Definición del tipo ClinicaTemplate y registro de todos los templates
 * disponibles. Cada template describe el conjunto de módulos, especialidades
 * y permisos por defecto para un perfil de clínica común.
 *
 * Los módulos son strings (no ModuleId) porque incluyen sub-módulos como
 * M3b_instrumentos y M4b_nota_clinica que existen en DB pero no en el tipo TS.
 */

// ── Tipo ─────────────────────────────────────────────────────────────────────

export interface PermisosPorEspecialidad {
  puede_prescribir: boolean;
  puede_indicar_examenes: boolean;
}

export interface ClinicaTemplate {
  /** Nombre descriptivo del template */
  nombre: string;
  /** Descripción de perfil de clínica */
  descripcion: string;
  /** Array de módulos a activar (text[] en DB) */
  modulos: string[];
  /** Especialidades a activar (deben existir en especialidades_catalogo) */
  especialidades: string[];
  /**
   * Permisos que deben setearse en profesionales de esa especialidad.
   * NO van en clinicas_fce_config — son comentarios para el operador.
   */
  permisosPorEspecialidad: Record<string, PermisosPorEspecialidad>;
  /** Notas para incluir como comentarios en el SQL generado */
  notas: string[];
}

// ── Templates ─────────────────────────────────────────────────────────────────

export { TEMPLATE_MULTIDISCIPLINARIA_REHAB_PSI } from "./multidisciplinaria-rehab-psi";
export { TEMPLATE_MEDICA_GENERAL } from "./medica-general";
export { TEMPLATE_DENTAL } from "./dental";
export { TEMPLATE_MIXTA_COMPLETA } from "./mixta-completa";

import { TEMPLATE_MULTIDISCIPLINARIA_REHAB_PSI } from "./multidisciplinaria-rehab-psi";
import { TEMPLATE_MEDICA_GENERAL } from "./medica-general";
import { TEMPLATE_DENTAL } from "./dental";
import { TEMPLATE_MIXTA_COMPLETA } from "./mixta-completa";

export const TEMPLATES: Record<string, ClinicaTemplate> = {
  "multidisciplinaria-rehab-psi": TEMPLATE_MULTIDISCIPLINARIA_REHAB_PSI,
  "medica-general": TEMPLATE_MEDICA_GENERAL,
  "dental": TEMPLATE_DENTAL,
  "mixta-completa": TEMPLATE_MIXTA_COMPLETA,
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>;
