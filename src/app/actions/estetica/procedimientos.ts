"use server";

import { requireAuth } from "@/lib/auth";
import { dbError } from "@/lib/modules/guards";
import type { ActionResult } from "@/app/actions/patients";
import type { ProcedimientoEsteticoCatalogo } from "@/types/estetica";

export async function getProcedimientosEsteticosCatalogo(): Promise<
  ActionResult<ProcedimientoEsteticoCatalogo[]>
> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("procedimientos_esteticos_catalogo")
    .select("*")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) return dbError("procedimientos_esteticos_catalogo", error);
  return { success: true, data: (data ?? []) as ProcedimientoEsteticoCatalogo[] };
}
