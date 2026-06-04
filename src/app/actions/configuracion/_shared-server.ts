"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLES_QUE_CONFIGURAN } from "@/lib/modules/registry";

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

export async function logAuditConfig(
  supabase: SupabaseClient,
  actorId: string,
  accion: string,
  tablaAfectada: string,
  registroId: string,
  idClinica?: string | null
): Promise<void> {
  try {
    await supabase.from("logs_auditoria").insert({
      actor_id: actorId,
      actor_tipo: "admin",
      accion,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      ...(idClinica ? { id_clinica: idClinica } : {}),
    });
  } catch { /* no bloquea */ }
}
