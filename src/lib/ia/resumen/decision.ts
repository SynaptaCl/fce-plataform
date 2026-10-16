/**
 * Decisión incremental vs completa del Resumen IA. Funciones puras (sin I/O) para
 * poder probarlas en scripts/test-resumen-ia-incremental.ts sin Supabase ni Anthropic.
 */

/** Cada N actualizaciones incrementales se fuerza una regeneración completa. */
export const MAX_INCREMENTALES = 5

export type MotivoCompleta =
  | 'sin_version_previa'
  | 'limite_incrementales'
  | 'cambio_plan'
  | 'alta'
  | 'edicion_evolucion'
  | 'adenda'
  | 'cambio_contexto_base'
  | 'exceso_nuevas'
  | 'manual'

export type MotivoIncremental = 'incremental'

export interface VersionPrevia {
  version: number
  incrementales_desde_completa: number
  hash_contexto_base: string
  ids_evoluciones_cubiertas: string[]
  ids_adendas_cubiertas: string[]
}

export interface EntradaDecision {
  previa: VersionPrevia | null
  /** Evento que exige ficha entera (alta, cambio de plan, edición/adenda de evolución, manual). */
  forzarCompleta: MotivoCompleta | null
  hashBaseActual: string
  /** Todas las evoluciones firmadas hoy. */
  idsEvolucionesActuales: string[]
  /** Las que realmente entran al prompt (ultimas_notas). */
  idsEvolucionesEnPrompt: string[]
  idsAdendasActuales: string[]
  idsAdendasEnPrompt: string[]
}

export type Decision =
  | { modo: 'completa'; motivo: MotivoCompleta }
  | { modo: 'incremental'; motivo: MotivoIncremental; idsNuevos: string[]; idsAdendasNuevas: string[] }
  | { modo: 'sin_cambios' }

function diferencia(a: string[], b: string[]): string[] {
  const set = new Set(b)
  return a.filter((x) => !set.has(x))
}

export function decidirModo(e: EntradaDecision): Decision {
  // 1. Un evento fuerte gana sobre todo lo demás.
  if (e.forzarCompleta) return { modo: 'completa', motivo: e.forzarCompleta }

  // 2. Sin versión previa no hay nada que actualizar.
  if (!e.previa) return { modo: 'completa', motivo: 'sin_version_previa' }

  // 3. Tope de incrementales encadenadas: limita la deriva acumulada del resumen.
  if (e.previa.incrementales_desde_completa >= MAX_INCREMENTALES) {
    return { modo: 'completa', motivo: 'limite_incrementales' }
  }

  // 4. Cambió algo fuera de la evolución (anamnesis, medicación, exámenes, alertas…).
  if (e.previa.hash_contexto_base !== e.hashBaseActual) {
    return { modo: 'completa', motivo: 'cambio_contexto_base' }
  }

  // 5. Una evolución que el resumen decía cubrir ya no está firmada/visible.
  if (
    diferencia(e.previa.ids_evoluciones_cubiertas, e.idsEvolucionesActuales).length > 0 ||
    diferencia(e.previa.ids_adendas_cubiertas, e.idsAdendasActuales).length > 0
  ) {
    return { modo: 'completa', motivo: 'edicion_evolucion' }
  }

  const idsNuevos = diferencia(e.idsEvolucionesActuales, e.previa.ids_evoluciones_cubiertas)
  const idsAdendasNuevas = diferencia(e.idsAdendasActuales, e.previa.ids_adendas_cubiertas)

  // 6. Nada nuevo: el resumen vigente ya cubre todo.
  if (idsNuevos.length === 0 && idsAdendasNuevas.length === 0) return { modo: 'sin_cambios' }

  // 7. Si lo nuevo no cabe entero en el prompt (solo entran las 10 más recientes),
  //    una incremental perdería evoluciones: se regenera completa.
  if (
    diferencia(idsNuevos, e.idsEvolucionesEnPrompt).length > 0 ||
    diferencia(idsAdendasNuevas, e.idsAdendasEnPrompt).length > 0
  ) {
    return { modo: 'completa', motivo: 'exceso_nuevas' }
  }

  return { modo: 'incremental', motivo: 'incremental', idsNuevos, idsAdendasNuevas }
}

/**
 * ¿Vale la pena generar por evento? Evita crear resúmenes de pacientes que nadie abrirá:
 * solo si ya existe un resumen, o hay ≥2 evoluciones firmadas, y la especialidad usa Resumen IA.
 */
export const MIN_EVOLUCIONES_PRIMERA_GENERACION = 2

export function debeGenerarPorEvento(args: {
  tienePrevia: boolean
  evolucionesFirmadas: number
  /** null = el evento no tiene especialidad asociada (alta, plan): no se filtra por especialidad. */
  especialidadTieneResumenIA: boolean | null
}): boolean {
  if (args.especialidadTieneResumenIA === false) return false
  if (args.tienePrevia) return true
  return args.evolucionesFirmadas >= MIN_EVOLUCIONES_PRIMERA_GENERACION
}

/** Contador de incrementales de la nueva versión. */
export function siguienteContador(decision: Decision, previa: VersionPrevia | null): number {
  if (decision.modo !== 'incremental' || !previa) return 0
  return previa.incrementales_desde_completa + 1
}

/**
 * ¿La versión vigente quedó desactualizada respecto de lo firmado hoy?
 * Se calcula al leer (sin estado extra): cubre fallos de generación y carreras.
 */
export function estaDesactualizado(args: {
  idsCubiertas: string[]
  idsAdendasCubiertas: string[]
  idsEvolucionesActuales: string[]
  idsAdendasActuales: string[]
}): boolean {
  return (
    diferencia(args.idsEvolucionesActuales, args.idsCubiertas).length > 0 ||
    diferencia(args.idsAdendasActuales, args.idsAdendasCubiertas).length > 0 ||
    diferencia(args.idsCubiertas, args.idsEvolucionesActuales).length > 0 ||
    diferencia(args.idsAdendasCubiertas, args.idsAdendasActuales).length > 0
  )
}
