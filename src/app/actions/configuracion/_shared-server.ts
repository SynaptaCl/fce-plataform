"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";
import { logAudit } from "@/lib/audit";

export async function requireConfigAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id_clinica, rol")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (!admin || !(ROLES_QUE_CONFIGURAN as string[]).includes(admin.rol)) {
    redirect("/dashboard?error=sin-permiso");
  }

  return { supabase, user, idClinica: admin.id_clinica as string };
}

export { logAudit };
