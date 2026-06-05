// src/app/actions/copiloto-nota.ts
'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ia/copiloto-nota/prompt'
import { parseBorradorNota } from '@/lib/ia/copiloto-nota/parser'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { EstructurarNotaInput, BorradorNota } from '@/lib/ia/copiloto-nota/types'

const MODEL = 'claude-sonnet-4-6'
const MAX_BULLETS_LENGTH = 5000

export async function estructurarNota(
  input: EstructurarNotaInput
): Promise<ActionResult<BorradorNota>> {
  const { idEncuentro, idClinica, bullets } = input

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

  // 3. Validar bullets
  const bulletsTrimmed = bullets.trim()
  if (!bulletsTrimmed) {
    return { success: false, error: 'Escribe algunos apuntes antes de usar el copiloto' }
  }
  if (bulletsTrimmed.length > MAX_BULLETS_LENGTH) {
    return { success: false, error: `Los apuntes superan el máximo permitido (${MAX_BULLETS_LENGTH} caracteres)` }
  }

  // 4. Leer encuentro: especialidad + validar status + validar clínica
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

  // 5. Llamada Anthropic
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let borrador: BorradorNota

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(encuentro.especialidad, input.seccion),
      messages: [{ role: 'user', content: buildUserPrompt(bulletsTrimmed) }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'Respuesta vacía del modelo' }
    }

    let parsed: { contenido: string }
    try {
      parsed = parseBorradorNota(textBlock.text)
    } catch (parseErr) {
      console.error('[FCE][COPILOTO] JSON parse failed:', parseErr)
      console.error('[FCE][COPILOTO] Stop reason:', response.stop_reason)
      console.error('[FCE][COPILOTO] Output tokens:', response.usage.output_tokens, '/', 1024)
      console.error('[FCE][COPILOTO] Raw tail:', textBlock.text.slice(-200))
      return { success: false, error: 'Error procesando respuesta de IA. Intenta nuevamente.' }
    }

    borrador = {
      contenido: parsed.contenido,
      especialidad: encuentro.especialidad,
    }
  } catch (e) {
    console.error('[FCE][COPILOTO] Error llamando a Anthropic:', e)
    return { success: false, error: 'Error generando la nota. Intenta nuevamente.' }
  }

  // 6. Audit log (service_role para bypasear RLS en logs_auditoria)
  const serviceClient = createServiceClient()
  await serviceClient.from('logs_auditoria').insert({
    id_clinica: idClinica,
    actor_id: user.id,
    actor_tipo: 'profesional',
    accion: 'nota_estructurada_ia',
    tabla_afectada: 'fce_notas_clinicas',
    registro_id: null,
    id_paciente: encuentro.id_paciente,
  })

  return { success: true, data: borrador }
}
