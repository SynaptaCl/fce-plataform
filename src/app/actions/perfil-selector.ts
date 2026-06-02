"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfesionalesDelUsuario } from "@/lib/fce/profesional";
import { getIdClinica } from "@/app/actions/patients";

const COOKIE_NAME = "id_profesional_activo";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export async function setPerfilActivo(profesionalId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const idClinica = await getIdClinica(supabase, user.id);

  // Validar que el profesionalId pertenece al usuario actual en esta clínica
  const perfiles = await getProfesionalesDelUsuario(
    supabase,
    user.id,
    idClinica ?? undefined
  );
  const valido = perfiles.some((p) => p.id === profesionalId);
  if (!valido) return; // ignorar silenciosamente IDs inválidos

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, profesionalId, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
