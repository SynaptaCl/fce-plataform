"use server";

import { createClient } from "@/lib/supabase/server";
import { validateClinica } from "@/lib/onboarding/validate-clinica";

const ROLES_QUE_CONFIGURAN = ["superadmin", "director", "admin"];

/**
 * Devuelve el número de bloqueos de la clínica del usuario autenticado.
 * Llamado desde el Sidebar para mostrar el badge de configuración.
 * Retorna 0 si el usuario no tiene rol de configuración o si hay error.
 */
export async function getBloqueoCount(): Promise<number> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id_clinica, rol")
      .eq("auth_id", user.id)
      .eq("activo", true)
      .single();

    if (!adminRow?.id_clinica) return 0;
    if (!ROLES_QUE_CONFIGURAN.includes(adminRow.rol as string)) return 0;

    const { data: clinica } = await supabase
      .from("clinicas")
      .select("slug")
      .eq("id", adminRow.id_clinica)
      .single();

    if (!clinica?.slug) return 0;

    const result = await validateClinica(clinica.slug as string);
    return result.bloqueos.length;
  } catch {
    return 0;
  }
}
