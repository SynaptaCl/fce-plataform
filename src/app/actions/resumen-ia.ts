'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildContextoClinico } from '@/lib/ia/contexto-clinico'
import { evaluarContextoParaResumen, withPartialFlag } from '@/lib/ia/resumen-guard'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ia/prompt'
import { calcularContextoHash, getResumenCacheado, guardarResumenCache } from '@/lib/ia/cache'
import { seudonimizarTexto } from '@/lib/ia/sanitize-pii'
import { fetchPiiPaciente } from '@/lib/ia/pii-paciente'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { ReporteIA } from '@/types/resumen-ia'
import { logAudit } from '@/lib/audit'
import { log } from '@/lib/logger'
import { iaRateLimit, iaRateLimitClinica } from '@/lib/rate-limit'

// Sonnet: síntesis de historial clínico completo generada sin revisión humana previa —
// la tarea de mayor riesgo clínico (COMERCIAL.md §10). No bajar a Haiku sin evidencia
// de calidad equivalente.
const MODEL = 'claude-sonnet-4-6'

export async function generarResumenIA(
  idPaciente: string,
  idClinica: string
): Promise<ActionResult<ReporteIA>> {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  // 2. Autorización — UNIQUE(auth_id, id_clinica) permite multi-clínica:
  // buscamos la fila de la clínica solicitada (set-membership) en vez de .single().
  const { data: adminRows } = await supabase
    .from('admin_users')
    .select('id_clinica, rol')
    .eq('auth_id', user.id)
    .eq('activo', true)

  const admin = adminRows?.find((r) => r.id_clinica === idClinica)
  if (!admin) {
    return { success: false, error: 'Sin acceso a esta clínica' }
  }

  try {
    requireAccesoFCE(admin.rol)
  } catch {
    return { success: false, error: 'Sin permiso para acceder a la FCE' }
  }

  // 3. Rate limit (resumen es la llamada más cara: contexto clínico completo)
  // Por-usuario y por-clínica: el segundo evita que una clínica entera (o una
  // sesión comprometida rotando de usuario) sume costo sin disparar el primero.
  const rl = await iaRateLimit('resumen', user.id, 6, 60_000)
  if (!rl.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de resumen. Espera un momento e inténtalo de nuevo.' }
  }
  const rlClinica = await iaRateLimitClinica('resumen', idClinica, 30, 60_000)
  if (!rlClinica.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de resumen en esta clínica. Espera un momento e inténtalo de nuevo.' }
  }

  // 4. Construir contexto clínico
  let contexto
  try {
    contexto = await buildContextoClinico(supabase, idPaciente, idClinica)
  } catch (e) {
    log('error', { action: 'resumen_ia_extraer_contexto', error: e })
    return { success: false, error: 'Error al extraer datos clínicos' }
  }

  const guard = evaluarContextoParaResumen(contexto)
  if (!guard.ok) {
    log('warn', {
      action: 'resumen_ia_contexto_insuficiente',
      id_clinica: idClinica,
      id_paciente: idPaciente,
      detail: contexto.secciones_con_error.join(','),
    })
    return { success: false, error: guard.error! }
  }

  // 5. Cache
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
    return { success: true, data: withPartialFlag(cached, contexto.secciones_con_error) }
  }

  // 6. Llamada Anthropic API
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

    // 7. Guardar caché (solo si el contexto cargó completo) + audit log, en paralelo.
    // Un resumen generado con secciones en error nunca se persiste en fce_resumenes_ia —
    // si se cacheara, un día posterior con esa sección OK podría servir (o mezclarse con)
    // contenido calculado sobre datos incompletos vía un hash que además pudo coincidir
    // por azar. El audit log siempre se registra, distinguiendo el caso parcial.
    const tareas: Promise<unknown>[] = []
    if (!contexto.contexto_incompleto) {
      tareas.push(
        guardarResumenCache(
          serviceClient,
          idPaciente,
          idClinica,
          user.id,
          reporte,
          contextoHash,
          tokensInput,
          tokensOutput
        )
      )
    }
    tareas.push(
      logAudit({
        supabase: serviceClient,
        actorId: user.id,
        accion: contexto.contexto_incompleto
          ? 'resumen_ia_generado_parcial_no_cacheado'
          : 'resumen_ia_generado',
        tipoEvento: 'ia_resumen',
        tablaAfectada: 'fce_resumenes_ia',
        idClinica: idClinica,
        idPaciente: idPaciente,
      })
    )
    await Promise.all(tareas)
  } catch (e) {
    log('error', { action: 'resumen_ia_llamada_anthropic', error: e })
    return { success: false, error: 'Error generando el resumen. Intenta nuevamente.' }
  }

  return { success: true, data: withPartialFlag(reporte, contexto.secciones_con_error) }
}
