'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAccesoFCE } from '@/lib/modules/guards'
import type { ActionResult } from '@/lib/modules/guards'
import type { ReporteIA } from '@/types/resumen-ia'
import { withPartialFlag } from '@/lib/ia/resumen-guard'
import { actualizarResumen } from '@/lib/ia/resumen/generar'
import { listarCobertura } from '@/lib/ia/resumen/cobertura'
import { estaDesactualizado } from '@/lib/ia/resumen/decision'
import { log } from '@/lib/logger'
import { iaRateLimit, iaRateLimitClinica } from '@/lib/rate-limit'

// Modelo: ver MODEL en lib/ia/resumen/generar.ts (Sonnet, no bajar sin evidencia de calidad).

/**
 * Auth + autorización multi-tenant compartidas por lectura y regeneración manual.
 * UNIQUE(auth_id, id_clinica) permite multi-clínica: se busca la fila de la clínica
 * solicitada (set-membership) en vez de .single().
 */
async function autorizar(idClinica: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, error: 'No autenticado' }

  const { data: adminRows } = await supabase
    .from('admin_users')
    .select('id_clinica, rol')
    .eq('auth_id', user.id)
    .eq('activo', true)

  const admin = adminRows?.find((r) => r.id_clinica === idClinica)
  if (!admin) return { ok: false as const, error: 'Sin acceso a esta clínica' }

  try {
    requireAccesoFCE(admin.rol)
  } catch {
    return { ok: false as const, error: 'Sin permiso para acceder a la FCE' }
  }
  return { ok: true as const, supabase, user }
}

/**
 * Lee la versión vigente del resumen. NO llama a Anthropic: ver el resumen es gratis.
 * Devuelve `null` si el paciente aún no tiene resumen guardado.
 * `desactualizado` avisa si hay evoluciones/adendas firmadas que esta versión no cubre
 * (p. ej. falló la generación automática): se muestra la última versión válida con su fecha.
 */
export async function obtenerResumenVigente(
  idPaciente: string,
  idClinica: string
): Promise<ActionResult<ReporteIA | null>> {
  const auth = await autorizar(idClinica)
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase } = auth

  try {
    const { data: fila, error } = await supabase
      .from('fce_resumenes_ia_versiones')
      .select(
        'version, tipo, modelo, reporte, generado_en, ids_evoluciones_cubiertas, ids_adendas_cubiertas'
      )
      .eq('id_paciente', idPaciente)
      .eq('id_clinica', idClinica)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!fila) return { success: true, data: null }

    const cobertura = await listarCobertura(supabase, idPaciente, idClinica)
    const reporte = fila.reporte as Omit<ReporteIA, 'desde_cache' | 'generado_en'>

    return {
      success: true,
      data: {
        ...reporte,
        generado_en: fila.generado_en as string,
        desde_cache: true,
        version: fila.version as number,
        tipo_version: fila.tipo as 'completa' | 'incremental',
        modelo: fila.modelo as string,
        desactualizado: estaDesactualizado({
          idsCubiertas: (fila.ids_evoluciones_cubiertas as string[]) ?? [],
          idsAdendasCubiertas: (fila.ids_adendas_cubiertas as string[]) ?? [],
          idsEvolucionesActuales: cobertura.idsEvoluciones,
          idsAdendasActuales: cobertura.idsAdendas,
        }),
      },
    }
  } catch (e) {
    log('error', { action: 'resumen_ia_leer_vigente', id_clinica: idClinica, id_paciente: idPaciente, error: e })
    return { success: false, error: 'No se pudo cargar el resumen guardado' }
  }
}

/**
 * Regeneración MANUAL (botón "Generar" / "Actualizar"): siempre ficha completa.
 * La generación habitual es automática al firmar una evolución (ver programarResumenIA).
 * Si falla, no toca la versión vigente: el cliente sigue mostrando la última válida.
 */
export async function generarResumenIA(
  idPaciente: string,
  idClinica: string
): Promise<ActionResult<ReporteIA>> {
  const auth = await autorizar(idClinica)
  if (!auth.ok) return { success: false, error: auth.error }
  const { supabase, user } = auth

  // Rate limit por-usuario y por-clínica: el segundo evita que una clínica entera (o una
  // sesión comprometida rotando de usuario) sume costo sin disparar el primero.
  const rl = await iaRateLimit('resumen', user.id, 6, 60_000)
  if (!rl.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de resumen. Espera un momento e inténtalo de nuevo.' }
  }
  const rlClinica = await iaRateLimitClinica('resumen', idClinica, 30, 60_000)
  if (!rlClinica.allowed) {
    return { success: false, error: 'Demasiadas solicitudes de resumen en esta clínica. Espera un momento e inténtalo de nuevo.' }
  }

  const r = await actualizarResumen({
    supabase,
    idPaciente,
    idClinica,
    actorId: user.id,
    origen: 'manual',
    forzarCompleta: 'manual',
  })

  if (r.estado === 'generado') {
    return { success: true, data: withPartialFlag(r.reporte, r.secciones_con_error) }
  }
  if (r.estado === 'error') return { success: false, error: r.error }
  // sin_cambios / omitido no ocurren en manual (se fuerza completa); defensivo.
  return { success: false, error: 'No se pudo generar el resumen. Intenta nuevamente.' }
}
