import { SupabaseClient } from '@supabase/supabase-js'
import { isRealDbError } from './db-error'

export interface MedicacionResult {
  prescripciones_activas: Array<{
    principio_activo: string
    nombre_comercial: string | null
    dosis: string | null
    frecuencia: string | null
    via: string | null
    prescrito_por: string | null
  }>
  prescripciones_historicas_count: number
}

interface MedicamentoRaw {
  principio_activo?: string
  nombre_comercial?: string | null
  dosis?: string | null
  frecuencia?: string | null
  via?: string | null
}

export async function extraerMedicacion(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<MedicacionResult> {
  const { data, error } = await supabase
    .from('fce_prescripciones')
    .select('medicamentos, firmado_at, prof_nombre_snapshot')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .eq('firmado', true)
    .order('created_at', { ascending: false })

  if (isRealDbError(error)) throw new Error('extraerMedicacion: query failed')

  if (!data || data.length === 0) {
    return { prescripciones_activas: [], prescripciones_historicas_count: 0 }
  }

  // Últimas 5 firmadas como "activas", el resto históricas
  const activas = data.slice(0, 5)
  const historicasCount = Math.max(0, data.length - 5)

  const seen = new Set<string>()
  const prescripciones_activas: MedicacionResult['prescripciones_activas'] = []

  for (const presc of activas) {
    const meds = (presc.medicamentos as MedicamentoRaw[] | null) ?? []
    for (const med of meds) {
      const pa = med.principio_activo ?? 'Desconocido'
      if (!seen.has(pa)) {
        seen.add(pa)
        prescripciones_activas.push({
          principio_activo: pa,
          nombre_comercial: med.nombre_comercial ?? null,
          dosis: med.dosis ?? null,
          frecuencia: med.frecuencia ?? null,
          via: med.via ?? null,
          prescrito_por: presc.prof_nombre_snapshot ?? null,
        })
      }
    }
  }

  return { prescripciones_activas, prescripciones_historicas_count: historicasCount }
}
