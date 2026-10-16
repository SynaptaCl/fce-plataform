import { SupabaseClient } from '@supabase/supabase-js'
import { stripHtml } from '@/lib/utils'
import { sanitizeRutFromText } from '@/lib/ia/sanitize-pii'
import { isRealDbError } from './db-error'

export interface AdendasResult {
  /** IDs de TODAS las adendas firmadas sobre evoluciones (soap / nota_clinica) del paciente. */
  ids_firmadas: string[]
  /** Las 10 más recientes, para el prompt. */
  recientes: Array<{
    id: string
    fecha: string
    tipo_documento: 'soap' | 'nota_clinica'
    tipo_adenda: 'adenda' | 'errata' | 'anulacion'
    motivo: string
    contenido_truncado: string
  }>
}

const TIPOS_EVOLUCION = ['soap', 'nota_clinica'] as const

/**
 * Adendas / erratas / anulaciones firmadas sobre las evoluciones del paciente.
 * Las notas firmadas son inmutables: toda corrección vive acá. Sin esta sección el
 * resumen ignoraría una errata o anulación y presentaría la nota original como verdad.
 */
export async function extraerAdendas(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<AdendasResult> {
  const [recientesRes, idsRes] = await Promise.all([
    supabase
      .from('fce_adendas')
      .select('id, tipo_documento, tipo_adenda, motivo, contenido, created_at')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('firmado', true)
      .in('tipo_documento', [...TIPOS_EVOLUCION])
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('fce_adendas')
      .select('id')
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .eq('firmado', true)
      .in('tipo_documento', [...TIPOS_EVOLUCION]),
  ])

  if (isRealDbError(recientesRes.error) || isRealDbError(idsRes.error)) {
    throw new Error('extraerAdendas: query failed')
  }

  const limpiar = (v: string | null | undefined, max: number) => {
    const t = sanitizeRutFromText(stripHtml(v ?? ''))
    return t.length > max ? t.substring(0, max) + '...' : t
  }

  return {
    ids_firmadas: (idsRes.data ?? []).map((r: { id: string }) => r.id).sort(),
    recientes: (recientesRes.data ?? []).map((a) => ({
      id: a.id as string,
      fecha: new Date(a.created_at as string).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }),
      tipo_documento: a.tipo_documento as 'soap' | 'nota_clinica',
      tipo_adenda: a.tipo_adenda as 'adenda' | 'errata' | 'anulacion',
      motivo: limpiar(a.motivo as string, 200),
      contenido_truncado: limpiar(a.contenido as string, 300),
    })),
  }
}
