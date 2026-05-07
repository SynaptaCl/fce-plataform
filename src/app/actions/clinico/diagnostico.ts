"use server";

import type { ActionResult } from "@/app/actions/patients";
import type { ICDSearchResult, ICDEntity } from "@/lib/icd/types";
import { buscarDiagnostico } from "@/lib/icd/search";
import { obtenerEntidad } from "@/lib/icd/entity";

export async function searchDiagnosticos(query: string): Promise<ActionResult<ICDSearchResult[]>> {
  try {
    const results = await buscarDiagnostico(query);
    return { success: true, data: results };
  } catch (error) {
    console.error("[ICD] Error en búsqueda de diagnósticos:", error);
    return { success: true, data: [] };
  }
}

export async function getEntityDetail(entityId: string): Promise<ActionResult<ICDEntity>> {
  try {
    const entity = await obtenerEntidad(entityId);
    return { success: true, data: entity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al obtener detalle de entidad";
    console.error(`[ICD] Error obteniendo entidad ${entityId}:`, error);
    return { success: false, error: message };
  }
}