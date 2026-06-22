// src/app/actions/informes-ia.ts
'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { TipoInforme } from '@/types/informe'
import { logAudit } from '@/lib/audit'
import { sanitizeRutFromText } from '@/lib/ia/sanitize-pii'

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

  // 2. Autorización — deriva idClinica desde admin_users
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id_clinica, rol, activo')
    .eq('auth_id', user.id)
    .eq('activo', true)
    .single()

  if (!admin) return { success: false, error: 'Sin acceso a esta clínica' }

  try {
    requireAccesoFCE(admin.rol)
  } catch {
    return { success: false, error: 'Sin permiso para acceder a la FCE' }
  }

  const idClinica = admin.id_clinica

  // 3. Validar contenido
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

  // 4. Si hay encuentro, validar que pertenece a la clínica
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
    if (encuentro.id_clinica !== idClinica) {
      return { success: false, error: 'Sin acceso a este encuentro' }
    }
    idPaciente = encuentro.id_paciente
  }

  // 5. Llamada Anthropic
  const tipoLabel = TIPO_LABELS[tipo]
  const destinatarioLabel = destinatario?.trim() || 'No especificado'

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
      messages: [{ role: 'user', content: sanitizeRutFromText(contenidoTrimmed) }],
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
    console.error('[FCE][INFORMES-IA] Error llamando a Anthropic:', e)
    return { success: false, error: 'Error generando el informe. Intenta nuevamente.' }
  }

  // 6. Audit log (service_role para bypasear RLS en logs_auditoria)
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
