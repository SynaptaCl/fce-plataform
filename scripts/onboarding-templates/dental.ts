/**
 * Template: dental
 *
 * Perfil: Clínica exclusivamente odontológica.
 * Workspace dental: odontograma + periograma + plan de tratamiento + procedimientos.
 *
 * Módulos activos:
 *   M1 Identificación (obligatorio)
 *   M2 Anamnesis + Signos Vitales
 *   M3b Instrumentos de valoración (índices dentales: CPOD, O'Leary, etc.)
 *   M4b Nota Clínica (consulta odontológica estructurada)
 *   M5 Consentimiento informado
 *   M6 Auditoría (obligatorio)
 *   M7 Prescripciones (analgésicos, antibióticos post-procedimiento)
 *   M9 Egresos
 *
 * NO incluye M3 SOAP rehab, M4 SOAP, M8 (exámenes de laboratorio), M10.
 */

import type { ClinicaTemplate } from "./index";

export const TEMPLATE_DENTAL: ClinicaTemplate = {
  nombre: "Odontológica",
  descripcion:
    "Clínica exclusivamente odontológica con workspace dental completo (odontograma, periograma, plan de tratamiento) y prescripción de analgésicos/antibióticos.",
  modulos: [
    "M1_identificacion",
    "M2_anamnesis",
    "M3b_instrumentos",
    "M4b_nota_clinica",
    "M5_consentimiento",
    "M6_auditoria",
    "M7_prescripciones",
    "M9_egresos",
  ],
  especialidades: [
    "Odontología",
  ],
  permisosPorEspecialidad: {
    // Odontólogos habilitados para prescribir analgésicos/antibióticos post-procedimiento
    "Odontología": { puede_prescribir: true, puede_indicar_examenes: false },
  },
  notas: [
    "Workspace dental: /encuentro/[id]/dental → DentalWorkspace (odontograma + periograma + plan de tratamiento).",
    "M7 activo: odontólogos pueden prescribir. Activar puede_prescribir = true en profesionales.",
    "M8 NO activo: exámenes de laboratorio no aplican al perfil dental estándar.",
    "M10 NO activo: plan de intervención GAS no es el flujo habitual en odontología.",
    "Odontología en estado 'beta' — validar flujo completo antes de poner en producción.",
    "ICD-11 dental: DiagnosticoSearch integrado en PeriogramaForm con contexto FDI.",
    "SQL para habilitar odontólogo: UPDATE profesionales SET puede_prescribir = true WHERE id = '<id>';",
  ],
};
