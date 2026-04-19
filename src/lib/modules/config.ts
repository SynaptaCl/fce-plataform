/**
 * Helpers de configuración de clínica en runtime.
 *
 * Lee de DOS fuentes:
 *   - clinicas_fce_config: módulos FCE activos, especialidades activas, overrides
 *   - clinicas: metadatos (nombre, slug) + config.branding (paleta de colores)
 *
 * mapBrandingToTokens() unifica la paleta del chatbot/marketing con la del FCE.
 */

import { createClient } from "@/lib/supabase/server";
import type { ModuleId, EspecialidadCodigo, FceTokens, BrandingConfig } from "./registry";
import { mapBrandingToTokens, DEFAULT_FCE_TOKENS } from "./registry";

// ============================================================================
// TIPO DE CONFIG RUNTIME
// ============================================================================

export interface ClinicaConfig {
  idClinica: string;
  nombreDisplay: string;
  slug: string;
  clinicInitials: string;
  logoUrl: string | null;
  modulosActivos: ModuleId[];
  especialidadesActivas: EspecialidadCodigo[];
  tokensColor: FceTokens;
  configModulos: Record<string, unknown>;
  updatedAt: string | null;
}

// ============================================================================
// FETCH DESDE DB
// ============================================================================

/**
 * Lee config completa combinando clinicas + clinicas_fce_config.
 * Retorna null si la clínica no existe o si no tiene config FCE.
 */
export async function getClinicaConfig(idClinica: string): Promise<ClinicaConfig | null> {
  const supabase = await createClient();

  // Query 1: datos base + branding desde clinicas
  const { data: clinica, error: errClinica } = await supabase
    .from("clinicas")
    .select("id, nombre, slug, config")
    .eq("id", idClinica)
    .single();

  if (errClinica || !clinica) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getClinicaConfig] Clínica no encontrada:", idClinica, errClinica?.message);
    }
    return null;
  }

  // Query 2: config FCE específica
  const { data: fceConfig, error: errFce } = await supabase
    .from("clinicas_fce_config")
    .select("modulos_activos, especialidades_activas, config_modulos, updated_at")
    .eq("id_clinica", idClinica)
    .single();

  if (errFce || !fceConfig) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[getClinicaConfig] Sin config FCE para ${clinica.slug}. ¿Onboarding incompleto?`,
        errFce?.message
      );
    }
    return null;
  }

  // Mapear branding → tokens FCE
  const branding = (clinica.config?.branding ?? null) as BrandingConfig | null;
  const tokens = mapBrandingToTokens(branding);
  const clinicInitials = branding?.clinic_initials ?? clinica.nombre.slice(0, 2).toUpperCase();
  const logoUrl = branding?.logo_url ?? null;

  return {
    idClinica: clinica.id,
    nombreDisplay: clinica.nombre,
    slug: clinica.slug,
    clinicInitials,
    logoUrl,
    modulosActivos: (fceConfig.modulos_activos ?? []) as ModuleId[],
    especialidadesActivas: (fceConfig.especialidades_activas ?? []) as EspecialidadCodigo[],
    tokensColor: tokens,
    configModulos: (fceConfig.config_modulos ?? {}) as Record<string, unknown>,
    updatedAt: fceConfig.updated_at ?? null,
  };
}

/**
 * Fetch combinado: obtiene user + idClinica + config en una sola llamada.
 * Úsalo en layouts/pages de dashboard.
 */
export async function getClinicaConfigFromSession(): Promise<{
  config: ClinicaConfig | null;
  userId: string | null;
  idClinica: string | null;
  rol: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { config: null, userId: null, idClinica: null, rol: null };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica, rol, activo")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  const idClinica = adminRow?.id_clinica ?? null;
  const rol = adminRow?.rol ?? null;

  if (!idClinica) {
    return { config: null, userId: user.id, idClinica: null, rol };
  }

  const config = await getClinicaConfig(idClinica);

  return { config, userId: user.id, idClinica, rol };
}

// ============================================================================
// HELPERS PUROS
// ============================================================================

export function isModuleEnabled(config: ClinicaConfig, moduleId: ModuleId): boolean {
  return config.modulosActivos.includes(moduleId);
}

export function isEspecialidadEnabled(
  config: ClinicaConfig,
  especialidad: EspecialidadCodigo
): boolean {
  return config.especialidadesActivas.includes(especialidad);
}

export function getModuleConfig<T = unknown>(
  config: ClinicaConfig,
  moduleId: ModuleId,
  key: string,
  defaultValue: T
): T {
  const modConfig = config.configModulos[moduleId] as Record<string, unknown> | undefined;
  if (!modConfig) return defaultValue;
  const val = modConfig[key];
  return (val === undefined ? defaultValue : val) as T;
}
