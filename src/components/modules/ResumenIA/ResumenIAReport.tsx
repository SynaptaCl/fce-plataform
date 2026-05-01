'use client'

import type { ReporteIA } from '@/types/resumen-ia'

interface Props {
  reporte: ReporteIA
}

export function ResumenIAReport({ reporte }: Props) {
  return (
    <div className="space-y-5 text-sm">
      {/* Alertas prioritarias */}
      {reporte.alertas_prioritarias.length > 0 && (
        <section>
          <h3 className="font-semibold text-red-700 mb-2 uppercase text-xs tracking-wide">
            Alertas prioritarias
          </h3>
          <ul className="space-y-1.5">
            {reporte.alertas_prioritarias.map((alerta, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-red-800"
              >
                <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                <span>{alerta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resumen narrativo */}
      <section>
        <h3 className="font-semibold text-ink-2 mb-2 uppercase text-xs tracking-wide">
          Resumen narrativo
        </h3>
        <p className="text-ink-1 leading-relaxed whitespace-pre-line">{reporte.resumen_narrativo}</p>
      </section>

      {/* Evolución clínica */}
      <section>
        <h3 className="font-semibold text-ink-2 mb-2 uppercase text-xs tracking-wide">
          Evolución clínica
        </h3>
        <p className="text-ink-1 leading-relaxed whitespace-pre-line">{reporte.evolucion_clinica}</p>
      </section>

      {/* Estado actual */}
      <section>
        <h3 className="font-semibold text-ink-2 mb-2 uppercase text-xs tracking-wide">
          Estado actual
        </h3>
        <p className="text-ink-1 leading-relaxed">{reporte.estado_actual}</p>
      </section>

      {/* Información faltante */}
      {reporte.informacion_faltante.length > 0 && (
        <section>
          <h3 className="font-semibold text-ink-3 mb-2 uppercase text-xs tracking-wide">
            Información no disponible
          </h3>
          <ul className="space-y-1">
            {reporte.informacion_faltante.map((item, i) => (
              <li key={i} className="text-ink-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
