import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * IDs de evoluciones y adendas firmadas HOY, para compararlos con lo que cubre la versión
 * vigente del resumen. Solo IDs (3 queries livianas): se usa al abrir la ficha, donde no
 * queremos reconstruir todo el contexto clínico.
 */
export async function listarCobertura(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<{ idsEvoluciones: string[]; idsAdendas: string[] }> {
  const [clinicas, soap, adendas] = await Promise.all([
    supabase
      .from('fce_notas_clinicas')
      .select('id')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('firmado', true),
    supabase
      .from('fce_notas_soap')
      .select('id')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('firmado', true),
    supabase
      .from('fce_adendas')
      .select('id')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('firmado', true)
      .in('tipo_documento', ['soap', 'nota_clinica']),
  ])
  for (const r of [clinicas, soap, adendas]) {
    if (r.error) throw r.error
  }
  const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id)
  return {
    idsEvoluciones: [...ids(clinicas.data), ...ids(soap.data)],
    idsAdendas: ids(adendas.data),
  }
}
