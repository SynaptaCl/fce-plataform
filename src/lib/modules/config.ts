/**
 * Helpers de configuración de clínica en runtime.
 *
 * getClinicaConfig() lee la fila de clinicas_config y la retorna tipada.
 * isModuleEnabled() / isEspecialidadEnabled() son helpers puros sobre la config.
 */

import { createClient } from "@/lib/supabase/server";
import type { ModuleId, EspecialidadId } from "./registry";

// ============================================================================
// TIPO DE CONFIG RUNTIME
// ============================================================================

export interface ClinicaConfig {
  idClinica: string;
  nombreDisplay: string;
  slug: string;
  logoUrl: string | null;
  modulosActivos: ModuleId[];
  especialidadesActivas: EspecialidadId[];
  tokensColor: Record<string, string>;
  configModulos: Record<string, unknown>;
  updatedAt: string;
}

// ============================================================================
// FETCH DESDE DB
// ============================================================================

/**
 * Lee la configuración de una clínica desde clinicas_config.
 * Retorna null si la clínica no tiene fila de config (estado inválido).
 */
export async function getClinicaConfig(idClinica: string): Promise<ClinicaConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clinicas_config")
    .select(
      "id_clinica, nombre_display, slug, logo_url, modulos_activos, especialidades_activas, tokens_color, config_modulos, updated_at"
    )
    .eq("id_clinica", idClinica)
    .single();

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[getClinicaConfig] No se encontró config para ${idClinica}:`, error?.message);
    }
    return null;
  }

  return {
    idClinica: data.id_clinica,
    nombreDisplay: data.nombre_display,
    slug: data.slug,
    logoUrl: data.logo_url,
    modulosActivos: (data.modulos_activos ?? []) as ModuleId[],
    especialidadesActivas: (data.especialidades_activas ?? []) as EspecialidadId[],
    tokensColor: (data.tokens_color ?? {}) as Record<string, string>,
    configModulos: (data.config_modulos ?? {}) as Record<string, unknown>,
    updatedAt: data.updated_at,
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
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { config: null, userId: null, idClinica: null };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .single();

  const idClinica = adminRow?.id_clinica ?? null;

  if (!idClinica) {
    return { config: null, userId: user.id, idClinica: null };
  }

  const config = await getClinicaConfig(idClinica);

  return { config, userId: user.id, idClinica };
}

// ============================================================================
// HELPERS PUROS
// ============================================================================

export function isModuleEnabled(config: ClinicaConfig, moduleId: ModuleId): boolean {
  return config.modulosActivos.includes(moduleId);
}

export function isEspecialidadEnabled(
  config: ClinicaConfig,
  especialidadId: EspecialidadId
): boolean {
  return config.especialidadesActivas.includes(especialidadId);
}

/**
 * Lee un override granular de config_modulos.
 * Ejemplo de uso: getModuleConfig(config, "M2_anamnesis", "red_flags_obligatorio")
 */
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
