import type { SupabaseClient } from "@supabase/supabase-js";
import type { PIIPaciente } from "./sanitize-pii";

/**
 * Trae los campos PII del paciente para seudonimizar el texto antes de enviarlo a Claude.
 * Usa el cliente con RLS del caller — si el paciente no pertenece a la clínica, retorna {}.
 */
export async function fetchPiiPaciente(
  supabase: SupabaseClient,
  idPaciente: string
): Promise<PIIPaciente> {
  const { data } = await supabase
    .from("pacientes")
    .select("nombre, apellido_paterno, apellido_materno, rut, telefono, email")
    .eq("id", idPaciente)
    .maybeSingle();
  return (data as PIIPaciente | null) ?? {};
}
