"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/patients";
import type { ICDSearchResult, ICDEntity } from "@/lib/icd/types";
import { log } from "@/lib/logger";
import { buscarDiagnostico } from "@/lib/icd/search";
import { obtenerEntidad } from "@/lib/icd/entity";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Verifica sesión + pertenencia a clínica activa antes de usar las credenciales
 * de la plataforma contra la API de la OMS. Sin esto, las actions eran un proxy
 * abierto consumible por anónimos.
 */
async function requireClinicMember(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: "No autenticado" };

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (!admin?.id_clinica) {
    return { ok: false, error: "Sin acceso a esta clínica" };
  }
  return { ok: true, userId: user.id };
}

export async function searchDiagnosticos(
  query: string,
  chaptersFilter?: string,
): Promise<ActionResult<ICDSearchResult[]>> {
  const auth = await requireClinicMember();
  if (!auth.ok) return { success: false, error: auth.error };

  const rl = checkRateLimit(`icd:search:${auth.userId}`, 30, 60_000);
  if (!rl.allowed) {
    return { success: false, error: "Demasiadas búsquedas. Espera un momento e inténtalo de nuevo." };
  }

  try {
    const results = await buscarDiagnostico(query, 'es', chaptersFilter);
    return { success: true, data: results };
  } catch (error) {
    log("error", { action: "icd_search_diagnosticos", error });
    return { success: true, data: [] };
  }
}

export async function getEntityDetail(entityId: string): Promise<ActionResult<ICDEntity>> {
  const auth = await requireClinicMember();
  if (!auth.ok) return { success: false, error: auth.error };

  const rl = checkRateLimit(`icd:entity:${auth.userId}`, 30, 60_000);
  if (!rl.allowed) {
    return { success: false, error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." };
  }

  try {
    const entity = await obtenerEntidad(entityId);
    return { success: true, data: entity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al obtener detalle de entidad";
    log("error", { action: "icd_get_entity", detail: entityId, error });
    return { success: false, error: message };
  }
}