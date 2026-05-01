import { createHash } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import type { ContextoClinico } from './contexto-clinico'
import type { ReporteIA } from '@/types/resumen-ia'

export function calcularContextoHash(contexto: ContextoClinico): string {
  const input = [
    contexto.evolucion.ultima_sesion ?? '',
    String(contexto.medicacion.prescripciones_activas.length),
    String(contexto.examenes.pendientes.length),
    (contexto.anamnesis.motivo_consulta ?? '').substring(0, 20),
  ].join('|')
  return createHash('sha256').update(input).digest('hex').substring(0, 16)
}

export async function getResumenCacheado(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string,
  contextoHash: string
): Promise<ReporteIA | null> {
  const { data } = await supabase
    .from('fce_resumenes_ia')
    .select('reporte, contexto_hash, generado_en')
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .single()

  if (!data) return null
  if (data.contexto_hash !== contextoHash) return null

  const reporte = data.reporte as Omit<ReporteIA, 'desde_cache' | 'generado_en'>
  return { ...reporte, desde_cache: true, generado_en: data.generado_en }
}

export async function guardarResumenCache(
  serviceClient: SupabaseClient,
  idPaciente: string,
  idClinica: string,
  generadoPor: string,
  reporte: ReporteIA,
  contextoHash: string,
  tokensInput: number,
  tokensOutput: number
): Promise<void> {
  const { error } = await serviceClient
    .from('fce_resumenes_ia')
    .upsert(
      {
        id_paciente: idPaciente,
        id_clinica: idClinica,
        reporte,
        contexto_hash: contextoHash,
        generado_por: generadoPor,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        generado_en: new Date().toISOString(),
      },
      { onConflict: 'id_paciente,id_clinica' }
    )

  if (error) {
    console.error('[FCE][IA] Error guardando caché:', error.message)
  }
}
