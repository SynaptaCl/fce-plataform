/**
 * validate-clinica.ts — Validador pre go-live de clínicas FCE
 *
 * Verifica que una clínica esté completamente configurada antes de
 * habilitarla en producción. Lee DB en modo solo-lectura con service role.
 *
 * Uso desde código:
 *   const result = await validateClinica("cenupsi");
 *
 * Uso desde tests:
 *   const result = validateClinicaData(mockInput);
 */

import { createServiceClient } from "../supabase/service";

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type ValidationResult = {
  ready: boolean;
  bloqueos: ValidationIssue[];
  advertencias: ValidationIssue[];
};

export type ValidationIssue = {
  codigo: string;
  mensaje: string;
  accionSugerida: string;
};

// ── Tipos internos para datos crudos de DB ────────────────────────────────────

interface ClinicaRow {
  id: string;
  slug: string;
  config: Record<string, unknown> | null;
}

interface FceConfigRow {
  modulos_activos: string[];
  especialidades_activas: string[];
}

interface ProfesionalRow {
  id: string;
  nombre: string;
  especialidad: string;
  numero_registro: string | null;
  tipo_registro: string | null;
  puede_prescribir: boolean;
  puede_indicar_examenes: boolean;
}

interface EspecialidadCatalogoRow {
  codigo: string;
  activa: boolean;
}

// ── Input para la función pura (testeable) ────────────────────────────────────

export interface ClinicaValidationInput {
  clinica: ClinicaRow | null;
  fceConfig: FceConfigRow | null;
  especialidadesCatalogo: EspecialidadCatalogoRow[];
  profesionales: ProfesionalRow[];
  /** profesional.id → admin_user.id[] (vacío si tabla no existe o sin links) */
  adminLinksByProfesional: Record<string, string[]>;
}

// ── Lógica de validación pura (sin DB) ────────────────────────────────────────

/**
 * Valida los datos crudos sin acceso a DB.
 * Exportada para tests con datos mock.
 */
export function validateClinicaData(input: ClinicaValidationInput): ValidationResult {
  const bloqueos: ValidationIssue[] = [];
  const advertencias: ValidationIssue[] = [];

  // B1 — La clínica existe
  if (!input.clinica) {
    bloqueos.push({
      codigo: "clinica_no_existe",
      mensaje: "No existe ninguna clínica con ese slug en la tabla clinicas.",
      accionSugerida: "Verificar el slug exacto o crear la clínica en el panel de administración.",
    });
    return { ready: false, bloqueos, advertencias };
  }

  // B2 — Tiene fila en clinicas_fce_config
  if (!input.fceConfig) {
    bloqueos.push({
      codigo: "config_fce_no_existe",
      mensaje: "La clínica no tiene fila en clinicas_fce_config.",
      accionSugerida:
        "Crear el registro base con el script de onboarding: npm run onboard:clinica -- --slug=<slug> --template=<template>.",
    });
  }

  const modulos = input.fceConfig?.modulos_activos ?? [];
  const especialidades = input.fceConfig?.especialidades_activas ?? [];

  // B3 — No solo M1+M6 (necesita al menos un módulo operativo)
  const BASE_ONLY = new Set(["M1_identificacion", "M6_auditoria"]);
  if (input.fceConfig !== null && modulos.length > 0 && modulos.every((m) => BASE_ONLY.has(m))) {
    bloqueos.push({
      codigo: "modulos_solo_base",
      mensaje:
        "Solo están activos M1_identificacion y M6_auditoria. La clínica no tiene módulos operativos.",
      accionSugerida:
        "Activar al menos M4_soap (para rehabilitación) u otro módulo de atención clínica usando un template de onboarding.",
    });
  }

  // B4 — Especialidades activas no vacías
  if (especialidades.length === 0) {
    bloqueos.push({
      codigo: "especialidades_vacias",
      mensaje: "No hay especialidades activas configuradas en especialidades_activas.",
      accionSugerida:
        "Agregar especialidades via el script de onboarding o ejecutar el SQL de configuración.",
    });
  }

  // B5 — Cada especialidad existe en el catálogo y está activa
  const catalogoActivo = new Set(
    input.especialidadesCatalogo.filter((e) => e.activa).map((e) => e.codigo)
  );
  for (const esp of especialidades) {
    if (!catalogoActivo.has(esp)) {
      bloqueos.push({
        codigo: "especialidad_invalida",
        mensaje: `"${esp}" no existe en especialidades_catalogo o está marcada como inactiva.`,
        accionSugerida: `Corregir el nombre (con tilde, mayúsculas exactas) o activar la especialidad en el catálogo.`,
      });
    }
  }

  // B6 — Al menos 1 profesional activo
  if (input.profesionales.length === 0) {
    bloqueos.push({
      codigo: "sin_profesionales",
      mensaje: "No hay profesionales activos registrados en la clínica.",
      accionSugerida:
        "Crear al menos un profesional activo en el panel de administración antes de ir a producción.",
    });
  }

  // B7 — Cada profesional tiene especialidad válida en catálogo
  for (const prof of input.profesionales) {
    if (!catalogoActivo.has(prof.especialidad)) {
      bloqueos.push({
        codigo: "profesional_especialidad_invalida",
        mensaje: `Profesional "${prof.nombre}" tiene especialidad "${prof.especialidad}" que no está en el catálogo activo.`,
        accionSugerida: `Actualizar la especialidad de ${prof.nombre} a un valor exacto del catálogo (con tilde, mayúsculas exactas).`,
      });
    }
  }

  // B8 — Prescriptores tienen número y tipo de registro
  for (const prof of input.profesionales.filter((p) => p.puede_prescribir)) {
    if (!prof.numero_registro || !prof.tipo_registro) {
      bloqueos.push({
        codigo: "prescriptor_sin_registro",
        mensaje: `${prof.nombre} tiene puede_prescribir=true pero le falta numero_registro o tipo_registro.`,
        accionSugerida: `Completar el número y tipo de registro de ${prof.nombre} (ej: SIS 12345 / Colegio Kinesiólogos).`,
      });
    }
  }

  // B9 — M7 activo → al menos 1 prescriptor
  if (modulos.includes("M7_prescripciones")) {
    const hasPrescriptor = input.profesionales.some((p) => p.puede_prescribir);
    if (!hasPrescriptor) {
      bloqueos.push({
        codigo: "m7_sin_prescriptores",
        mensaje:
          "M7 (Prescripciones) está activo pero ningún profesional tiene puede_prescribir=true.",
        accionSugerida:
          "Activar puede_prescribir en al menos un profesional y completar su número de registro.",
      });
    }
  }

  // B10 — M8 activo → al menos 1 con puede_indicar_examenes
  if (modulos.includes("M8_examenes")) {
    const hasIndicador = input.profesionales.some((p) => p.puede_indicar_examenes);
    if (!hasIndicador) {
      bloqueos.push({
        codigo: "m8_sin_indicadores_examenes",
        mensaje:
          "M8 (Exámenes) está activo pero ningún profesional tiene puede_indicar_examenes=true.",
        accionSugerida: "Activar puede_indicar_examenes en al menos un profesional.",
      });
    }
  }

  // ── ADVERTENCIAS ─────────────────────────────────────────────────────────────

  // W1 — Todos los profesionales con número de registro (M9 epicrisis lo usa)
  for (const prof of input.profesionales.filter((p) => !p.puede_prescribir)) {
    if (!prof.numero_registro || !prof.tipo_registro) {
      advertencias.push({
        codigo: "profesional_sin_registro",
        mensaje: `${prof.nombre} no tiene número ni tipo de registro profesional.`,
        accionSugerida: `Completar numero_registro y tipo_registro de ${prof.nombre} (requerido para epicrisis en M9).`,
      });
    }
  }

  // W2 — Cada especialidad activa tiene al menos 1 profesional asignado
  for (const esp of especialidades) {
    const hasProf = input.profesionales.some((p) => p.especialidad === esp);
    if (!hasProf) {
      advertencias.push({
        codigo: "especialidad_sin_profesional",
        mensaje: `La especialidad "${esp}" está activa pero no hay profesionales con esa especialidad.`,
        accionSugerida: `Asignar un profesional a "${esp}" o desactivar la especialidad si no corresponde.`,
      });
    }
  }

  // W3 — Cada profesional vinculado a al menos 1 admin_user
  for (const prof of input.profesionales) {
    const links = input.adminLinksByProfesional[prof.id] ?? [];
    if (links.length === 0) {
      advertencias.push({
        codigo: "profesional_sin_admin_user",
        mensaje: `${prof.nombre} no está vinculado a ningún admin_user y no podrá iniciar sesión.`,
        accionSugerida: `Crear un admin_user con rol 'profesional' y vincularlo en admin_user_profesionales.`,
      });
    }
  }

  // W4 — Branding configurado
  const branding = input.clinica.config?.branding;
  if (!branding || Object.keys(branding as object).length === 0) {
    advertencias.push({
      codigo: "sin_branding",
      mensaje: "La clínica no tiene branding configurado (colores, logo).",
      accionSugerida:
        "Configurar config.branding en la tabla clinicas con paleta de colores kp-* y logo.",
    });
  }

  return { ready: bloqueos.length === 0, bloqueos, advertencias };
}

// ── Fetcher de datos desde DB ─────────────────────────────────────────────────

async function fetchValidationInput(slug: string): Promise<ClinicaValidationInput> {
  const supabase = createServiceClient();

  // 1. Clínica
  const { data: clinica } = await supabase
    .from("clinicas")
    .select("id, slug, config")
    .eq("slug", slug)
    .maybeSingle();

  if (!clinica) {
    return {
      clinica: null,
      fceConfig: null,
      especialidadesCatalogo: [],
      profesionales: [],
      adminLinksByProfesional: {},
    };
  }

  // 2. Paralelo: config FCE + catálogo especialidades + profesionales activos
  const [fceConfigRes, catalogoRes, profRes] = await Promise.all([
    supabase
      .from("clinicas_fce_config")
      .select("modulos_activos, especialidades_activas")
      .eq("id_clinica", clinica.id)
      .maybeSingle(),
    supabase.from("especialidades_catalogo").select("codigo, activa"),
    supabase
      .from("profesionales")
      .select(
        "id, nombre, especialidad, numero_registro, tipo_registro, puede_prescribir, puede_indicar_examenes"
      )
      .eq("id_clinica", clinica.id)
      .eq("activo", true),
  ]);

  const fceConfig = fceConfigRes.data
    ? {
        modulos_activos: (fceConfigRes.data.modulos_activos as string[]) ?? [],
        especialidades_activas: (fceConfigRes.data.especialidades_activas as string[]) ?? [],
      }
    : null;

  const especialidadesCatalogo = (catalogoRes.data ?? []) as EspecialidadCatalogoRow[];
  const profesionales = (profRes.data ?? []) as ProfesionalRow[];

  // 3. Links profesional → admin_user (falla silenciosamente si la tabla no existe)
  const adminLinksByProfesional: Record<string, string[]> = {};
  if (profesionales.length > 0) {
    try {
      const profIds = profesionales.map((p) => p.id);
      const { data: links } = await supabase
        .from("admin_user_profesionales")
        .select("profesional_id, admin_user_id")
        .in("profesional_id", profIds);

      for (const link of links ?? []) {
        const row = link as { profesional_id: string; admin_user_id: string };
        if (!adminLinksByProfesional[row.profesional_id]) {
          adminLinksByProfesional[row.profesional_id] = [];
        }
        adminLinksByProfesional[row.profesional_id].push(row.admin_user_id);
      }
    } catch {
      // admin_user_profesionales puede no existir en setups más viejos
    }
  }

  return {
    clinica: clinica as ClinicaRow,
    fceConfig,
    especialidadesCatalogo,
    profesionales,
    adminLinksByProfesional,
  };
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Valida una clínica para go-live. Usa service role (solo lectura).
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
export async function validateClinica(slug: string): Promise<ValidationResult> {
  const input = await fetchValidationInput(slug);
  return validateClinicaData(input);
}
