/**
 * Template: mixta-completa
 *
 * Perfil: Clínica grande con todas las especialidades y todos los módulos activos.
 * Incluye rehabilitación, modelo clínico general, odontología y administración.
 *
 * Todos los módulos M1-M10 + sub-módulos M3b y M4b.
 * Todas las especialidades del catálogo FCE.
 *
 * ⚠️  Usar con criterio: algunos módulos y especialidades están en beta.
 *     Revisar notas antes de activar en producción.
 */

import type { ClinicaTemplate } from "./index";

export const TEMPLATE_MIXTA_COMPLETA: ClinicaTemplate = {
  nombre: "Mixta Completa",
  descripcion:
    "Clínica de gran escala con todas las especialidades y todos los módulos FCE habilitados. Incluye rehab, clínica general, odontología y administración.",
  modulos: [
    "M1_identificacion",
    "M2_anamnesis",
    "M3_evaluacion",
    "M3b_instrumentos",
    "M4_soap",
    "M4b_nota_clinica",
    "M5_consentimiento",
    "M6_auditoria",
    "M7_prescripciones",
    "M8_examenes",
    "M9_egresos",
    "M10_plan_intervencion",
  ],
  especialidades: [
    "Kinesiología",
    "Fonoaudiología",
    "Masoterapia",
    "Terapia Ocupacional",
    "Podología",
    "Medicina General",
    "Enfermería",
    "Psicología",
    "Nutrición",
    "Odontología",
    "Administración Clínica",
  ],
  permisosPorEspecialidad: {
    // Rehab: sin prescripción por defecto
    "Kinesiología":           { puede_prescribir: false, puede_indicar_examenes: false },
    "Fonoaudiología":         { puede_prescribir: false, puede_indicar_examenes: false },
    "Masoterapia":            { puede_prescribir: false, puede_indicar_examenes: false },
    "Terapia Ocupacional":    { puede_prescribir: false, puede_indicar_examenes: false },
    "Podología":              { puede_prescribir: false, puede_indicar_examenes: false },
    // Clínica general: médicos y enfermería
    "Medicina General":       { puede_prescribir: true,  puede_indicar_examenes: true  },
    "Enfermería":             { puede_prescribir: false, puede_indicar_examenes: false },
    "Psicología":             { puede_prescribir: false, puede_indicar_examenes: false },
    "Nutrición":              { puede_prescribir: false, puede_indicar_examenes: false },
    // Dental: prescripción de analgésicos/antibióticos
    "Odontología":            { puede_prescribir: true,  puede_indicar_examenes: false },
    // Admin: sin acceso a FCE
    "Administración Clínica": { puede_prescribir: false, puede_indicar_examenes: false },
  },
  notas: [
    "⚠️  Template de máxima amplitud — revisar estado de módulos beta antes de usar en producción.",
    "M8 (exámenes) en beta: seed de examenes_catalogo vacío, poblar antes de activar.",
    "M10 (plan intervención) en beta: usar solo para especialidades que requieren GAS.",
    "Terapia Ocupacional en beta; Podología en roadmap — evaluar con clínica antes de activar.",
    "Masoterapia y Odontología tienen tieneContraindicaciones=true: requieren hard-stop en encuentro.",
    "Permisos de prescripción por profesional se activan manualmente post-onboarding.",
    "Administración Clínica: no tiene workspace clínico (modelo=ninguno).",
  ],
};
