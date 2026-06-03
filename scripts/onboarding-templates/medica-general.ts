/**
 * Template: medica-general
 *
 * Perfil: Clínica de medicina general con enfermería.
 * Habilitada para prescripción de fármacos e indicación de exámenes.
 *
 * Módulos activos:
 *   M1 Identificación (obligatorio)
 *   M2 Anamnesis + Signos Vitales
 *   M3b Instrumentos de valoración
 *   M4b Nota Clínica estructurada (Medicina General tiene secciones P2)
 *   M5 Consentimiento informado
 *   M6 Auditoría (obligatorio)
 *   M7 Prescripciones e Indicaciones
 *   M8 Exámenes y Laboratorios (beta)
 *   M9 Egresos
 *
 * NO incluye M3 (evaluación rehab), M4 SOAP ni M10 (plan intervención).
 * Nota: M3b sin M3 es válido — los instrumentos de valoración son independientes
 * del flujo SOAP en el modelo clínico general.
 */

import type { ClinicaTemplate } from "./index";

export const TEMPLATE_MEDICA_GENERAL: ClinicaTemplate = {
  nombre: "Médica General + Enfermería",
  descripcion:
    "Clínica de medicina general y enfermería con habilitación completa para prescripción e indicación de exámenes.",
  modulos: [
    "M1_identificacion",
    "M2_anamnesis",
    "M3b_instrumentos",
    "M4b_nota_clinica",
    "M5_consentimiento",
    "M6_auditoria",
    "M7_prescripciones",
    "M8_examenes",
    "M9_egresos",
  ],
  especialidades: [
    "Medicina General",
    "Enfermería",
  ],
  permisosPorEspecialidad: {
    // Médicos: habilitados para prescribir y ordenar exámenes
    "Medicina General": { puede_prescribir: true, puede_indicar_examenes: true },
    // Enfermería: sin permiso de prescripción ni exámenes por defecto
    "Enfermería":       { puede_prescribir: false, puede_indicar_examenes: false },
  },
  notas: [
    "M7 y M8 activos — asegurarse de activar puede_prescribir y puede_indicar_examenes en profesionales de Medicina General.",
    "Enfermería: puede_prescribir = false y puede_indicar_examenes = false por defecto clínico.",
    "M8 en estado beta — validar catálogo de exámenes antes de activar en producción.",
    "NotaClinicaForm activa secciones estructuradas para Medicina General (campos Motivo/Anamnesis/Examen Físico/Plan).",
    "SQL para habilitar médico: UPDATE profesionales SET puede_prescribir = true, puede_indicar_examenes = true WHERE id = '<id>';",
  ],
};
