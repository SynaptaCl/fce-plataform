// src/app/actions/informes-ia.ts
'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { TipoInforme } from '@/types/informe'
import { logAudit } from '@/lib/audit'
import { log } from '@/lib/logger'
import { iaRateLimit } from '@/lib/rate-limit'
import { seudonimizarTexto } from '@/lib/ia/sanitize-pii'
import { fetchPiiPaciente } from '@/lib/ia/pii-paciente'
import type { PIIPaciente } from '@/lib/ia/sanitize-pii'

const MODEL = 'claude-sonnet-4-6'
const MAX_CONTENIDO_LENGTH = 5000

const TIPO_LABELS: Record<TipoInforme, string> = {
  isapre: 'Isapre',
  colegio: 'Colegio',
  laboral: 'Laboral',
  judicial: 'Judicial',
  otro: 'otro',
}

interface EstructurarInformeInput {
  idEncuentro: string | null
  tipo: TipoInforme
  destinatario: string | null
  contenido: string
}

export async function estructurarInforme(
  input: EstructurarInformeInput
): Promise<ActionResult<{ contenido: string }>> {
  const { idEncuentro, tipo, destinatario, contenido } = input

  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autenticado' }

  // 2. Autorización — admin_users puede tener varias filas (UNIQUE(auth_id, id_clinica),
  // multi-clínica). Set-membership en vez de .single().
  const { data: adminRows } = await supabase
    .from('admin_users')
    .select('id_clinica, rol')
    .eq('auth_id', user.id)
    .eq('activo', true)

  if (!adminRows || adminRows.length === 0) {
    return { success: false, error: 'Sin acceso a esta clínica' }
  }

  try {
    requireAccesoFCE(adminRows[0].rol)
  } catch {
    return { success: false, error: 'Sin permiso para acceder a la FCE' }
  }

  const clinicaIds = adminRows.map((r) => r.id_clinica)
  // Para el audit log: la clínica del encuentro si lo hay, si no la primera activa.
  let idClinica: string = adminRows[0].id_clinica

  // 3. Rate limit (protege contra loops de UI / abuso con sesión comprometida)
  const rl = await iaRateLimit('informes', user.id, 10, 60_000)
  if (!rl.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de informe. Espera un momento e inténtalo de nuevo.' }
  }

  // 4. Validar contenido
  const contenidoTrimmed = contenido.trim()
  if (!contenidoTrimmed) {
    return { success: false, error: 'Escribe contenido antes de usar el copiloto' }
  }
  if (contenidoTrimmed.length > MAX_CONTENIDO_LENGTH) {
    return {
      success: false,
      error: `El contenido supera el máximo permitido (${MAX_CONTENIDO_LENGTH} caracteres)`,
    }
  }

  // 5. Si hay encuentro, validar que pertenece a la clínica
  let idPaciente: string | null = null
  if (idEncuentro) {
    const { data: encuentro, error: encuentroError } = await supabase
      .from('fce_encuentros')
      .select('id, id_paciente, id_clinica')
      .eq('id', idEncuentro)
      .single()

    if (encuentroError || !encuentro) {
      return { success: false, error: 'Encuentro no encontrado' }
    }
    if (!clinicaIds.includes(encuentro.id_clinica)) {
      return { success: false, error: 'Sin acceso a este encuentro' }
    }
    idClinica = encuentro.id_clinica
    idPaciente = encuentro.id_paciente
  }

  // 6. Llamada Anthropic
  // Seudonimizar contenido Y destinatario. Si hay paciente, con su PID; si no, solo genéricos.
  const pii: PIIPaciente = idPaciente ? await fetchPiiPaciente(supabase, idPaciente) : {}
  const tipoLabel = TIPO_LABELS[tipo]
  const destinatarioSeguro = destinatario?.trim() ? seudonimizarTexto(destinatario.trim(), pii) : ''
  const destinatarioLabel = destinatarioSeguro || 'No especificado'
  const contenidoSeguro = seudonimizarTexto(contenidoTrimmed, pii)

  const systemPrompt = `Eres un asistente de redacción clínica especializado en informes para ${tipoLabel}.
Destinatario: ${destinatarioLabel}.
Estructura y mejora el siguiente borrador de informe clínico.
Mantén terminología clínica profesional. No inventes datos.
Responde SOLO con el texto del informe mejorado, sin preámbulos ni comentarios adicionales.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let contenidoMejorado: string

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: contenidoSeguro }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'Respuesta vacía del modelo' }
    }

    contenidoMejorado = textBlock.text.trim()
    if (!contenidoMejorado) {
      return { success: false, error: 'El modelo no devolvió contenido' }
    }
  } catch (e) {
    log('error', { action: 'informes_ia_llamada_anthropic', error: e })
    return { success: false, error: 'Error generando el informe. Intenta nuevamente.' }
  }

  // 7. Audit log (service_role para bypasear RLS en logs_auditoria)
  const serviceClient = createServiceClient()
  await logAudit({
    supabase: serviceClient,
    actorId: user.id,
    accion: 'informe_estructurado_ia',
    tipoEvento: 'ia_informe',
    tablaAfectada: 'fce_informes_clinicos',
    idClinica: idClinica,
    ...(idPaciente ? { idPaciente } : {}),
  })

  return { success: true, data: { contenido: contenidoMejorado } }
}
