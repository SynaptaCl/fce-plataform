import { after } from 'next/server'
import { log } from '@/lib/logger'
import { actualizarResumen, type ParamsActualizacion } from './generar'

/**
 * Programa la actualización del Resumen IA DESPUÉS de responder al usuario.
 * `after()` es obligatorio: un `void promesa` suelto no sobrevive en serverless.
 * Nunca lanza ni bloquea la firma clínica: cualquier fallo queda en logs y la ficha
 * sigue mostrando la última versión válida (marcada "desactualizada" al abrirla).
 */
export function programarResumenIA(params: Omit<ParamsActualizacion, 'origen'>): void {
  const ctx = { id_clinica: params.idClinica, id_paciente: params.idPaciente }
  try {
    after(async () => {
      try {
        const r = await actualizarResumen({ ...params, origen: 'evento' })
        if (r.estado === 'error') log('warn', { action: 'resumen_ia_evento_error', ...ctx })
      } catch (e) {
        log('error', { action: 'resumen_ia_evento_fallido', ...ctx, error: e })
      }
    })
  } catch (e) {
    log('error', { action: 'resumen_ia_programar_fallido', ...ctx, error: e })
  }
}
