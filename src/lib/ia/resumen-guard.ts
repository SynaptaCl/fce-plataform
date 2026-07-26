import {
  SECTION_LABELS,
  SECCIONES_CRITICAS,
  SECCIONES_NO_CRITICAS,
  MAX_SECCIONES_NO_CRITICAS,
  type ContextoClinico,
} from './contexto-clinico'
import type { ReporteIA } from '@/types/resumen-ia'

export interface ContextoGuardResult {
  ok: boolean
  error?: string
}

/**
 * Guard híbrido — decide si `contexto` alcanza para generar un resumen.
 * Función pura (sin I/O), separada de resumen-ia.ts (que es `'use server'` y solo
 * puede exportar Server Actions async) para poder probarla directamente en
 * scripts/test-resumen-ia-parcial.ts sin necesitar Supabase/Anthropic reales.
 *
 * Orden: 1) `evolucion` mantiene su hard-gate propio vía `tiene_datos_suficientes`
 * — distingue "sin atenciones" (legítimo) de "no se pudo verificar" (evolucion falló).
 * 2) Cualquier sección crítica (anamnesis, medicación — alergias/interacciones) basta
 * sola para bloquear. 3) Secciones no críticas solo bloquean si fallan ≥ el umbral.
 * `alertas` no se evalúa aparte — se deriva de anamnesis/signos_vitales/medicacion/
 * examenes sin query propia, así que ya queda cubierta si cualquiera de esas falla
 * (auditoría RLS 2026-07, Fase 1 punto 1).
 */
export function evaluarContextoParaResumen(contexto: ContextoClinico): ContextoGuardResult {
  if (!contexto.tiene_datos_suficientes) {
    if (contexto.secciones_con_error.includes('evolucion')) {
      return { ok: false, error: 'No se pudo verificar el historial de atenciones del paciente. Intenta nuevamente.' }
    }
    return { ok: false, error: 'El paciente no tiene atenciones registradas en este sistema' }
  }

  const seccionesCriticasFallidas = contexto.secciones_con_error.filter((s) =>
    SECCIONES_CRITICAS.includes(s)
  )
  const seccionesNoCriticasFallidas = contexto.secciones_con_error.filter((s) =>
    SECCIONES_NO_CRITICAS.includes(s)
  )
  if (
    seccionesCriticasFallidas.length > 0 ||
    seccionesNoCriticasFallidas.length >= MAX_SECCIONES_NO_CRITICAS
  ) {
    return {
      ok: false,
      // Genérico y accionable — nunca se expone al profesional qué sección falló.
      error: 'No se pudo cargar suficiente información clínica para generar el resumen. Intenta nuevamente.',
    }
  }

  return { ok: true }
}

/**
 * Antepone un aviso visible en `alertas_prioritarias` (ya renderizado en rojo por
 * ResumenIAReport — no requiere UI nueva) cuando alguna sección del contexto falló
 * por error real, en vez de mostrarse simplemente vacía. Se calcula en cada llamada,
 * nunca se guarda en caché — así un resumen cacheado que hoy sí carga completo no
 * hereda la advertencia de una ejecución anterior.
 */
export function withPartialFlag(reporte: ReporteIA, seccionesConError: string[]): ReporteIA {
  if (seccionesConError.length === 0) return reporte
  const labels = seccionesConError.map((s) => SECTION_LABELS[s] ?? s).join(', ')
  const aviso = `Resumen parcial: no se pudo cargar ${labels}. No lo uses como fuente completa — revisa la ficha clínica directamente.`
  return { ...reporte, alertas_prioritarias: [aviso, ...reporte.alertas_prioritarias] }
}
