/**
 * Resuelve el nombre del servicio de una cita.
 *
 * `citas.id_profesional_servicio` es FK a `profesional_servicios.id` (NO a
 * `servicios.id`), así que el nombre se lee vía join `servicios(nombre)`.
 * Solo lectura sobre tablas de synapta.
 *
 * Función server-safe, sin imports de React/Next. Recibe el cliente para poder
 * testearse con un fake (scripts/test-encuentro-servicio.ts).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type ServicioEmbed = { nombre: string | null } | { nombre: string | null }[] | null;

/** PostgREST devuelve el embed como objeto (FK many-to-one) o array según inferencia. */
export function extraerNombreServicio(embed: ServicioEmbed | undefined): string | null {
  const servicio = Array.isArray(embed) ? embed[0] : embed;
  return servicio?.nombre ?? null;
}

export async function getNombreServicioDeProfesionalServicio(
  supabase: SupabaseClient,
  idProfesionalServicio: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profesional_servicios")
    .select("servicios(nombre)")
    .eq("id", idProfesionalServicio)
    .maybeSingle();

  return extraerNombreServicio((data as { servicios?: ServicioEmbed } | null)?.servicios);
}
