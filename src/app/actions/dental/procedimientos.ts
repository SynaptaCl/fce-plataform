"use server";

import { dbError } from "@/lib/modules/guards";
import { requireAuth } from "@/lib/auth";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type { ProcedimientoCatalogo } from "@/types/plan-tratamiento";

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

  if (error) return dbError("procedimientos", error);
  return { success: true, data: (data ?? []) as ProcedimientoCatalogo[] };
}
