import type { ModeloClinico } from "./registry";

export type CampoTipo =
  | "texto_largo"      // textarea
  | "texto_corto"      // input
  | "select"           // dropdown con opciones
  | "multi_select"     // checkboxes
  | "escala"           // slider numérico
  | "fecha"
  | "booleano";

export interface CampoNota {
  id: string;
  label: string;
  tipo: CampoTipo;
  obligatorio: boolean;
  opciones?: string[];        // para select/multi_select
  placeholder?: string;
  ayuda?: string;             // hint clínico
  min?: number;               // para escala
  max?: number;
}

export interface SeccionNota {
  id: string;
  label: string;
  descripcion?: string;
  campos: CampoNota[];        // reemplaza el campo "tipo" anterior
  colapsable: boolean;
  defaultAbierta: boolean;
}

export interface AccionRapida {
  id: string;
  label: string;
  modulo: string;
  icon: string;
  requierePermiso?: "puede_prescribir" | "puede_indicar_examenes";
}

export interface EspecialidadConfig {
  modelo: ModeloClinico;
  instrumentosSugeridos: string[];
  modulosHabilitados: string[];
  tieneContraindicaciones: boolean;
  tieneEscalaFuncional: boolean;
  tieneCopilotoIA: boolean;
  tieneResumenIA: boolean;
  secciones: SeccionNota[];
  accionesRapidas: AccionRapida[];
}

export const ESPECIALIDAD_CONFIG: Record<string, EspecialidadConfig> = {
  "Kinesiología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "barthel"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Fonoaudiología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "ados2"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Masoterapia": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
  "Terapia Ocupacional": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva", "brief2", "vineland3", "sensory_profile"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: false,
    tieneResumenIA: true,
    secciones: [],
    accionesRapidas: [
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Podología": {
    modelo: "rehabilitacion",
    instrumentosSugeridos: ["eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
  "Medicina General": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["phq9", "gad7", "mmse", "glasgow", "barthel", "downton", "lawton", "apgar", "eva", "conners3"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evolución", campos: [], colapsable: false, defaultAbierta: true },
      { id: "diagnostico", label: "Diagnóstico (ICD-11)", campos: [], colapsable: true, defaultAbierta: false },
      { id: "plan", label: "Plan", campos: [], colapsable: true, defaultAbierta: false },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Enfermería": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["braden", "downton", "glasgow", "lawton", "barthel", "apgar", "eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evolución", campos: [], colapsable: false, defaultAbierta: true },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Psicología": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["eva", "gad7", "mmse", "phq9", "adir", "cars2", "wisc5", "wppsi", "ados2", "conners3", "brief2", "vineland3"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evolución de sesión", campos: [], colapsable: false, defaultAbierta: true },
      { id: "plan", label: "Plan terapéutico", campos: [], colapsable: true, defaultAbierta: false },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Nutrición": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["eva"],
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evaluación nutricional", campos: [], colapsable: false, defaultAbierta: true },
      { id: "plan", label: "Plan alimentario", campos: [], colapsable: true, defaultAbierta: false },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Odontología": {
    modelo: "odontologico",
    instrumentosSugeridos: ["eva", "corah_ansiedad", "cpod", "oleary", "indice_gingival", "ipc"],
    modulosHabilitados: ["M7"],
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [
      { id: "motivo", label: "Motivo de consulta", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evolución dental", campos: [], colapsable: false, defaultAbierta: true },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
    ],
  },
  "Administración Clínica": {
    modelo: "ninguno",
    instrumentosSugeridos: [],
    modulosHabilitados: [],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: false,
    tieneResumenIA: false,
    secciones: [],
    accionesRapidas: [],
  },
};

/**
 * Fuente única de verdad de la config de una especialidad.
 * Retorna la config de 'Administración Clínica' (modelo ninguno) si no existe.
 */
export function getEspecialidadConfig(especialidad: string): EspecialidadConfig {
  return ESPECIALIDAD_CONFIG[especialidad] ?? ESPECIALIDAD_CONFIG["Administración Clínica"];
}
