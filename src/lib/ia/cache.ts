import { createHash } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import type { ContextoClinico } from './contexto-clinico'
import type { ReporteIA } from '@/types/resumen-ia'

/**
 * Serializa las 7 secciones extraídas (no `alertas` — se deriva de las otras, sin query
 * propia; ver contexto-clinico.ts) con prefijo de versión explícito. El prefijo `v2:`
 * hace la invalidación de filas cacheadas con el hash viejo (4 campos, sin prefijo) una
 * decisión intencional, no accidental — auditoría RLS 2026-07, Fase 2 punto C.
 *
 * Determinismo: todos los arrays dentro de cada sección vienen de queries con `.order()`
 * explícito (o de un único row jsonb estable, caso de `anamnesis`), así que el mismo
 * estado de DB produce siempre el mismo JSON.stringify — ver extraccion/*.ts.
 */
export function calcularContextoHash(contexto: ContextoClinico): string {
  const payload = {
    demografico: contexto.demografico,
    anamnesis: contexto.anamnesis,
    signos_vitales: contexto.signos_vitales,
    medicacion: contexto.medicacion,
    evolucion: contexto.evolucion,
    examenes: contexto.examenes,
    instrumentos: contexto.instrumentos,
  }
  const input = 'v2:' + JSON.stringify(payload)
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
