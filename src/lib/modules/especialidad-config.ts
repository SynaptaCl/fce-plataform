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

export interface DiagnosticoConfig {
  tipo: 'icd11_mms' | 'ninguno';
  label: string;
  mostrarCIE10?: boolean;
  chaptersFilter?: string;  // Capítulos WHO separados por ";". Ej: "06" para salud mental
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
  tieneCalculoIMC?: boolean;       // Si true, el form calcula IMC desde peso_kg/talla_cm en sección "contenido"
  tieneAntropometria?: boolean;    // Si true, AntropometriaPanel embebido en workspace (N1: solo Nutrición)
  tienePresupuesto?: boolean;      // Si true, tab Presupuestos visible en hub docs
  tieneInformes?: boolean;         // Si true, tab Informes visible en hub docs
  tieneAmbientScribe?: boolean;    // AMB-1: grabación de consulta → borrador de nota. Off por defecto — nunca activar en salud mental/neurodesarrollo (riesgo clínico, ver AMB-1 §2)
  diagnostico?: DiagnosticoConfig;
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
    tienePresupuesto: true,
    tieneInformes: true,
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
    tienePresupuesto: true,
    tieneInformes: true,
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
    tienePresupuesto: true,
    tieneInformes: true,
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
    tienePresupuesto: true,
    tieneInformes: true,
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
    tienePresupuesto: true,
    tieneInformes: true,
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
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Razón de la consulta actual",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo principal", tipo: "texto_largo", obligatorio: true, placeholder: "¿Cuál es el motivo de consulta del paciente?" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Anamnesis próxima y hallazgos del examen físico",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "anamnesis_proxima", label: "Anamnesis próxima", tipo: "texto_largo", obligatorio: false, placeholder: "Historia de la enfermedad actual, inicio, duración, factores agravantes/aliviantes…" },
          { id: "examen_fisico", label: "Examen físico", tipo: "texto_largo", obligatorio: false, placeholder: "Hallazgos del examen físico segmentario…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        descripcion: "Indicaciones y plan de tratamiento",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan de tratamiento", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones farmacológicas, no farmacológicas, derivaciones…" },
        ],
      },
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
    tienePresupuesto: true,
    tieneInformes: true,
    secciones: [
      {
        id: "motivo", label: "Motivo",
        descripcion: "Motivo de atención y valoración de enfermería",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_valoracion", label: "Motivo / Valoración", tipo: "texto_largo", obligatorio: true, placeholder: "Motivo de la atención y valoración inicial de enfermería…" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Procedimientos, evolución e indicaciones de cuidado",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "procedimientos", label: "Procedimientos realizados", tipo: "multi_select", obligatorio: false,
            opciones: ["Curación", "Instalación IV", "Toma de muestras", "Control de signos vitales", "Administración de medicamentos", "Educación al paciente", "Control glicemia", "Cateterismo vesical", "Otro"] },
          { id: "procedimientos_obs", label: "Observaciones de procedimientos", tipo: "texto_largo", obligatorio: false, placeholder: "Detalles de los procedimientos realizados…" },
          { id: "evolucion", label: "Evolución del paciente", tipo: "texto_largo", obligatorio: true, placeholder: "Estado del paciente, respuesta a intervenciones…" },
          { id: "indicaciones_cuidado", label: "Indicaciones de cuidado", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones para el paciente y familia…" },
        ],
      },
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
    tienePresupuesto: true,
    tieneInformes: true,
    diagnostico: {
      tipo: 'icd11_mms',
      label: 'Diagnóstico psicológico (CIE-11)',
      mostrarCIE10: false,
      chaptersFilter: '06',
    },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Motivo de consulta (principalmente en primera sesión)",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta / Demanda terapéutica", tipo: "texto_largo", obligatorio: false, placeholder: "¿Qué trae al paciente a consulta? (especialmente relevante en primera sesión)…" },
        ],
      },
      {
        id: "contenido", label: "Evolución de sesión",
        descripcion: "Estado mental y desarrollo de la sesión",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "estado_mental", label: "Estado mental / Observaciones clínicas", tipo: "texto_largo", obligatorio: false, placeholder: "Presentación del paciente, estado de ánimo, cognición, conducta, insight…" },
          { id: "desarrollo_sesion", label: "Desarrollo de la sesión", tipo: "texto_largo", obligatorio: true, placeholder: "Contenidos trabajados, dinámicas terapéuticas, narrativas emergentes…" },
          { id: "tecnicas", label: "Técnicas aplicadas", tipo: "multi_select", obligatorio: false,
            opciones: ["TCC", "ACT", "DBT", "EMDR", "Terapia narrativa", "Terapia sistémica", "Mindfulness", "Psicoeducación", "Exposición gradual", "Activación conductual", "Reestructuración cognitiva", "Otra"] },
        ],
      },
      {
        id: "plan", label: "Plan terapéutico",
        descripcion: "Plan y tareas intersesión",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "plan_tareas", label: "Plan terapéutico / Tareas intersesión", tipo: "texto_largo", obligatorio: false, placeholder: "Objetivos para próxima sesión, tareas asignadas…" },
          { id: "proxima_sesion_fecha", label: "Próxima sesión", tipo: "fecha", obligatorio: false },
        ],
      },
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
    tieneCalculoIMC: true,
    tieneAntropometria: true,
    tienePresupuesto: true,
    tieneInformes: true,
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Motivo de consulta nutricional",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta", tipo: "texto_largo", obligatorio: true, placeholder: "Motivo de la consulta nutricional…" },
        ],
      },
      {
        id: "contenido", label: "Evaluación nutricional",
        descripcion: "Antropometría y anamnesis alimentaria",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "peso_kg", label: "Peso (kg)", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: 70.5" },
          { id: "talla_cm", label: "Talla (cm)", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: 165" },
          { id: "imc_calculado", label: "IMC calculado (automático)", tipo: "texto_corto", obligatorio: false, ayuda: "Se calcula automáticamente desde peso y talla. El servidor recalcula al guardar." },
          { id: "imc_clasificacion", label: "Clasificación IMC (OMS)", tipo: "texto_corto", obligatorio: false, ayuda: "Se completa automáticamente al calcular IMC" },
          { id: "circunferencia_cintura", label: "Circunferencia de cintura (cm)", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: 88" },
          { id: "anamnesis_alimentaria", label: "Anamnesis alimentaria", tipo: "texto_largo", obligatorio: false, placeholder: "Hábitos alimentarios, frecuencia de comidas, consumo de líquidos, restricciones…" },
          { id: "diagnostico_nutricional", label: "Diagnóstico nutricional", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: Sobrepeso con distribución de grasa central" },
        ],
      },
      {
        id: "plan", label: "Plan alimentario",
        descripcion: "Plan e indicaciones nutricionales",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "plan_alimentario", label: "Plan alimentario / Indicaciones", tipo: "texto_largo", obligatorio: false, placeholder: "Plan de alimentación, recomendaciones nutricionales, metas…" },
        ],
      },
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
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      { id: "motivo", label: "Motivo de consulta", campos: [], colapsable: false, defaultAbierta: true },
      { id: "contenido", label: "Evolución dental", campos: [], colapsable: false, defaultAbierta: true },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
    ],
  },
  "Obstetricia y Puericultura": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["epds", "bishop", "apgar", "eva", "epsa", "vif", "lactancia_obs"],
    modulosHabilitados: ["M7"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta", tipo: "texto_largo", obligatorio: true, placeholder: "Motivo de la atención obstétrica / ginecológica…" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Evaluación clínica y hallazgos",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "edad_gestacional", label: "Edad gestacional (semanas)", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: 32+4" },
          { id: "examen_obstetrico", label: "Examen obstétrico", tipo: "texto_largo", obligatorio: false, placeholder: "AU, LCF, presentación, dinámica uterina, movimientos fetales…" },
          { id: "examen_ginecologico", label: "Examen ginecológico", tipo: "texto_largo", obligatorio: false, placeholder: "Hallazgos del examen ginecológico si aplica…" },
          { id: "evolucion", label: "Evolución / Observaciones", tipo: "texto_largo", obligatorio: true, placeholder: "Estado general, evolución de la paciente…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones, educación, derivaciones…" },
          { id: "proxima_sesion_fecha", label: "Próximo control", tipo: "fecha", obligatorio: false },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Ginecología y Obstetricia": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["epds", "bishop", "mrs", "eva", "audit_c"],
    modulosHabilitados: ["M7", "M8"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta", tipo: "texto_largo", obligatorio: true, placeholder: "Motivo de la consulta gineco-obstétrica…" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Evaluación clínica y hallazgos",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "edad_gestacional", label: "Edad gestacional (semanas)", tipo: "texto_corto", obligatorio: false, placeholder: "Ej: 32+4" },
          { id: "examen_obstetrico", label: "Examen obstétrico", tipo: "texto_largo", obligatorio: false, placeholder: "AU, LCF, presentación, dinámica uterina, movimientos fetales…" },
          { id: "examen_ginecologico", label: "Examen ginecológico", tipo: "texto_largo", obligatorio: false, placeholder: "Especuloscopía, TV, hallazgos ecográficos…" },
          { id: "examen_fisico", label: "Examen físico general", tipo: "texto_largo", obligatorio: false, placeholder: "Hallazgos relevantes del examen físico…" },
          { id: "evolucion", label: "Evolución / Observaciones", tipo: "texto_largo", obligatorio: true, placeholder: "Estado general, evolución clínica…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones, derivaciones, procedimientos programados…" },
          { id: "proxima_sesion_fecha", label: "Próximo control", tipo: "fecha", obligatorio: false },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Medicina Familiar": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["phq9", "gad7", "mmse", "glasgow", "barthel", "downton", "lawton", "apgar", "eva", "conners3"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Razón de la consulta actual",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo principal", tipo: "texto_largo", obligatorio: true, placeholder: "¿Cuál es el motivo de consulta del paciente?" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Anamnesis próxima, contexto familiar/longitudinal y examen físico",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "anamnesis_proxima", label: "Anamnesis próxima", tipo: "texto_largo", obligatorio: false, placeholder: "Historia de la enfermedad actual, inicio, duración, factores agravantes/aliviantes…" },
          { id: "contexto_familiar", label: "Contexto familiar / longitudinal", tipo: "texto_largo", obligatorio: false, placeholder: "Antecedentes familiares relevantes, seguimiento de controles previos, entorno del paciente…" },
          { id: "examen_fisico", label: "Examen físico", tipo: "texto_largo", obligatorio: false, placeholder: "Hallazgos del examen físico segmentario…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        descripcion: "Indicaciones y plan de tratamiento",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan de tratamiento", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones farmacológicas, no farmacológicas, derivaciones, control…" },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Fisiatría": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["eva", "barthel", "downton", "lawton"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: true,
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Razón de la consulta actual",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo principal", tipo: "texto_largo", obligatorio: true, placeholder: "¿Cuál es el motivo de consulta del paciente?" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Examen físico y evaluación funcional",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "examen_fisico", label: "Examen físico / musculoesquelético", tipo: "texto_largo", obligatorio: false, placeholder: "Hallazgos del examen físico, rango articular, fuerza, marcha…" },
          { id: "evaluacion_funcional", label: "Evaluación funcional", tipo: "texto_largo", obligatorio: false, placeholder: "Nivel de independencia, capacidad funcional, resultado de escalas aplicadas…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        descripcion: "Indicaciones y plan de rehabilitación",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan de rehabilitación", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones farmacológicas, derivación a terapia, órtesis/ayudas técnicas, control…" },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Neurología Infantil": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["conners3", "mmse", "glasgow", "eva"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: false, // AMB-1: neurodesarrollo — no activar (ver comentario tieneAmbientScribe arriba)
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico (ICD-11)', mostrarCIE10: true },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Razón de la consulta actual",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo principal", tipo: "texto_largo", obligatorio: true, placeholder: "¿Cuál es el motivo de consulta? (derivación, sospecha diagnóstica…)" },
        ],
      },
      {
        id: "contenido", label: "Evolución",
        descripcion: "Anamnesis perinatal/desarrollo y examen neurológico",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "anamnesis_desarrollo", label: "Anamnesis perinatal y del desarrollo", tipo: "texto_largo", obligatorio: false, placeholder: "Antecedentes perinatales, hitos del desarrollo psicomotor, antecedentes familiares…" },
          { id: "examen_neurologico", label: "Examen neurológico", tipo: "texto_largo", obligatorio: false, placeholder: "Pares craneanos, tono, fuerza, reflejos, coordinación, marcha…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        descripcion: "Indicaciones y plan de tratamiento",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan de tratamiento", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones farmacológicas, derivaciones, exámenes, control…" },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
    ],
  },
  "Psiquiatría Infantil": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["gad7", "phq9", "conners3", "cars2"],
    modulosHabilitados: ["M7", "M8", "M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: false, // AMB-1: salud mental — no activar (ver comentario tieneAmbientScribe arriba)
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico psiquiátrico (CIE-11)', mostrarCIE10: false, chaptersFilter: '06' },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Motivo de consulta (frecuentemente reportado por cuidadores)",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta", tipo: "texto_largo", obligatorio: true, placeholder: "¿Qué motiva la consulta? ¿Quién deriva o reporta el problema?" },
        ],
      },
      {
        id: "contenido", label: "Evolución de sesión",
        descripcion: "Estado mental infantil y entrevista con cuidadores",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "estado_mental", label: "Estado mental / Observaciones clínicas", tipo: "texto_largo", obligatorio: false, placeholder: "Presentación, ánimo, conducta, interacción, desarrollo cognitivo observado…" },
          { id: "entrevista_cuidadores", label: "Entrevista con cuidadores", tipo: "texto_largo", obligatorio: false, placeholder: "Información reportada por padres/cuidadores, funcionamiento escolar y familiar…" },
        ],
      },
      {
        id: "plan", label: "Plan",
        descripcion: "Plan terapéutico y farmacológico",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "indicaciones", label: "Indicaciones / Plan de tratamiento", tipo: "texto_largo", obligatorio: false, placeholder: "Indicaciones farmacológicas, psicoeducación, derivaciones, control…" },
        ],
      },
    ],
    accionesRapidas: [
      { id: "prescribir", label: "Prescripción", modulo: "M7", icon: "Pill", requierePermiso: "puede_prescribir" },
      { id: "examen", label: "Orden de examen", modulo: "M8", icon: "FlaskConical", requierePermiso: "puede_indicar_examenes" },
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
    ],
  },
  "Psicopedagogía": {
    modelo: "clinico_general",
    instrumentosSugeridos: ["brief2", "vineland3", "conners3"],
    modulosHabilitados: ["M10"],
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    tieneCopilotoIA: true,
    tieneResumenIA: true,
    tienePresupuesto: true,
    tieneInformes: true,
    tieneAmbientScribe: false, // AMB-1: neurodesarrollo — no activar (ver comentario tieneAmbientScribe arriba)
    diagnostico: { tipo: 'icd11_mms', label: 'Diagnóstico psicopedagógico (CIE-11)', mostrarCIE10: false, chaptersFilter: '06' },
    secciones: [
      {
        id: "motivo", label: "Motivo de consulta",
        descripcion: "Motivo de consulta o derivación",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "motivo_principal", label: "Motivo de consulta / derivación", tipo: "texto_largo", obligatorio: true, placeholder: "¿Qué trae al paciente a evaluación psicopedagógica? ¿Quién deriva?" },
        ],
      },
      {
        id: "contenido", label: "Evaluación psicopedagógica",
        descripcion: "Áreas evaluadas y desempeño académico",
        colapsable: false, defaultAbierta: true,
        campos: [
          { id: "areas_evaluadas", label: "Áreas evaluadas", tipo: "multi_select", obligatorio: false,
            opciones: ["Lectura", "Escritura", "Cálculo", "Atención", "Funciones ejecutivas", "Lenguaje", "Memoria", "Habilidades sociales", "Otra"] },
          { id: "desempeno_academico", label: "Desempeño académico / observaciones", tipo: "texto_largo", obligatorio: false, placeholder: "Rendimiento escolar, dificultades específicas, fortalezas observadas…" },
        ],
      },
      {
        id: "plan", label: "Plan de intervención",
        descripcion: "Plan y tareas intersesión",
        colapsable: true, defaultAbierta: false,
        campos: [
          { id: "plan_tareas", label: "Plan de intervención / Tareas intersesión", tipo: "texto_largo", obligatorio: false, placeholder: "Objetivos, estrategias de apoyo, tareas para la próxima sesión…" },
          { id: "proxima_sesion_fecha", label: "Próxima sesión", tipo: "fecha", obligatorio: false },
        ],
      },
    ],
    accionesRapidas: [
      { id: "instrumento", label: "Aplicar instrumento", modulo: "instrumento", icon: "ListChecks" },
      { id: "plan", label: "Plan de intervención", modulo: "M10", icon: "ClipboardList" },
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