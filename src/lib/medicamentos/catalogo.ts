import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicamentoConPresentaciones } from "@/types/medicamento";
import type { PerfilPrescripcion } from "@/lib/prescripciones/perfiles";
import { log } from "@/lib/logger";

const MEDICAMENTO_SELECT = "*, medicamentos_presentaciones(*)";

/** Sanea el término antes de interpolarlo en un filtro .or() de PostgREST — evita romper el parser de filtros con ',' '(' ')'. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, " ").trim();
}

/**
 * Busca medicamentos en `medicamentos` (DCI, entidad principal) con sus
 * `medicamentos_presentaciones` (marca/laboratorio) embebidas.
 * Busca por principio_activo O por nombre_comercial de alguna presentación vigente.
 * RLS garantiza que el resultado incluye solo el catálogo global (id_clinica=null)
 * más el catálogo privado de la clínica del usuario.
 *
 * @param supabase Cliente Supabase (server)
 * @param query Término de búsqueda (mínimo 2 caracteres)
 * @param perfilPrescripcion Perfil del profesional — filtra medicamentos autorizados
 * @param limit Máximo de resultados (default 20)
 */
export async function buscarMedicamentos(
  supabase: SupabaseClient,
  query: string,
  perfilPrescripcion?: PerfilPrescripcion,
  limit = 20
): Promise<MedicamentoConPresentaciones[]> {
  if (!query || query.trim().length < 2) return [];

  const searchTerm = sanitizeSearchTerm(query);
  if (searchTerm.length < 2) return [];

  // Coincidencias por marca comercial (nivel presentación) — solo vigentes/activas.
  const { data: presentacionesMatch, error: presError } = await supabase
    .from("medicamentos_presentaciones")
    .select("id_medicamento")
    .eq("activo", true)
    .eq("estado", "vigente")
    .ilike("nombre_comercial", `%${searchTerm}%`)
    .limit(50);

  if (presError) {
    log("error", { action: "buscar_medicamentos_presentaciones", error: presError });
  }

  const idsPorMarca = Array.from(
    new Set((presentacionesMatch ?? []).map((p) => p.id_medicamento))
  );

  let q = supabase
    .from("medicamentos")
    .select(MEDICAMENTO_SELECT)
    .eq("activo", true)
    .eq("medicamentos_presentaciones.activo", true)
    .eq("medicamentos_presentaciones.estado", "vigente");

  const orClauses = [`principio_activo.ilike.%${searchTerm}%`];
  if (idsPorMarca.length > 0) {
    orClauses.push(`id.in.(${idsPorMarca.join(",")})`);
  }
  q = q.or(orClauses.join(","));

  if (perfilPrescripcion) {
    q = q.contains("perfiles_autorizados", [perfilPrescripcion]);
  }

  const { data, error } = await q
    .order("principio_activo", { ascending: true })
    .limit(limit);

  if (error) {
    log("error", { action: "buscar_medicamentos", error });
    return [];
  }

  return (data ?? []) as unknown as MedicamentoConPresentaciones[];
}

/**
 * Obtiene un medicamento por ID exacto, con sus presentaciones vigentes embebidas.
 */
export async function getMedicamentoPorId(
  supabase: SupabaseClient,
  id: string
): Promise<MedicamentoConPresentaciones | null> {
  const { data, error } = await supabase
    .from("medicamentos")
    .select(MEDICAMENTO_SELECT)
    .eq("id", id)
    .eq("activo", true)
    .eq("medicamentos_presentaciones.activo", true)
    .eq("medicamentos_presentaciones.estado", "vigente")
    .maybeSingle();

  if (error) {
    log("error", { action: "obtener_medicamento", error });
    return null;
  }

  return data as unknown as MedicamentoConPresentaciones | null;
}
