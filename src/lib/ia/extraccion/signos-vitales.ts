import { SupabaseClient } from '@supabase/supabase-js'

export interface SignosVitalesResult {
  ultimo_registro: string | null
  fc_promedio: number | null
  pa_sistolica_promedio: number | null
  pa_diastolica_promedio: number | null
  spo2_minimo: number | null
  temp_ultimo: number | null
  total_registros: number
  alertas_vitales: string[]
}

export async function extraerSignosVitales(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<SignosVitalesResult> {
  const { data: encuentros } = await supabase
    .from('fce_encuentros')
    .select('id')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)

  const encuentroIds = (encuentros ?? []).map((e: { id: string }) => e.id)

  if (encuentroIds.length === 0) {
    return { ultimo_registro: null, fc_promedio: null, pa_sistolica_promedio: null, pa_diastolica_promedio: null, spo2_minimo: null, temp_ultimo: null, total_registros: 0, alertas_vitales: [] }
  }

  const { data } = await supabase
    .from('fce_signos_vitales')
    .select('presion_arterial, frecuencia_cardiaca, spo2, temperatura, recorded_at')
    .eq('id_paciente', idPaciente)
    .in('id_encuentro', encuentroIds)
    .order('recorded_at', { ascending: false })
    .limit(5)

  if (!data || data.length === 0) {
    return { ultimo_registro: null, fc_promedio: null, pa_sistolica_promedio: null, pa_diastolica_promedio: null, spo2_minimo: null, temp_ultimo: null, total_registros: 0, alertas_vitales: [] }
  }

  const sistolicas: number[] = []
  const diastolicas: number[] = []

  for (const sv of data) {
    if (sv.presion_arterial) {
      const parts = (sv.presion_arterial as string).split('/')
      const s = Number(parts[0])
      const d = Number(parts[1])
      if (!isNaN(s)) sistolicas.push(s)
      if (!isNaN(d)) diastolicas.push(d)
    }
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const pa_s = avg(sistolicas)
  const pa_d = avg(diastolicas)

  const fcs = data.map((sv: { frecuencia_cardiaca: number | null }) => sv.frecuencia_cardiaca).filter((v): v is number => v !== null)
  const spo2s = data.map((sv: { spo2: number | null }) => sv.spo2).filter((v): v is number => v !== null)

  const alertas_vitales: string[] = []
  if (pa_s !== null && pa_s > 140) alertas_vitales.push('PA sistólica elevada')
  if (pa_s !== null && pa_s < 90) alertas_vitales.push('PA sistólica baja')
  const spo2_min = spo2s.length ? Math.min(...spo2s) : null
  if (spo2_min !== null && spo2_min < 95) alertas_vitales.push('SpO2 bajo')

  const ultimo = data[0]
  return {
    ultimo_registro: ultimo.recorded_at
      ? new Date(ultimo.recorded_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
      : null,
    fc_promedio: avg(fcs),
    pa_sistolica_promedio: pa_s,
    pa_diastolica_promedio: pa_d,
    spo2_minimo: spo2_min,
    temp_ultimo: (ultimo.temperatura as number | null) ?? null,
    total_registros: data.length,
    alertas_vitales,
  }
}
