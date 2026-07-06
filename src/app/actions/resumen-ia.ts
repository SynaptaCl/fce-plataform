'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildContextoClinico } from '@/lib/ia/contexto-clinico'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ia/prompt'
import { calcularContextoHash, getResumenCacheado, guardarResumenCache } from '@/lib/ia/cache'
import { seudonimizarTexto } from '@/lib/ia/sanitize-pii'
import { fetchPiiPaciente } from '@/lib/ia/pii-paciente'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { ReporteIA } from '@/types/resumen-ia'
import { logAudit } from '@/lib/audit'
import { log } from '@/lib/logger'

const MODEL = 'claude-haiku-4-5-20251001'

export async function generarResumenIA(
  idPaciente: string,
  idClinica: string
): Promise<ActionResult<ReporteIA>> {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  // 2. Autorización
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id_clinica, rol, activo')
    .eq('auth_id', user.id)
    .eq('activo', true)
    .single()

  if (!admin || admin.id_clinica !== idClinica) {
    return { success: false, error: 'Sin acceso a esta clínica' }
  }

  try {
    requireAccesoFCE(admin.rol)
  } catch {
    return { success: false, error: 'Sin permiso para acceder a la FCE' }
  }

  // 3. Construir contexto clínico
  let contexto
  try {
    contexto = await buildContextoClinico(supabase, idPaciente, idClinica)
  } catch (e) {
    console.error('[FCE][IA] Error extrayendo contexto:', e)
    return { success: false, error: 'Error al extraer datos clínicos' }
  }

  if (!contexto.tiene_datos_suficientes) {
    return { success: false, error: 'El paciente no tiene atenciones registradas en este sistema' }
  }

  // 4. Cache
  const serviceClient = createServiceClient()
  const contextoHash = calcularContextoHash(contexto)
  const cached = await getResumenCacheado(supabase, idPaciente, idClinica, contextoHash)

  if (cached) {
    // Audit log cache hit
    await logAudit({
      supabase: serviceClient,
      actorId: user.id,
      accion: 'resumen_ia_cache',
      tipoEvento: 'ia_resumen',
      tablaAfectada: 'fce_resumenes_ia',
      idClinica: idClinica,
      idPaciente: idPaciente,
    })
    return { success: true, data: cached }
  }

  // 5. Llamada Anthropic API
  // Choke point único: se seudonimiza el prompt ENSAMBLADO (un solo punto) antes de salir del server.
  const pii = await fetchPiiPaciente(supabase, idPaciente)
  const userPrompt = seudonimizarTexto(buildUserPrompt(contexto), pii)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let reporte: ReporteIA

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'Respuesta vacía del modelo' }
    }

    let raw = textBlock.text.trim()
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim()
    }

    let parsed: Omit<ReporteIA, 'desde_cache'>
    try {
      parsed = JSON.parse(raw)
    } catch {
      // NO loguear contenido clínico (regla seccion 22 CLAUDE.md — solo UUIDs/metadata).
      log('error', {
        action: 'resumen_ia_parse_failed',
        idClinica,
        stopReason: response.stop_reason,
        outputTokens: response.usage.output_tokens,
        rawLength: raw.length,
      })
      return { success: false, error: 'Error procesando respuesta de IA. Intenta nuevamente.' }
    }
    reporte = {
      ...parsed,
      generado_en: new Date().toISOString(),
      desde_cache: false,
    }

    const tokensInput = response.usage.input_tokens
    const tokensOutput = response.usage.output_tokens

    // 6. Guardar caché + audit log en paralelo
    await Promise.all([
      guardarResumenCache(
        serviceClient,
        idPaciente,
        idClinica,
        user.id,
        reporte,
        contextoHash,
        tokensInput,
        tokensOutput
      ),
      logAudit({
        supabase: serviceClient,
        actorId: user.id,
        accion: 'resumen_ia_generado',
        tipoEvento: 'ia_resumen',
        tablaAfectada: 'fce_resumenes_ia',
        idClinica: idClinica,
        idPaciente: idPaciente,
      }),
    ])
  } catch (e) {
    console.error('[FCE][IA] Error llamando a Anthropic:', e)
    return { success: false, error: 'Error generando el resumen. Intenta nuevamente.' }
  }

  return { success: true, data: reporte }
}
