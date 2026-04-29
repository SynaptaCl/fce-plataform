"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type { ProcedimientoCatalogo } from "@/types/plan-tratamiento";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function getProcedimientosCatalogo(): Promise<
  ActionResult<ProcedimientoCatalogo[]>
> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const { data, error } = await supabase
    .from("procedimientos_catalogo")
    .select("*")
    .eq("id_clinica", idClinica)
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ProcedimientoCatalogo[] };
}
