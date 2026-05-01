import { SupabaseClient } from '@supabase/supabase-js'

export interface InstrumentosResult {
  aplicaciones: Array<{
    instrumento: string
    primera_aplicacion: { fecha: string; puntaje: number | null; interpretacion: string | null }
    ultima_aplicacion: { fecha: string; puntaje: number | null; interpretacion: string | null }
    total_aplicaciones: number
  }>
}

interface AplicacionRaw {
  id_instrumento: string
  puntaje_total: number | null
  interpretacion: string | null
  aplicado_at: string
  instrumentos_valoracion: { nombre: string } | { nombre: string }[] | null
}

export async function extraerInstrumentos(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<InstrumentosResult> {
  const { data } = await supabase
    .from('instrumentos_aplicados')
    .select('id_instrumento, puntaje_total, interpretacion, aplicado_at, instrumentos_valoracion(nombre)')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .order('aplicado_at', { ascending: true })

  if (!data || data.length === 0) return { aplicaciones: [] }

  const gruposPorInstrumento = new Map<string, AplicacionRaw[]>()
  for (const row of data as unknown as AplicacionRaw[]) {
    const iv = row.instrumentos_valoracion
    const nombreIv = Array.isArray(iv) ? iv[0]?.nombre : iv?.nombre
    const nombre = nombreIv ?? row.id_instrumento
    if (!gruposPorInstrumento.has(nombre)) gruposPorInstrumento.set(nombre, [])
    gruposPorInstrumento.get(nombre)!.push(row)
  }

  const aplicaciones: InstrumentosResult['aplicaciones'] = []
  for (const [nombre, rows] of gruposPorInstrumento) {
    const primera = rows[0]
    const ultima = rows[rows.length - 1]
    aplicaciones.push({
      instrumento: nombre,
      primera_aplicacion: {
        fecha: new Date(primera.aplicado_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }),
        puntaje: primera.puntaje_total,
        interpretacion: primera.interpretacion,
      },
      ultima_aplicacion: {
        fecha: new Date(ultima.aplicado_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }),
        puntaje: ultima.puntaje_total,
        interpretacion: ultima.interpretacion,
      },
      total_aplicaciones: rows.length,
    })
  }

  return { aplicaciones }
}
