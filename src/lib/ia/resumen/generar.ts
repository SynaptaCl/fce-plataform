import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildContextoClinico } from '@/lib/ia/contexto-clinico'
import { evaluarContextoParaResumen } from '@/lib/ia/resumen-guard'
import {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_INCREMENTAL,
  buildUserPrompt,
  buildUserPromptIncremental,
  type ResumenPrevioParaPrompt,
} from '@/lib/ia/prompt'
import { calcularContextoHash, calcularHashBase, guardarResumenCache } from '@/lib/ia/cache'
import { seudonimizarTexto } from '@/lib/ia/sanitize-pii'
import { fetchPiiPaciente } from '@/lib/ia/pii-paciente'
import { createServiceClient } from '@/lib/supabase/service'
import { getEspecialidadConfig } from '@/lib/modules/especialidad-config'
import { logAudit } from '@/lib/audit'
import { log } from '@/lib/logger'
import { iaRateLimitClinica } from '@/lib/rate-limit'
import type { ReporteIA } from '@/types/resumen-ia'
import {
  debeGenerarPorEvento,
  decidirModo,
  siguienteContador,
  type MotivoCompleta,
  type VersionPrevia,
} from './decision'

// Sonnet: síntesis de historial clínico generada sin revisión humana previa — la tarea de
// mayor riesgo clínico (COMERCIAL.md §10). No bajar a Haiku sin evidencia de calidad
// equivalente (la evaluación está en docs/evaluacion-resumen-ia-haiku-vs-sonnet.md, Fase 2).
export const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS_SALIDA = 2048

type ReporteModelo = Omit<ReporteIA, 'desde_cache'>

export interface UsoModelo {
  tokens_input: number
  tokens_output: number
  tokens_cache_read: number
  tokens_cache_creation: number
}

// ── Llamada al modelo ────────────────────────────────────────────────────────

export class ErrorModeloResumen extends Error {
  constructor(public readonly causa: 'respuesta_vacia' | 'json_invalido') {
    super(causa)
    this.name = 'ErrorModeloResumen'
  }
}

/**
 * Una llamada a Anthropic. Las instrucciones fijas van como bloque `system` con
 * `cache_control`: el API solo cachea si el prefijo supera el mínimo del modelo, y si no
 * lo supera lo ignora sin error — `tokens_cache_*` en el registro mide si realmente aplicó.
 */
export async function llamarModelo(
  system: string,
  userPrompt: string,
  log_ctx: { id_clinica: string; id_paciente: string }
): Promise<{ reporte: ReporteModelo; uso: UsoModelo }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_SALIDA,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const uso: UsoModelo = {
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    tokens_cache_read: response.usage.cache_read_input_tokens ?? 0,
    tokens_cache_creation: response.usage.cache_creation_input_tokens ?? 0,
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new ErrorModeloResumen('respuesta_vacia')

  let raw = textBlock.text.trim()
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(raw) as Omit<ReporteIA, 'desde_cache' | 'generado_en'>
    return { reporte: { ...parsed, generado_en: new Date().toISOString() }, uso }
  } catch {
    // NO loguear contenido clínico — solo metadata.
    log('error', {
      action: 'resumen_ia_parse_failed',
      ...log_ctx,
      stopReason: response.stop_reason,
      outputTokens: response.usage.output_tokens,
      rawLength: raw.length,
    })
    throw new ErrorModeloResumen('json_invalido')
  }
}

// ── Orquestador ──────────────────────────────────────────────────────────────

export interface ParamsActualizacion {
  /** Cliente del USUARIO (RLS): toda lectura de datos clínicos va por acá, nunca service_role. */
  supabase: SupabaseClient
  idPaciente: string
  /** Siempre de la sesión (requireContext), nunca del body. */
  idClinica: string
  /** auth.users.id de quien disparó el evento. */
  actorId: string
  origen: 'evento' | 'manual'
  /** Evento que exige ficha entera. En manual se fuerza 'manual'. */
  forzarCompleta?: MotivoCompleta | null
  /** Especialidad del encuentro que disparó el evento, si la hay. */
  especialidad?: string | null
}

export type ResultadoActualizacion =
  | {
      estado: 'generado'
      reporte: ReporteIA
      tipo: 'completa' | 'incremental'
      motivo: string
      persistido: boolean
      secciones_con_error: string[]
    }
  | { estado: 'sin_cambios' }
  | { estado: 'omitido'; razon: string }
  | { estado: 'error'; error: string }

interface FilaVersion extends VersionPrevia {
  reporte: ReporteModelo
  generado_en: string
}

async function leerVersionVigente(
  supabase: SupabaseClient,
  idPaciente: string,
  idClinica: string
): Promise<FilaVersion | null> {
  const { data, error } = await supabase
    .from('fce_resumenes_ia_versiones')
    .select(
      'version, reporte, generado_en, incrementales_desde_completa, hash_contexto_base, ids_evoluciones_cubiertas, ids_adendas_cubiertas'
    )
    .eq('id_paciente', idPaciente)
    .eq('id_clinica', idClinica)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as FilaVersion | null) ?? null
}

/**
 * Genera (o decide no generar) la siguiente versión del Resumen IA de un paciente.
 * Único camino de generación: lo usan el evento de firma (en `after()`) y el botón manual.
 * Nunca lanza: devuelve `error` y deja intacta la última versión válida.
 */
export async function actualizarResumen(p: ParamsActualizacion): Promise<ResultadoActualizacion> {
  const ctx = { id_clinica: p.idClinica, id_paciente: p.idPaciente }
  const esEvento = p.origen === 'evento'

  try {
    // 1. Multi-tenant: el paciente debe pertenecer a la clínica de la sesión.
    const { data: paciente } = await p.supabase
      .from('pacientes')
      .select('id')
      .eq('id', p.idPaciente)
      .eq('id_clinica', p.idClinica)
      .maybeSingle()
    if (!paciente) {
      log('warn', { action: 'resumen_ia_paciente_fuera_de_clinica', ...ctx })
      return { estado: 'error', error: 'Paciente no encontrado en esta clínica' }
    }

    // 2. Tope de costo por clínica para el camino automático (fail-open sin Redis).
    if (esEvento) {
      const rl = await iaRateLimitClinica('resumen_evento', p.idClinica, 30, 60_000)
      if (!rl.allowed) return { estado: 'omitido', razon: 'rate_limit' }
    }

    // 3. Contexto clínico (cliente del usuario → RLS).
    let contexto
    try {
      contexto = await buildContextoClinico(p.supabase, p.idPaciente, p.idClinica)
    } catch (e) {
      log('error', { action: 'resumen_ia_extraer_contexto', ...ctx, error: e })
      return { estado: 'error', error: 'Error al extraer datos clínicos' }
    }

    const guard = evaluarContextoParaResumen(contexto)
    if (!guard.ok) {
      log('warn', {
        action: 'resumen_ia_contexto_insuficiente',
        ...ctx,
        origen: p.origen,
        detail: contexto.secciones_con_error.join(','),
      })
      return esEvento
        ? { estado: 'omitido', razon: 'contexto_insuficiente' }
        : { estado: 'error', error: guard.error! }
    }

    // Un contexto incompleto nunca se persiste (un día posterior con la sección OK podría
    // mezclarse con contenido calculado sobre datos parciales). En automático ni se genera.
    if (contexto.contexto_incompleto && esEvento) {
      return { estado: 'omitido', razon: 'contexto_incompleto' }
    }

    // 4. Versión vigente + decisión.
    const previa = contexto.contexto_incompleto ? null : await leerVersionVigente(p.supabase, p.idPaciente, p.idClinica)

    if (esEvento) {
      const generar = debeGenerarPorEvento({
        tienePrevia: !!previa,
        evolucionesFirmadas: contexto.evolucion.ids_firmados.length,
        especialidadTieneResumenIA: p.especialidad ? getEspecialidadConfig(p.especialidad).tieneResumenIA : null,
      })
      if (!generar) return { estado: 'omitido', razon: 'sin_demanda_esperada' }
    }

    const hashBase = calcularHashBase(contexto)
    const decision = contexto.contexto_incompleto
      ? ({ modo: 'completa', motivo: 'manual' } as const)
      : decidirModo({
          previa,
          forzarCompleta: p.origen === 'manual' ? 'manual' : (p.forzarCompleta ?? null),
          hashBaseActual: hashBase,
          idsEvolucionesActuales: contexto.evolucion.ids_firmados,
          idsEvolucionesEnPrompt: contexto.evolucion.ultimas_notas.map((n) => n.id),
          idsAdendasActuales: contexto.adendas.ids_firmadas,
          idsAdendasEnPrompt: contexto.adendas.recientes.map((a) => a.id),
        })

    if (decision.modo === 'sin_cambios') return { estado: 'sin_cambios' }

    // 5. Prompt (seudonimizado en el único choke point, ya ensamblado).
    const pii = await fetchPiiPaciente(p.supabase, p.idPaciente)
    let system = SYSTEM_PROMPT
    let userPrompt: string
    if (decision.modo === 'incremental' && previa) {
      system = SYSTEM_PROMPT_INCREMENTAL
      const previo: ResumenPrevioParaPrompt = {
        alertas_prioritarias: previa.reporte.alertas_prioritarias ?? [],
        resumen_narrativo: previa.reporte.resumen_narrativo ?? '',
        evolucion_clinica: previa.reporte.evolucion_clinica ?? '',
        estado_actual: previa.reporte.estado_actual ?? '',
        informacion_faltante: previa.reporte.informacion_faltante ?? [],
        generado_en: previa.generado_en,
      }
      userPrompt = seudonimizarTexto(
        buildUserPromptIncremental({
          contexto,
          previo,
          idsNuevos: decision.idsNuevos,
          idsAdendasNuevas: decision.idsAdendasNuevas,
        }),
        pii
      )
    } else {
      userPrompt = seudonimizarTexto(buildUserPrompt(contexto), pii)
    }

    // 6. Modelo. Si falla, no se escribe nada: la última versión válida sigue vigente.
    let resultado
    try {
      resultado = await llamarModelo(system, userPrompt, ctx)
    } catch (e) {
      log('error', { action: 'resumen_ia_llamada_anthropic', ...ctx, origen: p.origen, modo: decision.modo, error: e })
      return { estado: 'error', error: 'Error generando el resumen. Intenta nuevamente.' }
    }

    const tipo = decision.modo === 'incremental' ? 'incremental' : 'completa'
    const motivo = decision.motivo
    const reporte: ReporteIA = { ...resultado.reporte, desde_cache: false }

    // 7. Persistencia (service_role) solo si el contexto cargó completo.
    let persistido = false
    if (!contexto.contexto_incompleto) {
      const version = (previa?.version ?? 0) + 1
      const contador = siguienteContador(decision, previa)
      const service = createServiceClient()
      const contextoHash = calcularContextoHash(contexto)
      const { error: insertError } = await service.from('fce_resumenes_ia_versiones').insert({
        id_clinica: p.idClinica,
        id_paciente: p.idPaciente,
        version,
        tipo,
        motivo,
        modelo: MODEL,
        reporte,
        ids_evoluciones_cubiertas: contexto.evolucion.ids_firmados,
        ids_adendas_cubiertas: contexto.adendas.ids_firmadas,
        hash_contexto_base: hashBase,
        contexto_hash: contextoHash,
        incrementales_desde_completa: contador,
        ...resultado.uso,
        generado_por: p.actorId,
      })

      if (insertError) {
        // Típico: otra firma simultánea ya tomó esta versión (UNIQUE). La otra gana.
        log('error', { action: 'resumen_ia_guardar_version', ...ctx, version, error: insertError })
      } else {
        persistido = true
        reporte.version = version
        reporte.tipo_version = tipo
        reporte.modelo = MODEL
        // Puntero a la vigente (compat con lectores de fce_resumenes_ia).
        await guardarResumenCache(
          service,
          p.idPaciente,
          p.idClinica,
          p.actorId,
          reporte,
          contextoHash,
          resultado.uso.tokens_input,
          resultado.uso.tokens_output
        )
        await logAudit({
          supabase: service,
          actorId: p.actorId,
          accion: `resumen_ia_generado_${tipo}`,
          tipoEvento: 'ia_resumen',
          tablaAfectada: 'fce_resumenes_ia_versiones',
          idClinica: p.idClinica,
          idPaciente: p.idPaciente,
          datosAfter: { version, tipo, motivo, modelo: MODEL, origen: p.origen },
        })
      }
    } else {
      await logAudit({
        supabase: createServiceClient(),
        actorId: p.actorId,
        accion: 'resumen_ia_generado_parcial_no_cacheado',
        tipoEvento: 'ia_resumen',
        tablaAfectada: 'fce_resumenes_ia',
        idClinica: p.idClinica,
        idPaciente: p.idPaciente,
      })
    }

    // 8. Medición de ahorro (sin PII: solo UUIDs, modo y contadores).
    log('info', {
      action: 'resumen_ia_generado',
      ...ctx,
      origen: p.origen,
      tipo,
      motivo,
      modelo: MODEL,
      persistido,
      ...resultado.uso,
    })

    return {
      estado: 'generado',
      reporte,
      tipo,
      motivo,
      persistido,
      secciones_con_error: contexto.secciones_con_error,
    }
  } catch (e) {
    log('error', { action: 'resumen_ia_actualizar', ...ctx, origen: p.origen, error: e })
    return { estado: 'error', error: 'Error generando el resumen. Intenta nuevamente.' }
  }
}
