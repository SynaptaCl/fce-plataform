// src/components/modules/CopilotoNota/CopilotoNotaButton.tsx
'use client'

import { useState } from 'react'
import { Wand2, Loader2 } from 'lucide-react'
import { estructurarNota } from '@/app/actions/copiloto-nota'
import type { BorradorNota, EstructurarNotaInput } from '@/lib/ia/copiloto-nota/types'

interface CopilotoNotaButtonProps {
  encuentroId: string
  idClinica: string
  /** Devuelve el texto actual del textarea en el momento del click */
  getBullets: () => string
  /** Llamado con el borrador cuando la acción tiene éxito */
  onBorradorReady: (borrador: BorradorNota) => void
}

type Estado = 'idle' | 'cargando' | 'error'

export function CopilotoNotaButton({
  encuentroId,
  idClinica,
  getBullets,
  onBorradorReady,
}: CopilotoNotaButtonProps) {
  const [estado, setEstado] = useState<Estado>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleGenerar() {
    const bullets = getBullets()
    if (!bullets.trim()) {
      setEstado('error')
      setErrorMsg('Escribe algunos apuntes en la nota antes de usar el copiloto')
      return
    }

    setEstado('cargando')
    setErrorMsg(null)

    const input: EstructurarNotaInput = { idEncuentro: encuentroId, idClinica, bullets }
    const result = await estructurarNota(input)

    if (!result.success) {
      setEstado('error')
      setErrorMsg(result.error)
      return
    }

    onBorradorReady(result.data)
    setEstado('idle')
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleGenerar}
        disabled={estado === 'cargando'}
        title="Estructurar apuntes en nota clínica con IA"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          color: 'var(--color-kp-primary, #4f46e5)',
          borderColor: 'var(--color-kp-primary, #4f46e5)',
          background: 'transparent',
        }}
      >
        {estado === 'cargando' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Wand2 className="w-3 h-3" />
        )}
        {estado === 'cargando' ? 'Estructurando…' : 'Copiloto IA'}
      </button>
      {estado === 'error' && errorMsg && (
        <p className="text-xs text-red-600 text-right max-w-48">{errorMsg}</p>
      )}
    </div>
  )
}
