// src/components/modules/CopilotoNota/CopilotoNotaPanel.tsx
'use client'

import { Check, ChevronsDown, RefreshCw, X, Wand2 } from 'lucide-react'
import type { BorradorNota } from '@/lib/ia/copiloto-nota/types'

interface CopilotoNotaPanelProps {
  borrador: BorradorNota
  tieneContenido: boolean
  onInsertar: (modo: 'agregar' | 'reemplazar') => void
  onDescartar: () => void
}

export function CopilotoNotaPanel({
  borrador,
  tieneContenido,
  onInsertar,
  onDescartar,
}: CopilotoNotaPanelProps) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        borderColor: 'var(--color-kp-primary, #4f46e5)',
        background: 'var(--color-surface-0, #F1F5F9)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4" style={{ color: 'var(--color-kp-primary, #4f46e5)' }} />
          <span className="text-sm font-semibold text-ink-1">
            Borrador — {borrador.especialidad}
          </span>
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold text-white"
            style={{ background: 'var(--color-kp-primary, #4f46e5)' }}
          >
            IA
          </span>
        </div>
        <button
          type="button"
          onClick={onDescartar}
          className="text-ink-3 hover:text-ink-1 transition-colors"
          aria-label="Descartar borrador"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimer */}
      <p
        className="text-xs italic pl-3 border-l-2"
        style={{
          color: 'var(--color-ink-2, #475569)',
          borderColor: 'var(--color-kp-warning, #F5A623)',
        }}
      >
        Borrador generado por IA a partir de los apuntes ingresados. Debe ser revisado y editado
        por el profesional responsable antes de firmar.
      </p>

      {/* Contenido del borrador */}
      <div
        className="rounded-md border p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
        style={{
          background: 'var(--color-surface-1, #FFFFFF)',
          borderColor: 'var(--color-kp-border, #E2E8F0)',
          color: 'var(--color-ink-1, #1E293B)',
        }}
      >
        {borrador.contenido}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        {tieneContenido ? (
          <>
            <button
              type="button"
              onClick={() => onInsertar('agregar')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors"
              style={{ background: 'var(--color-kp-primary, #4f46e5)' }}
            >
              <ChevronsDown className="w-3.5 h-3.5" />
              Agregar al final
            </button>
            <button
              type="button"
              onClick={() => onInsertar('reemplazar')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
              style={{
                borderColor: 'var(--color-kp-primary, #4f46e5)',
                color: 'var(--color-kp-primary, #4f46e5)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reemplazar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onInsertar('agregar')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors"
            style={{ background: 'var(--color-kp-primary, #4f46e5)' }}
          >
            <Check className="w-3.5 h-3.5" />
            Insertar en nota
          </button>
        )}
        <button
          type="button"
          onClick={onDescartar}
          className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
          style={{
            borderColor: 'var(--color-kp-border, #E2E8F0)',
            color: 'var(--color-ink-2, #475569)',
          }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
