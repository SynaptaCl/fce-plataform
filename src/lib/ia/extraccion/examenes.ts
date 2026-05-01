import { SupabaseClient } from '@supabase/supabase-js'
import { differenceInDays } from 'date-fns'

export interface ExamenesResult {
  pendientes: Array<{
    examenes_solicitados: string
    solicitado_por: string | null
    fecha_solicitud: string
    dias_pendiente: number
  }>
  completados_count: number
}

interface ExamenRaw {
  nombre?: string
  descripcion?: string
  codigo?: string
}

export async function extraerExamenes(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<ExamenesResult> {
  const { data } = await supabase
    .from('fce_ordenes_examen')
    .select('examenes, estado_resultados, created_by, created_at')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .eq('firmado', true)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) {
    return { pendientes: [], completados_count: 0 }
  }

  const pendientes: ExamenesResult['pendientes'] = []
  let completados_count = 0

  for (const orden of data) {
    if (orden.estado_resultados !== 'pendiente') {
      completados_count++
      continue
    }

    const examenes = (orden.examenes as ExamenRaw[] | null) ?? []
    const examenes_solicitados = examenes
      .map((e) => e.nombre ?? e.descripcion ?? e.codigo ?? 'Examen')
      .join(', ')

    const fecha_solicitud = new Date(orden.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
    const dias_pendiente = differenceInDays(new Date(), new Date(orden.created_at))

    let solicitado_por: string | null = null
    if (orden.created_by) {
      const { data: prof } = await supabase
        .from('profesionales')
        .select('nombre')
        .eq('id', orden.created_by)
        .single()
      solicitado_por = prof?.nombre ?? null
    }

    pendientes.push({ examenes_solicitados, solicitado_por, fecha_solicitud, dias_pendiente })
  }

  return { pendientes, completados_count }
}
