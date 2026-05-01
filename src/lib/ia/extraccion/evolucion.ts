import { SupabaseClient } from '@supabase/supabase-js'
import { differenceInDays } from 'date-fns'

export interface EvolucionResult {
  total_sesiones: number
  primera_sesion: string | null
  ultima_sesion: string | null
  dias_en_tratamiento: number | null
  frecuencia_semanal_estimada: number | null
  ultimas_notas: Array<{
    fecha: string
    tipo: 'soap' | 'clinica'
    profesional: string | null
    especialidad: string | null
    resumen_truncado: string
    tiene_diagnostico: boolean
    tiene_plan: boolean
  }>
}

export async function extraerEvolucion(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<EvolucionResult> {
  const [encuentrosRes, notasClinicasRes, notasSoapRes] = await Promise.all([
    supabase
      .from('fce_encuentros')
      .select('id, started_at, especialidad, id_profesional')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('status', 'finalizado')
      .order('started_at', { ascending: false }),
    supabase
      .from('fce_notas_clinicas')
      .select('contenido, diagnostico, plan, created_at, created_by, id_encuentro')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('fce_notas_soap')
      .select('subjetivo, objetivo, analisis_cif, plan, created_at, firmado_por, id_encuentro')
      .eq('id_paciente', idPaciente)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const encuentros = encuentrosRes.data ?? []
  const total_sesiones = encuentros.length

  const encounter_map = new Map(
    encuentros.map((e: { id: string; especialidad: string }) => [e.id, e.especialidad])
  )

  const profs_ids = new Set<string>()
  for (const nc of notasClinicasRes.data ?? []) {
    if (nc.created_by) profs_ids.add(nc.created_by)
  }
  for (const ns of notasSoapRes.data ?? []) {
    if (ns.firmado_por) profs_ids.add(ns.firmado_por)
  }

  let prof_map = new Map<string, string>()
  if (profs_ids.size > 0) {
    const { data: profs } = await supabase
      .from('profesionales')
      .select('id, nombre')
      .in('id', Array.from(profs_ids))
    for (const p of profs ?? []) {
      prof_map.set(p.id, p.nombre)
    }
  }

  // Filtrar notas SOAP por clínica via encuentros conocidos
  const encuentroIdsClinica = new Set(encuentros.map((e: { id: string }) => e.id))
  const soapFiltradas = (notasSoapRes.data ?? []).filter((ns: { id_encuentro: string | null }) =>
    ns.id_encuentro ? encuentroIdsClinica.has(ns.id_encuentro) : false
  )

  const notas: EvolucionResult['ultimas_notas'] = []

  for (const nc of notasClinicasRes.data ?? []) {
    const contenido = (nc.contenido as string) ?? ''
    notas.push({
      fecha: new Date(nc.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }),
      tipo: 'clinica',
      profesional: nc.created_by ? (prof_map.get(nc.created_by) ?? null) : null,
      especialidad: nc.id_encuentro ? (encounter_map.get(nc.id_encuentro) ?? null) : null,
      resumen_truncado: contenido.length > 300 ? contenido.substring(0, 300) + '...' : contenido,
      tiene_diagnostico: !!nc.diagnostico,
      tiene_plan: !!nc.plan,
    })
  }

  for (const ns of soapFiltradas) {
    const contenido = [ns.subjetivo, ns.objetivo, ns.plan].filter(Boolean).join(' | ')
    notas.push({
      fecha: new Date(ns.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }),
      tipo: 'soap',
      profesional: ns.firmado_por ? (prof_map.get(ns.firmado_por) ?? null) : null,
      especialidad: ns.id_encuentro ? (encounter_map.get(ns.id_encuentro) ?? null) : null,
      resumen_truncado: contenido.length > 300 ? contenido.substring(0, 300) + '...' : contenido,
      tiene_diagnostico: !!ns.analisis_cif,
      tiene_plan: !!ns.plan,
    })
  }

  notas.sort((a, b) => b.fecha.localeCompare(a.fecha))
  const ultimas_notas = notas.slice(0, 10)

  // Métricas de sesiones
  let primera_sesion: string | null = null
  let ultima_sesion: string | null = null
  let dias_en_tratamiento: number | null = null
  let frecuencia_semanal_estimada: number | null = null

  if (encuentros.length > 0) {
    const sorted = [...encuentros].sort((a: { started_at: string | null }, b: { started_at: string | null }) =>
      (a.started_at ?? '').localeCompare(b.started_at ?? '')
    )
    primera_sesion = sorted[0].started_at
      ? new Date(sorted[0].started_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
      : null
    ultima_sesion = sorted[sorted.length - 1].started_at
      ? new Date(sorted[sorted.length - 1].started_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
      : null

    if (primera_sesion && ultima_sesion) {
      dias_en_tratamiento = differenceInDays(new Date(ultima_sesion), new Date(primera_sesion))
      if (dias_en_tratamiento > 0) {
        frecuencia_semanal_estimada = Math.round((total_sesiones / (dias_en_tratamiento / 7)) * 10) / 10
      }
    }
  }

  return {
    total_sesiones,
    primera_sesion,
    ultima_sesion,
    dias_en_tratamiento,
    frecuencia_semanal_estimada,
    ultimas_notas,
  }
}
