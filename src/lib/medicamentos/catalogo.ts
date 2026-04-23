import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicamentoCatalogo } from "@/types/medicamento";

/**
 * Busca medicamentos en el catálogo por término de búsqueda.
 * Busca en principio_activo + nombre_comercial via ilike.
 * RLS garantiza que el resultado incluye solo el catálogo global (id_clinica=null)
 * más el catálogo privado de la clínica del usuario.
 *
 * @param supabase Cliente Supabase (server)
 * @param query Término de búsqueda (mínimo 2 caracteres)
 * @param limit Máximo de resultados (default 20)
 */
export async function buscarMedicamentos(
  supabase: SupabaseClient,
  query: string,
  limit = 20
): Promise<MedicamentoCatalogo[]> {
  if (!query || query.trim().length < 2) return [];

  const searchTerm = query.trim();

  const { data, error } = await supabase
    .from("medicamentos_catalogo")
    .select("*")
    .eq("activo", true)
    .or(
      `principio_activo.ilike.%${searchTerm}%,nombre_comercial.ilike.%${searchTerm}%`
    )
    .order("principio_activo", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[FCE] Error buscando medicamentos:", error);
    return [];
  }

  return (data ?? []) as MedicamentoCatalogo[];
}

/**
 * Obtiene un medicamento por ID exacto.
 */
export async function getMedicamentoPorId(
  supabase: SupabaseClient,
  id: string
): Promise<MedicamentoCatalogo | null> {
  const { data, error } = await supabase
    .from("medicamentos_catalogo")
    .select("*")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    console.error("[FCE] Error obteniendo medicamento:", error);
    return null;
  }

  return data as MedicamentoCatalogo | null;
}
