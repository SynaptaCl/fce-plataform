'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generarResumenIA } from '@/app/actions/resumen-ia'
import { ResumenIAModal } from './ResumenIAModal'
import type { ReporteIA } from '@/types/resumen-ia'

interface Props {
  idPaciente: string
  idClinica: string
}

type Estado = 'idle' | 'cargando' | 'error'

export function ResumenIAButton({ idPaciente, idClinica }: Props) {
  const [estado, setEstado] = useState<Estado>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [reporte, setReporte] = useState<ReporteIA | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  async function handleGenerar() {
    setEstado('cargando')
    setErrorMsg(null)
    const result = await generarResumenIA(idPaciente, idClinica)
    if (!result.success) {
      setEstado('error')
      setErrorMsg(result.error)
      return
    }
    setReporte(result.data)
    setEstado('idle')
    setModalAbierto(true)
  }

  async function handleRegenerar() {
    if (!reporte) return
    setEstado('cargando')
    setErrorMsg(null)
    const result = await generarResumenIA(idPaciente, idClinica)
    if (!result.success) {
      setEstado('error')
      setErrorMsg(result.error)
      return
    }
    setReporte({ ...result.data, desde_cache: false })
    setEstado('idle')
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={handleGenerar}
          disabled={estado === 'cargando'}
          title="Síntesis de antecedentes — No reemplaza el juicio clínico"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: 'var(--color-kp-primary, #4f46e5)' }}
        >
          {estado === 'cargando' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {estado === 'cargando' ? 'Generando…' : 'Resumen IA'}
        </button>
        {estado === 'error' && errorMsg && (
          <p className="text-xs text-red-600">{errorMsg}</p>
        )}
      </div>

      {modalAbierto && reporte && (
        <ResumenIAModal
          reporte={reporte}
          onClose={() => setModalAbierto(false)}
          onRegenerar={handleRegenerar}
          cargando={estado === 'cargando'}
        />
      )}
    </>
  )
}
