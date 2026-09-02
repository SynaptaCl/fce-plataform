// src/lib/ia/copiloto-nota/llamar-modelo.ts

import type Anthropic from '@anthropic-ai/sdk'
import { parseBorradorNota } from './parser'
import { log } from '@/lib/logger'

// Copiloto SOAP: Haiku por defecto (el médico revisa el borrador en vivo) con upgrade
// a Sonnet SOLO ante falla determinística de formato o error/timeout de la llamada
// (COMERCIAL.md §10). Sin segundo LLM juzgando "calidad" — validación de formato nada más.
export const MODEL_COPILOTO_DEFAULT = 'claude-haiku-4-5-20251001'
export const MODEL_COPILOTO_UPGRADE = 'claude-sonnet-4-6'

const MAX_TOKENS = 1024

export type MotivoFalloCopiloto =
  | 'api_error'
  | 'respuesta_vacia'
  | 'parse_failed'
  | 'contenido_vacio'

export type ResultadoCopiloto =
  | { ok: true; contenido: string }
  | { ok: false; motivo: MotivoFalloCopiloto; error?: unknown }

interface LlamarParams {
  system: string
  userPrompt: string
  idClinica: string
  idEncuentro: string
}

async function intentarLlamada(
  anthropic: Anthropic,
  model: string,
  { system, userPrompt, idClinica, idEncuentro }: LlamarParams
): Promise<ResultadoCopiloto> {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { ok: false, motivo: 'respuesta_vacia' }
    }

    let parsed: { contenido: string }
    try {
      parsed = parseBorradorNota(textBlock.text)
    } catch (parseErr) {
      // NO loguear contenido clínico (regla sección 22 CLAUDE.md — solo UUIDs/metadata).
      // NO pasar parseErr: el SyntaxError de JSON.parse embebe un fragmento del input fallido.
      log('warn', {
        action: 'copiloto_nota_parse_failed',
        model,
        id_clinica: idClinica,
        id_encuentro: idEncuentro,
        stopReason: response.stop_reason,
        outputTokens: response.usage.output_tokens,
        rawLength: textBlock.text.length,
        errorName: parseErr instanceof Error ? parseErr.name : 'Unknown',
      })
      return { ok: false, motivo: 'parse_failed' }
    }

    if (!parsed.contenido.trim()) {
      return { ok: false, motivo: 'contenido_vacio' }
    }

    return { ok: true, contenido: parsed.contenido }
  } catch (e) {
    return { ok: false, motivo: 'api_error', error: e }
  }
}

export async function llamarCopiloto(
  anthropic: Anthropic,
  params: LlamarParams
): Promise<ResultadoCopiloto> {
  const primero = await intentarLlamada(anthropic, MODEL_COPILOTO_DEFAULT, params)
  if (primero.ok) return primero

  if (primero.motivo === 'api_error') {
    // Warn (no error): queda reintento con Sonnet — un fallo recuperable no debe disparar Sentry.
    log('warn', {
      action: 'copiloto_nota_api_error',
      model: MODEL_COPILOTO_DEFAULT,
      id_clinica: params.idClinica,
      id_encuentro: params.idEncuentro,
      error: primero.error,
    })
  }

  log('info', {
    route: 'copiloto-nota',
    id_clinica: params.idClinica,
    action: 'copilote_upgrade_sonnet',
    reason: primero.motivo,
  })

  const segundo = await intentarLlamada(anthropic, MODEL_COPILOTO_UPGRADE, params)
  if (segundo.ok) return segundo

  if (segundo.motivo === 'api_error') {
    log('error', {
      action: 'copiloto_nota_llamada_anthropic',
      model: MODEL_COPILOTO_UPGRADE,
      id_clinica: params.idClinica,
      id_encuentro: params.idEncuentro,
      error: segundo.error,
    })
  }
  return segundo
}
