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

  // admin_users puede tener varias filas (UNIQUE(auth_id, id_clinica) → multi-clínica).
  // Traemos todas las activas SIN .single(): .single() crashea (PGRST116/>1 fila) en
  // usuarios multi-clínica o con filas activas+inactivas.
  const { data: adminRows, error } = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!adminRows || adminRows.length === 0) {
    throw new Error("Usuario no asignado a ninguna clínica activa");
  }

  // Perfil profesional activo (respeta cookie id_profesional_activo). Se consulta sin
  // acotar por clínica para que, en multi-clínica, la cookie elija la clínica correcta.
  const profesional = await getProfesionalActivo(supabase, user.id);

  // Clínica activa = la del profesional si coincide con un admin_users activo;
  // si no (p.ej. recepcionista/director sin perfil, o profesional en clínica inactiva),
  // cae a la primera admin_users activa (determinista por created_at).
  let idClinica = adminRows[0].id_clinica;
  let rol = adminRows[0].rol;
  if (profesional) {
    const match = adminRows.find((r) => r.id_clinica === profesional.id_clinica);
    if (match) {
      idClinica = match.id_clinica;
      rol = match.rol;
    }
  }

  return {
    supabase,
    user,
    idClinica,
    rol,
    profesionalId: profesional?.id ?? null,
    especialidad: profesional?.especialidad ?? null,
  };
}
