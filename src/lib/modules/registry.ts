/**
 * Catálogo de módulos y especialidades de la plataforma FCE.
 *
 * FUENTE ÚNICA DE VERDAD. NO MODIFICAR PARA ADAPTAR A UNA CLÍNICA ESPECÍFICA.
 *
 * Si una clínica no usa un módulo, se desactiva en `clinicas_config.modulos_activos`,
 * NO se borra de este archivo.
 *
 * Agregar módulo nuevo = agregar entrada aquí + migration SQL + componentes.
 */

// ============================================================================
// TIPOS
// ============================================================================

export type ModuleId =
  | "M1_identificacion"
  | "M2_anamnesis"
  | "M3_evaluacion"
  | "M4_soap"
  | "M5_consentimiento"
  | "M6_auditoria"
  | "M7_agenda"
  | "M8_facturacion";

export type EspecialidadId =
  | "kinesiologia"
  | "fonoaudiologia"
  | "masoterapia"
  | "medicina_general"
  | "psicologia"
  | "nutricion"
  | "terapia_ocupacional"
  | "podologia";

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  descripcion: string;
  /** Si true, no se puede desactivar desde clinicas_config */
  obligatorio: boolean;
  /** IDs de módulos que deben estar activos para habilitar este */
  dependeDe: ModuleId[];
  /** Tablas Supabase que este módulo lee/escribe */
  tablasSupabase: string[];
  /** Rutas Next.js App Router que este módulo controla */
  rutasApp: string[];
  /** Componentes principales (referencia) */
  componentes: string[];
  /** Si true, requiere al menos una especialidad activa */
  requiereEspecialidad: boolean;
  /** Estado: "estable" | "roadmap" | "beta" */
  estado: "estable" | "roadmap" | "beta";
}

export interface EspecialidadDefinition {
  id: EspecialidadId;
  label: string;
  /** Componente de evaluación específico (referencia) */
  componenteEval: string;
  /** Si true, requiere hard-stop de contraindicaciones antes de iniciar */
  tieneContraindicaciones: boolean;
  /** Si true, tiene escalas funcionales (Barthel, etc.) */
  tieneEscalaFuncional: boolean;
  /** Estado: "estable" | "beta" */
  estado: "estable" | "beta";
}

// ============================================================================
// CATÁLOGO DE MÓDULOS
// ============================================================================

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  M1_identificacion: {
    id: "M1_identificacion",
    label: "Identificación de paciente",
    descripcion: "Decreto 41 MINSAL. Datos demográficos, RUT, previsión, contacto.",
    obligatorio: true,
    dependeDe: [],
    tablasSupabase: ["pacientes"],
    rutasApp: [
      "/dashboard/pacientes",
      "/dashboard/pacientes/nuevo",
      "/dashboard/pacientes/[id]/editar",
    ],
    componentes: ["PatientForm", "PatientList"],
    requiereEspecialidad: false,
    estado: "estable",
  },

  M2_anamnesis: {
    id: "M2_anamnesis",
    label: "Anamnesis + Red Flags + Signos Vitales",
    descripcion: "Motivo de consulta, red flags clínicas, signos vitales.",
    obligatorio: false,
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["fce_anamnesis", "fce_signos_vitales"],
    rutasApp: ["/dashboard/pacientes/[id]/anamnesis"],
    componentes: ["AnamnesisForm", "RedFlagsChecklist", "VitalSignsPanel"],
    requiereEspecialidad: false,
    estado: "estable",
  },

  M3_evaluacion: {
    id: "M3_evaluacion",
    label: "Evaluación por especialidad",
    descripcion: "Formularios de evaluación según especialidades activas de la clínica.",
    obligatorio: false,
    dependeDe: ["M2_anamnesis"],
    tablasSupabase: ["fce_evaluaciones"],
    rutasApp: ["/dashboard/pacientes/[id]/evaluacion"],
    componentes: [
      "KinesiologiaEval",
      "FonoaudiologiaEval",
      "MasoterapiaEval",
      // futuros: MedicinaGeneralEval, PsicologiaEval, etc.
    ],
    requiereEspecialidad: true,
    estado: "estable",
  },

  M4_soap: {
    id: "M4_soap",
    label: "Evolución SOAP + CIF Mapper",
    descripcion:
      "Notas SOAP firmadas (inmutables post-firma) + clasificación CIF + timeline clínico.",
    obligatorio: false,
    dependeDe: ["M3_evaluacion"],
    tablasSupabase: ["fce_notas_soap", "fce_encuentros"],
    rutasApp: ["/dashboard/pacientes/[id]/evolucion"],
    componentes: ["SoapForm", "CifMapper", "ClinicalTimeline"],
    requiereEspecialidad: true,
    estado: "estable",
  },

  M5_consentimiento: {
    id: "M5_consentimiento",
    label: "Consentimiento informado",
    descripcion: "Gestión de consentimientos con firma canvas (Ley 20.584).",
    obligatorio: false,
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["fce_consentimientos"],
    rutasApp: ["/dashboard/pacientes/[id]/consentimiento"],
    componentes: ["ConsentManager"],
    requiereEspecialidad: false,
    estado: "estable",
  },

  M6_auditoria: {
    id: "M6_auditoria",
    label: "Auditoría (admin)",
    descripcion: "Timeline append-only de todas las escrituras. Solo rol admin.",
    obligatorio: true, // compliance requiere siempre auditoría
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["logs_auditoria"],
    rutasApp: ["/dashboard/pacientes/[id]/auditoria"],
    componentes: ["AuditTimeline"],
    requiereEspecialidad: false,
    estado: "estable",
  },

  M7_agenda: {
    id: "M7_agenda",
    label: "Agenda y citas",
    descripcion: "Gestión de agenda, citas, recordatorios WhatsApp/SMS.",
    obligatorio: false,
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["citas"],
    rutasApp: ["/dashboard/agenda"],
    componentes: ["AgendaView", "CitaForm"],
    requiereEspecialidad: false,
    estado: "roadmap",
  },

  M8_facturacion: {
    id: "M8_facturacion",
    label: "Facturación",
    descripcion: "Boletas electrónicas, facturas, integración SII.",
    obligatorio: false,
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["boletas"],
    rutasApp: ["/dashboard/facturacion"],
    componentes: ["BoletaForm"],
    requiereEspecialidad: false,
    estado: "roadmap",
  },
};

// ============================================================================
// CATÁLOGO DE ESPECIALIDADES
// ============================================================================

export const ESPECIALIDADES_REGISTRY: Record<EspecialidadId, EspecialidadDefinition> = {
  kinesiologia: {
    id: "kinesiologia",
    label: "Kinesiología",
    componenteEval: "KinesiologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "estable",
  },
  fonoaudiologia: {
    id: "fonoaudiologia",
    label: "Fonoaudiología",
    componenteEval: "FonoaudiologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "estable",
  },
  masoterapia: {
    id: "masoterapia",
    label: "Masoterapia",
    componenteEval: "MasoterapiaEval",
    tieneContraindicaciones: true, // hard-stop obligatorio
    tieneEscalaFuncional: false,
    estado: "estable",
  },
  medicina_general: {
    id: "medicina_general",
    label: "Medicina General",
    componenteEval: "MedicinaGeneralEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "beta",
  },
  psicologia: {
    id: "psicologia",
    label: "Psicología",
    componenteEval: "PsicologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "beta",
  },
  nutricion: {
    id: "nutricion",
    label: "Nutrición",
    componenteEval: "NutricionEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "beta",
  },
  terapia_ocupacional: {
    id: "terapia_ocupacional",
    label: "Terapia Ocupacional",
    componenteEval: "TerapiaOcupacionalEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "beta",
  },
  podologia: {
    id: "podologia",
    label: "Podología",
    componenteEval: "PodologiaEval",
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    estado: "beta",
  },
};

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

/**
 * Valida que todos los módulos activos tengan sus dependencias activas.
 * Retorna lista de problemas (vacía si todo OK).
 */
export function validateDependencies(modulosActivos: ModuleId[]): string[] {
  const problemas: string[] = [];
  const set = new Set(modulosActivos);

  for (const moduleId of modulosActivos) {
    const mod = MODULE_REGISTRY[moduleId];
    if (!mod) {
      problemas.push(`Módulo desconocido: ${moduleId}`);
      continue;
    }
    for (const dep of mod.dependeDe) {
      if (!set.has(dep)) {
        problemas.push(`${moduleId} requiere ${dep} activo.`);
      }
    }
  }

  return problemas;
}

/**
 * Valida que los módulos obligatorios estén todos activos.
 */
export function validateObligatorios(modulosActivos: ModuleId[]): string[] {
  const problemas: string[] = [];
  const set = new Set(modulosActivos);

  for (const [id, mod] of Object.entries(MODULE_REGISTRY) as [ModuleId, ModuleDefinition][]) {
    if (mod.obligatorio && !set.has(id)) {
      problemas.push(`Módulo obligatorio faltante: ${id}`);
    }
  }

  return problemas;
}

/**
 * Valida que si M3 está activo, haya al menos una especialidad activa.
 */
export function validateEspecialidades(
  modulosActivos: ModuleId[],
  especialidadesActivas: EspecialidadId[]
): string[] {
  const problemas: string[] = [];
  const m3Active = modulosActivos.includes("M3_evaluacion");
  if (m3Active && especialidadesActivas.length === 0) {
    problemas.push("M3_evaluacion está activo pero no hay especialidades configuradas.");
  }
  return problemas;
}

/**
 * Todas las validaciones juntas.
 */
export function validateConfig(
  modulosActivos: ModuleId[],
  especialidadesActivas: EspecialidadId[]
): { ok: boolean; errores: string[] } {
  const errores = [
    ...validateObligatorios(modulosActivos),
    ...validateDependencies(modulosActivos),
    ...validateEspecialidades(modulosActivos, especialidadesActivas),
  ];
  return { ok: errores.length === 0, errores };
}

/**
 * Retorna los módulos que dependen de `moduleId` (para UI: "si desactivas X, se desactivan Y, Z").
 */
export function getDependentes(moduleId: ModuleId): ModuleId[] {
  return (Object.keys(MODULE_REGISTRY) as ModuleId[]).filter((id) =>
    MODULE_REGISTRY[id].dependeDe.includes(moduleId)
  );
}

/**
 * Tokens de color que la plataforma espera en clinicas_config.tokens_color.
 */
export const REQUIRED_COLOR_TOKENS = [
  "primary",
  "primary-deep",
  "accent",
  "accent-md",
  "accent-lt",
  "secondary",
] as const;

export type ColorToken = (typeof REQUIRED_COLOR_TOKENS)[number];

/**
 * Valida que tokens_color tenga todas las claves requeridas con formato hex válido.
 */
export function validateTokens(tokens: Record<string, string>): string[] {
  const problemas: string[] = [];
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  for (const token of REQUIRED_COLOR_TOKENS) {
    const val = tokens[token];
    if (!val) {
      problemas.push(`Falta token de color: ${token}`);
    } else if (!hexRegex.test(val)) {
      problemas.push(`Token ${token} no es hex válido: ${val}`);
    }
  }

  return problemas;
}
