"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/modules/guards";
import type { PlantillaDominio } from "@/types/plantilla-dominio";

// ── Helper: sesión activa ──────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

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
