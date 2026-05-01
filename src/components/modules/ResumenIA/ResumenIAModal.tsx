'use client'

import { X } from 'lucide-react'
import type { ReporteIA } from '@/types/resumen-ia'
import { ResumenIAReport } from './ResumenIAReport'

interface Props {
  reporte: ReporteIA
  onClose: () => void
  onRegenerar: () => void
  cargando: boolean
}

export function ResumenIAModal({ reporte, onClose, onRegenerar, cargando }: Props) {
  const fecha = new Date(reporte.generado_en).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer lateral */}
      <div className="relative z-10 h-full w-full max-w-lg bg-surface-1 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kp-border">
          <div className="flex items-center gap-2.5">
            <h2 className="font-semibold text-ink-1">Resumen Clínico Asistido</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-kp-primary,#4f46e5)] text-white">
              IA
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink-1 hover:bg-surface-0 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta + regenerar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface-0 border-b border-kp-border text-xs text-ink-3">
          <span>{reporte.desde_cache ? `Desde caché · ${fecha}` : `Generado el ${fecha}`}</span>
          {reporte.desde_cache && (
            <button
              onClick={onRegenerar}
              disabled={cargando}
              className="text-[var(--color-kp-primary,#4f46e5)] hover:underline disabled:opacity-50"
            >
              {cargando ? 'Generando…' : 'Regenerar'}
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mx-5 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 leading-relaxed">
          Este resumen fue generado automáticamente a partir de los registros clínicos disponibles
          en el sistema. Es una herramienta de apoyo para el profesional tratante y no constituye
          un diagnóstico médico, recomendación terapéutica ni reemplaza el juicio clínico del
          profesional responsable de la atención.
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ResumenIAReport reporte={reporte} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-kp-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-surface-0 text-ink-2 hover:bg-kp-border transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
