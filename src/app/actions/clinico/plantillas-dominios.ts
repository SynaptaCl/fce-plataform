"use server";

import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/modules/guards";
import type { PlantillaDominio } from "@/types/plantilla-dominio";

// ── getPlantillasDominios ──────────────────────────────────────────────────

/**
 * Retorna todas las plantillas de dominio activas, ordenadas por campo `orden`.
 * Es catálogo global de lectura — no requiere assertModuleEnabled.
 */
export async function getPlantillasDominios(): Promise<ActionResult<PlantillaDominio[]>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("plantillas_dominios")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PlantillaDominio[] };
}

// ── getPlantillaDominio ────────────────────────────────────────────────────

/**
 * Retorna la plantilla de dominio activa para un código de condición específico.
 */
export async function getPlantillaDominio(
  condicionCodigo: string
): Promise<ActionResult<PlantillaDominio>> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("plantillas_dominios")
    .select("*")
    .eq("condicion_codigo", condicionCodigo)
    .eq("activo", true)
    .single();

  if (error || !data) {
    return { success: false, error: "Plantilla de dominio no encontrada." };
  }
  return { success: true, data: data as PlantillaDominio };
}
