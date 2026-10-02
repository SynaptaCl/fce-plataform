/**
 * Fuente única de branding de clínica para el FCE.
 *
 * El branding se lee de la tabla `clinicas_branding` (escrita por `synapta`),
 * NO de `clinicas.config.branding` (jsonb legacy que quedó sin escritor tras
 * el refactor documentado en synapta/docs/otros/PLAN-SPRINTS-ADMIN-REFACTORING.md).
 *
 * Este módulo traduce las columnas de `clinicas_branding` a la forma
 * `BrandingConfig` (claves legacy de `config.branding`) para que los
 * consumidores existentes (Sidebar, BrandingInjector, PDFs) sigan igual.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandingConfig } from "./registry";

export interface ClinicaBrandingRow {
  primary_color: string;
  navy_color: string;
  navy_deep_color: string;
  accent_color: string;
  light_bg_color: string;
  clinic_short_name: string | null;
  clinic_initials: string | null;
  logo_url: string | null;
  /** Overrides propios de la FCE (synapta migración 20261002_02). NULL = hereda el color general. */
  fce_primary_color?: string | null;
  fce_accent_color?: string | null;
  fce_light_bg_color?: string | null;
  fce_sidebar_color?: string | null;
}

/** Oscurece un hex #rrggbb por un factor 0..1. Devuelve undefined si no es válido. */
export function darkenHex(hex: string, factor: number): string | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Traduce una fila de `clinicas_branding` a `BrandingConfig`.
 *
 * Semántica alineada con `synapta/lib/branding.ts` (2026-10-02): `primary_color` es la marca
 * principal, `navy_color` la superficie oscura. `navy_deep` y `primary_hover` se DERIVAN acá
 * (mismas reglas que el módulo canónico de synapta): navy_deep = darken(navy, 0.5);
 * primary_hover = darken(primary, 0.88). La columna `navy_deep_color` es vestigial.
 */
export function clinicasBrandingToConfig(
  row: ClinicaBrandingRow | null | undefined,
): BrandingConfig | null {
  if (!row) return null;
  // Override FCE (fce_*) o, si es NULL, el color general compartido con el chat.
  const primary = row.fce_primary_color ?? row.primary_color;
  const navy = row.fce_sidebar_color ?? row.navy_color;
  return {
    navy,
    navy_deep: darkenHex(navy, 0.5) ?? row.navy_deep_color,
    primary,
    accent: row.fce_accent_color ?? row.accent_color,
    light_bg: row.fce_light_bg_color ?? row.light_bg_color,
    primary_hover: darkenHex(primary, 0.88),
    clinic_initials: row.clinic_initials ?? undefined,
    clinic_short_name: row.clinic_short_name ?? undefined,
    logo_url: row.logo_url ?? undefined,
  };
}

/** Lee y mapea el branding de la clínica desde `clinicas_branding`. */
export async function getClinicaBranding(
  supabase: SupabaseClient,
  idClinica: string,
): Promise<BrandingConfig | null> {
  const { data } = await supabase
    .from("clinicas_branding")
    .select(
      "primary_color, navy_color, navy_deep_color, accent_color, light_bg_color, clinic_short_name, clinic_initials, logo_url, fce_primary_color, fce_accent_color, fce_light_bg_color, fce_sidebar_color",
    )
    .eq("id_clinica", idClinica)
    .maybeSingle();

  return clinicasBrandingToConfig(data as ClinicaBrandingRow | null);
}
