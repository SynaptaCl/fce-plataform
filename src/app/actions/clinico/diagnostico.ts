"use server";

import type { ActionResult } from "@/app/actions/patients";
import type { ICDSearchResult, ICDEntity } from "@/lib/icd/types";
import { buscarDiagnostico } from "@/lib/icd/search";
import { obtenerEntidad } from "@/lib/icd/entity";

/**
 * searchDiagnosticos: Expone la búsqueda ICD al cliente vía server action.
 *
 * En caso de error de API: retorna { success: true, data: [] } — degradación elegante.
 * El campo diagnóstico debe seguir funcionando como texto libre aunque la API ICD no responda.
 * No bloquear el flujo clínico por indisponibilidad de la API externa.
 */
export async function searchDiagnosticos(query: string): Promise<ActionResult<ICDSearchResult[]>> {
  try {
    const results = await buscarDiagnostico(query);
    return { success: true, data: results };
  } catch (error) {
    // Degradación elegante: retornar [] en lugar de fallar
    // Permitir que el médico ingrese texto libre sin bloqueos
    console.error("[ICD] Error en búsqueda de diagnósticos:", error);
    return { success: true, data: [] };
  }
}

/**
 * getEntityDetail: Obtiene el detalle completo de una entidad ICD-11.
 *
 * En caso de error: retorna { success: false, error: message }
 */
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
