/**
 * Template: multidisciplinaria-rehab-psi
 *
 * Perfil: Centro multidisciplinario de rehabilitación + psicología + nutrición
 * sin médico habilitado para prescribir. Caso de referencia: Cenupsi.
 *
 * Módulos activos:
 *   M1 Identificación (obligatorio)
 *   M2 Anamnesis + Signos Vitales
 *   M3 Evaluación por especialidad + M3b Instrumentos
 *   M4 Evolución SOAP + M4b Nota Clínica
 *   M5 Consentimiento informado
 *   M6 Auditoría (obligatorio)
 *   M9 Egresos
 *   M10 Plan de Intervención (GAS, objetivos longitudinales)
 *
 * NO incluye M7 (prescripciones) ni M8 (exámenes).
 */

import type { ClinicaTemplate } from "./index";

export const TEMPLATE_MULTIDISCIPLINARIA_REHAB_PSI: ClinicaTemplate = {
  nombre: "Multidisciplinaria Rehab + Psicología",
  descripcion:
    "Centro con rehabilitación, psicología y nutrición. Sin habilitación médica para prescribir fármacos ni indicar exámenes.",
  modulos: [
    "M1_identificacion",
    "M2_anamnesis",
    "M3_evaluacion",
    "M3b_instrumentos",
    "M4_soap",
    "M4b_nota_clinica",
    "M5_consentimiento",
    "M6_auditoria",
    "M9_egresos",
    "M10_plan_intervencion",
  ],
  especialidades: [
    "Kinesiología",
    "Fonoaudiología",
    "Psicología",
    "Nutrición",
    "Terapia Ocupacional",
  ],
  permisosPorEspecialidad: {
    // Ninguna especialidad en este perfil tiene permisos de prescripción
    "Kinesiología":        { puede_prescribir: false, puede_indicar_examenes: false },
    "Fonoaudiología":      { puede_prescribir: false, puede_indicar_examenes: false },
    "Psicología":          { puede_prescribir: false, puede_indicar_examenes: false },
    "Nutrición":           { puede_prescribir: false, puede_indicar_examenes: false },
    "Terapia Ocupacional": { puede_prescribir: false, puede_indicar_examenes: false },
  },
  notas: [
    "M7 y M8 NO están activos — sin habilitación para prescripción ni indicación de exámenes.",
    "M10 activo: Plan de Intervención con GAS para seguimiento longitudinal (neurodesarrollo).",
    "Terapia Ocupacional en estado 'beta' — funcional, requiere revisión clínica formal.",
    "Para activar prescripción individual: UPDATE profesionales SET puede_prescribir = true WHERE id = '<id>';",
  ],
};
