"use server";

import type { ActionResult } from "@/app/actions/patients";
import type { ICDSearchResult, ICDEntity } from "@/lib/icd/types";
import { log } from "@/lib/logger";
import { buscarDiagnostico } from "@/lib/icd/search";
import { obtenerEntidad } from "@/lib/icd/entity";

export async function searchDiagnosticos(
  query: string,
  chaptersFilter?: string,
): Promise<ActionResult<ICDSearchResult[]>> {
  try {
    const results = await buscarDiagnostico(query, 'es', chaptersFilter);
    return { success: true, data: results };
  } catch (error) {
    log("error", { action: "icd_search_diagnosticos", error });
    return { success: true, data: [] };
  }
}

export async function getEntityDetail(entityId: string): Promise<ActionResult<ICDEntity>> {
  try {
    const entity = await obtenerEntidad(entityId);
    return { success: true, data: entity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al obtener detalle de entidad";
    log("error", { action: "icd_get_entity", detail: entityId, error });
    return { success: false, error: message };
  }
}