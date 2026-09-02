"use server";

import { dbError } from "@/lib/modules/guards";
import { requireAuth } from "@/lib/auth";
import { getIdClinica } from "@/app/actions/patients";
import type { ActionResult } from "@/app/actions/patients";
import type { ProcedimientoCatalogo } from "@/types/plan-tratamiento";

/**
 * Catálogo dental del FCE: prestaciones_catalogo (dominio synapta, solo-read)
 * con ambito='dental'. Reemplaza a procedimientos_catalogo (deprecado, 0 filas).
 */
export async function getProcedimientosCatalogo(): Promise<
  ActionResult<ProcedimientoCatalogo[]>
> {
  const { supabase, user } = await requireAuth();

  const idClinica = await getIdClinica(supabase, user.id);
  if (!idClinica)
    return { success: false, error: "No se pudo determinar la clínica." };

  const { data, error } = await supabase
    .from("prestaciones_catalogo")
    .select("id, codigo, nombre, categoria, precio_base, afecta_iva, requiere_pieza")
    .eq("id_clinica", idClinica)
    .eq("ambito", "dental")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });

  if (error) return dbError("procedimientos", error);
  return { success: true, data: (data ?? []) as ProcedimientoCatalogo[] };
}
