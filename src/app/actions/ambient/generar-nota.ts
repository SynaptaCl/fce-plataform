'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getEspecialidadConfig } from '@/lib/modules/especialidad-config'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import { assertConsentimientoGrabacion } from '@/lib/ambient/consentimiento'
import { buildSystemPromptAmbient, buildUserPromptAmbient } from '@/lib/ia/ambient/prompt'
import { parseBorradorNota } from '@/lib/ia/copiloto-nota/parser'
import type { BorradorNota } from '@/lib/ia/copiloto-nota/types'
import { seudonimizarTexto } from '@/lib/ia/sanitize-pii'
import { fetchPiiPaciente } from '@/lib/ia/pii-paciente'
import { logAudit } from '@/lib/audit'
import { log } from '@/lib/logger'
import { iaRateLimit, iaRateLimitClinica } from '@/lib/rate-limit'

/**
 * AMB-1 F3 — estructura la transcripción acumulada de una consulta grabada en
 * un borrador de nota clínica. Modelo `claude-sonnet-4-6` (NO Haiku — la nota
 * se firma como documento clínico, mismo criterio que Copiloto de Escritura §18).
 *
 * La transcripción cruda NUNCA se persiste (§7 AMB-1-ambient-scribe.md) — vive
 * solo en memoria de esta invocación. Se descarta al retornar, se guarde o no
 * el borrador.
 */
const MODEL = 'claude-sonnet-4-6'
const MAX_TRANSCRIPT_LENGTH = 60_000

interface GenerarNotaAmbientInput {
  idEncuentro: string
  idClinica: string
  transcript: string
}

export async function generarNotaAmbient(
  input: GenerarNotaAmbientInput
): Promise<ActionResult<BorradorNota>> {
  const { idEncuentro, idClinica, transcript } = input

  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  // 2. Autorización
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

  // 3. Rate limit — por usuario y por clínica (mismo criterio que resumen/copiloto/informes)
  const rl = await iaRateLimit('ambient', user.id, 6, 60_000)
  if (!rl.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de Ambient Scribe. Espera un momento e inténtalo de nuevo.' }
  }
  const rlClinica = await iaRateLimitClinica('ambient', idClinica, 30, 60_000)
  if (!rlClinica.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de Ambient Scribe en esta clínica. Espera un momento e inténtalo de nuevo.' }
  }

  // 4. Validar transcript
  const transcriptTrimmed = transcript.trim()
  if (!transcriptTrimmed) {
    return { success: false, error: 'No hay transcripción para procesar' }
  }
  if (transcriptTrimmed.length > MAX_TRANSCRIPT_LENGTH) {
    return { success: false, error: `La transcripción supera el máximo permitido (${MAX_TRANSCRIPT_LENGTH} caracteres)` }
  }

  // 5. Leer encuentro: especialidad + validar status + validar clínica
  const { data: encuentro, error: encuentroError } = await supabase
    .from('fce_encuentros')
    .select('id, id_paciente, especialidad, status, id_clinica')
    .eq('id', idEncuentro)
    .single()

  if (encuentroError || !encuentro) {
    return { success: false, error: 'Encuentro no encontrado' }
  }
  if (encuentro.id_clinica !== idClinica) {
    return { success: false, error: 'Sin acceso a este encuentro' }
  }
  if (encuentro.status !== 'en_progreso') {
    return { success: false, error: 'El encuentro ya no está en progreso' }
  }

  // 6. Gating por especialidad — config, nunca if (especialidad === '...') (regla 18)
  if (!getEspecialidadConfig(encuentro.especialidad).tieneAmbientScribe) {
    return { success: false, error: 'Ambient Scribe no está habilitado para esta especialidad' }
  }

  // 7. Hard stop — sin consentimiento vigente no hay nota generada, sin excepción.
  const consentimiento = await assertConsentimientoGrabacion(supabase, encuentro.id_paciente)
  if (!consentimiento.success) {
    return { success: false, error: consentimiento.error }
  }

  // 8. Llamada Anthropic
  // Choke point: seudonimizar la transcripción con la PII del paciente antes de salir.
  // Límite honesto (§F3): esto cubre nombre/rut/tel/email conocidos del paciente en la
  // ficha — NO cubre terceros mencionados en la conversación libre (acompañantes, otros
  // pacientes). Esa cobertura parcial viaja bajo DPA + retención cero, no como garantía.
  const pii = await fetchPiiPaciente(supabase, encuentro.id_paciente)
  const transcriptSeguro = seudonimizarTexto(transcriptTrimmed, pii)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let borrador: BorradorNota

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: buildSystemPromptAmbient(encuentro.especialidad),
      messages: [{ role: 'user', content: buildUserPromptAmbient(transcriptSeguro) }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'Respuesta vacía del modelo' }
    }

    let parsed: { contenido: string }
    try {
      parsed = parseBorradorNota(textBlock.text)
    } catch (parseErr) {
      // NO loguear contenido clínico (regla 22 CLAUDE.md — solo UUIDs/metadata).
      log('warn', {
        action: 'ambient_nota_parse_failed',
        idClinica,
        idEncuentro,
        stopReason: response.stop_reason,
        outputTokens: response.usage.output_tokens,
        rawLength: textBlock.text.length,
        errorName: parseErr instanceof Error ? parseErr.name : 'Unknown',
      })
      return { success: false, error: 'Error procesando el borrador. Puedes redactar la nota manualmente.' }
    }

    borrador = {
      contenido: parsed.contenido,
      especialidad: encuentro.especialidad,
      origen: 'ambient',
    }
  } catch (e) {
    log('error', { action: 'ambient_nota_llamada_anthropic', error: e })
    return { success: false, error: 'Error generando el borrador. Puedes redactar la nota manualmente.' }
  }

  // 9. Audit log — SIEMPRE, incluso si el profesional descarta el borrador después
  // (criterio F3). service_role bypasea RLS en logs_auditoria, mismo patrón que copiloto.
  const serviceClient = createServiceClient()
  await logAudit({
    supabase: serviceClient,
    actorId: user.id,
    accion: 'nota_estructurada_ambient',
    tipoEvento: 'ia_ambient',
    tablaAfectada: 'fce_notas_clinicas',
    registroId: idEncuentro,
    idClinica,
    idPaciente: encuentro.id_paciente,
  })

  return { success: true, data: borrador }
}
