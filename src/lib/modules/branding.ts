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
 * `primary_hover` se deriva del `navy_color` (el color "primary" del FCE).
 */
export function clinicasBrandingToConfig(
  row: ClinicaBrandingRow | null | undefined,
): BrandingConfig | null {
  if (!row) return null;
  return {
    navy: row.navy_color,
    navy_deep: row.navy_deep_color,
    primary: row.primary_color,
    accent: row.accent_color,
    light_bg: row.light_bg_color,
    primary_hover: darkenHex(row.navy_color, 0.88),
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
      "primary_color, navy_color, navy_deep_color, accent_color, light_bg_color, clinic_short_name, clinic_initials, logo_url",
    )
    .eq("id_clinica", idClinica)
    .maybeSingle();

  return clinicasBrandingToConfig(data as ClinicaBrandingRow | null);
}
