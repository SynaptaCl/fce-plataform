"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfesionalActivo } from "@/lib/fce/profesional";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthResult {
  supabase: SupabaseClient;
  user: User;
}

export interface FCEContext extends AuthResult {
  idClinica: string;
  rol: string;
  profesionalId: string | null;
  especialidad: string | null;
}

/**
 * Autentica al usuario. Redirige a /login si no hay sesión.
 * Reemplaza las copias inline de requireAuth().
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

/**
 * Contexto completo para server actions clínicas.
 * Combina: auth + id_clinica + rol + profesional activo.
 * Reemplaza el patrón de 5 pasos duplicado en cada action.
 *
 * Lanza redirect si no autenticado.
 * Lanza Error si no tiene admin_users activo (no asignado a clínica).
 */
export async function requireContext(): Promise<FCEContext> {
  const { supabase, user } = await requireAuth();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .single();

  if (!adminRow?.id_clinica) {
    throw new Error("Usuario no asignado a ninguna clínica activa");
  }

  const profesional = await getProfesionalActivo(
    supabase,
    user.id,
    adminRow.id_clinica
  );

  return {
    supabase,
    user,
    idClinica: adminRow.id_clinica,
    rol: adminRow.rol,
    profesionalId: profesional?.id ?? null,
    especialidad: profesional?.especialidad ?? null,
  };
}
