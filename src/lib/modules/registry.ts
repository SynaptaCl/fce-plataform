/**
 * Catálogo de módulos FCE y helpers de validación.
 *
 * FUENTE ÚNICA DE VERDAD para el scope de fce-plataform.
 *
 * Importante:
 * - Este registry solo cubre módulos FCE (M1-M6). Agenda, pagos, chatbot,
 *   recordatorios y tickets viven en OTROS repos del ecosistema Synapta.
 * - Las especialidades (codigo) deben coincidir con la tabla
 *   especialidades_catalogo en Supabase. Al agregar una especialidad nueva,
 *   primero se agrega a la tabla catálogo y luego aquí (o al revés).
 * - Los roles espejan los definidos en public.admin_users.rol check constraint.
 */

// ============================================================================
// IDs de módulos FCE
// ============================================================================

export type ModuleId =
  | "M1_identificacion"
  | "M2_anamnesis"
  | "M3_evaluacion"
  | "M4_soap"
  | "M5_consentimiento"
  | "M6_auditoria";

// ============================================================================
// IDs de especialidades (coinciden con especialidades_catalogo.codigo)
// ============================================================================

export type EspecialidadCodigo =
  | "Kinesiología"
  | "Fonoaudiología"
  | "Masoterapia"
  | "Administración Clínica"
  | "Odontología"
  | "Medicina General"
  | "Psicología"
  | "Nutrición"
  | "Terapia Ocupacional"
  | "Podología";

// ============================================================================
// Roles (coinciden con admin_users.rol check constraint)
// ============================================================================

export type Rol =
  | "superadmin"
  | "director"
  | "admin"
  | "profesional"
  | "recepcionista";

export const ROLES_CON_ACCESO_FCE: Rol[] = ["superadmin", "director", "admin", "profesional"];
export const ROLES_QUE_PUEDEN_ESCRIBIR: Rol[] = ["superadmin", "director", "admin", "profesional"];
export const ROLES_QUE_PUEDEN_FIRMAR: Rol[] = ["profesional"];
export const ROLES_QUE_CONFIGURAN: Rol[] = ["superadmin", "director", "admin"];

// ============================================================================
// Definición de módulo
// ============================================================================

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  descripcion: string;
  /** Si true, no se puede desactivar desde clinicas_fce_config */
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

// ============================================================================
// Definición de especialidad
// ============================================================================

export interface EspecialidadDefinition {
  codigo: EspecialidadCodigo;
  label: string;
  /** Componente de evaluación específico (referencia) */
  componenteEval: string;
  /** Si true, requiere hard-stop de contraindicaciones antes de iniciar */
  tieneContraindicaciones: boolean;
  /** Si true, tiene escalas funcionales (Barthel, etc.) */
  tieneEscalaFuncional: boolean;
  /** Estado de implementación en el repo fce-plataform */
  estado: "estable" | "beta" | "roadmap";
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
    descripcion: "Motivo de consulta, antecedentes médicos/quirúrgicos, red flags, signos vitales.",
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
    descripcion:
      "Formularios de evaluación según especialidades activas de la clínica (JSONB flexible en fce_evaluaciones.data).",
    obligatorio: false,
    dependeDe: ["M2_anamnesis"],
    tablasSupabase: ["fce_evaluaciones"],
    rutasApp: ["/dashboard/pacientes/[id]/evaluacion"],
    componentes: [
      "KinesiologiaEval",
      "FonoaudiologiaEval",
      "MasoterapiaEval",
      "OdontologiaEval",
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
    label: "Auditoría",
    descripcion:
      "Timeline append-only de todas las escrituras. Rol admin/director/superadmin puede ver.",
    obligatorio: true,
    dependeDe: ["M1_identificacion"],
    tablasSupabase: ["logs_auditoria"],
    rutasApp: ["/dashboard/pacientes/[id]/auditoria"],
    componentes: ["AuditTimeline"],
    requiereEspecialidad: false,
    estado: "estable",
  },
};

// ============================================================================
// CATÁLOGO DE ESPECIALIDADES (espejo de especialidades_catalogo en DB)
// ============================================================================

export const ESPECIALIDADES_REGISTRY: Record<EspecialidadCodigo, EspecialidadDefinition> = {
  "Kinesiología": {
    codigo: "Kinesiología",
    label: "Kinesiología",
    componenteEval: "KinesiologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "estable",
  },
  "Fonoaudiología": {
    codigo: "Fonoaudiología",
    label: "Fonoaudiología",
    componenteEval: "FonoaudiologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "estable",
  },
  "Masoterapia": {
    codigo: "Masoterapia",
    label: "Masoterapia",
    componenteEval: "MasoterapiaEval",
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    estado: "estable",
  },
  "Administración Clínica": {
    codigo: "Administración Clínica",
    label: "Administración Clínica",
    componenteEval: "AdministracionEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "estable",
  },
  "Odontología": {
    codigo: "Odontología",
    label: "Odontología",
    componenteEval: "OdontologiaEval",
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    estado: "beta",
  },
  "Medicina General": {
    codigo: "Medicina General",
    label: "Medicina General",
    componenteEval: "MedicinaGeneralEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "roadmap",
  },
  "Psicología": {
    codigo: "Psicología",
    label: "Psicología",
    componenteEval: "PsicologiaEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "roadmap",
  },
  "Nutrición": {
    codigo: "Nutrición",
    label: "Nutrición",
    componenteEval: "NutricionEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: false,
    estado: "roadmap",
  },
  "Terapia Ocupacional": {
    codigo: "Terapia Ocupacional",
    label: "Terapia Ocupacional",
    componenteEval: "TerapiaOcupacionalEval",
    tieneContraindicaciones: false,
    tieneEscalaFuncional: true,
    estado: "roadmap",
  },
  "Podología": {
    codigo: "Podología",
    label: "Podología",
    componenteEval: "PodologiaEval",
    tieneContraindicaciones: true,
    tieneEscalaFuncional: false,
    estado: "roadmap",
  },
};

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

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
      if (!set.has(dep)) problemas.push(`${moduleId} requiere ${dep} activo.`);
    }
  }
  return problemas;
}

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

export function validateEspecialidades(
  modulosActivos: ModuleId[],
  especialidadesActivas: EspecialidadCodigo[]
): string[] {
  const problemas: string[] = [];
  if (modulosActivos.includes("M3_evaluacion") && especialidadesActivas.length === 0) {
    problemas.push("M3_evaluacion está activo pero no hay especialidades configuradas.");
  }
  for (const esp of especialidadesActivas) {
    if (!ESPECIALIDADES_REGISTRY[esp]) {
      problemas.push(`Especialidad desconocida en registry: ${esp}`);
    }
  }
  return problemas;
}

export function validateConfig(
  modulosActivos: ModuleId[],
  especialidadesActivas: EspecialidadCodigo[]
): { ok: boolean; errores: string[] } {
  const errores = [
    ...validateObligatorios(modulosActivos),
    ...validateDependencies(modulosActivos),
    ...validateEspecialidades(modulosActivos, especialidadesActivas),
  ];
  return { ok: errores.length === 0, errores };
}

export function getDependentes(moduleId: ModuleId): ModuleId[] {
  return (Object.keys(MODULE_REGISTRY) as ModuleId[]).filter((id) =>
    MODULE_REGISTRY[id].dependeDe.includes(moduleId)
  );
}

// ============================================================================
// MAPEO config.branding → tokens FCE
// ============================================================================

/**
 * Estructura de clinicas.config.branding (ejemplo Korporis):
 * {
 *   "navy": "#006B6B",
 *   "accent": "#F5A623",
 *   "primary": "#00B0A8",
 *   "light_bg": "#E6FAF9",
 *   "navy_deep": "#004545",
 *   "primary_hover": "#009990",
 *   "logo_url": "...",
 *   "clinic_initials": "KP",
 *   "clinic_short_name": "Korporis"
 * }
 *
 * El FCE consume tokens kp-* que se inyectan como CSS variables.
 * Este mapa traduce las claves del branding a las claves del FCE.
 */
export interface BrandingConfig {
  navy?: string;
  accent?: string;
  primary?: string;
  light_bg?: string;
  navy_deep?: string;
  primary_hover?: string;
  logo_url?: string;
  clinic_initials?: string;
  clinic_short_name?: string;
}

export interface FceTokens {
  primary: string;
  "primary-deep": string;
  accent: string;
  "accent-lt": string;
  secondary: string;
  "primary-hover": string;
}

/** Fallback: paleta por defecto (Korporis teal) si branding está vacío. */
export const DEFAULT_FCE_TOKENS: FceTokens = {
  "primary": "#006B6B",
  "primary-deep": "#004545",
  "accent": "#00B0A8",
  "accent-lt": "#D5F5F4",
  "secondary": "#F5A623",
  "primary-hover": "#009990",
};

/**
 * Convierte el branding existente en clinicas.config.branding a tokens FCE.
 * Si alguna clave falta, usa el fallback default.
 */
export function mapBrandingToTokens(branding: BrandingConfig | null | undefined): FceTokens {
  if (!branding) return DEFAULT_FCE_TOKENS;
  return {
    "primary": branding.navy ?? DEFAULT_FCE_TOKENS.primary,
    "primary-deep": branding.navy_deep ?? DEFAULT_FCE_TOKENS["primary-deep"],
    "accent": branding.primary ?? DEFAULT_FCE_TOKENS.accent,
    "accent-lt": branding.light_bg ?? DEFAULT_FCE_TOKENS["accent-lt"],
    "secondary": branding.accent ?? DEFAULT_FCE_TOKENS.secondary,
    "primary-hover": branding.primary_hover ?? DEFAULT_FCE_TOKENS["primary-hover"],
  };
}

/**
 * Genera CSS variables inline para inyectar en un <style> tag del layout.
 */
export function tokensToCssVars(tokens: FceTokens): string {
  return Object.entries(tokens)
    .map(([k, v]) => `--kp-${k}: ${v};`)
    .join(" ");
}
