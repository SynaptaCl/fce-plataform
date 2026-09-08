"use server";

import { requireContext } from "@/lib/auth";
import { dbError } from "@/lib/modules/guards";
import type { ActionResult } from "@/app/actions/patients";
import type { ProcedimientoEsteticoCatalogo } from "@/types/estetica";

export async function getProcedimientosEsteticosCatalogo(): Promise<
  ActionResult<ProcedimientoEsteticoCatalogo[]>
> {
  // I4 — requireContext() en vez de requireAuth(), más el filtro explícito
  // global-o-propio (mismo criterio que buscarMedicamentos/searchExamenes:
  // catálogo global con id_clinica NULL + catálogo propio de la clínica).
  const { supabase, idClinica } = await requireContext();

  const { data, error } = await supabase
    .from("procedimientos_esteticos_catalogo")
    .select("*")
    .eq("activo", true)
    .or(`id_clinica.is.null,id_clinica.eq.${idClinica}`)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) return dbError("procedimientos_esteticos_catalogo", error, { id_clinica: idClinica });
  return { success: true, data: (data ?? []) as ProcedimientoEsteticoCatalogo[] };
}
