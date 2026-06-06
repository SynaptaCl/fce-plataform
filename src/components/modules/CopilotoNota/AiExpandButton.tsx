'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { estructurarNota } from '@/app/actions/copiloto-nota'
import type { EstructurarNotaInput } from '@/lib/ia/copiloto-nota/types'

interface AiExpandButtonProps {
  text: string
  section: 'S' | 'O' | 'P'
  encuentroId: string
  idClinica: string
  onResult: (expanded: string) => void
  onLoadingChange?: (loading: boolean) => void
  disabled?: boolean
}

export function AiExpandButton({
  text,
  section,
  encuentroId,
  idClinica,
  onResult,
  onLoadingChange,
  disabled,
}: AiExpandButtonProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // All hooks called unconditionally above; safe to return early here
  if (!text.trim()) return null

  async function handleClick() {
    if (loading) return
    setLoading(true)
    onLoadingChange?.(true)
    setErrorMsg(null)

    const input: EstructurarNotaInput = {
      idEncuentro: encuentroId,
      idClinica,
      bullets: text,
      seccion: section,
    }
    const result = await estructurarNota(input)

    // Check if component unmounted during async call
    if (!mountedRef.current) return

    setLoading(false)
    onLoadingChange?.(false)

    if (!result.success) {
      setErrorMsg(result.error)
      return
    }
    onResult(result.data.contenido)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        title="Expandir apuntes a redacción clínica con IA"
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          color: 'var(--color-kp-primary, #4f46e5)',
          borderColor: 'var(--color-kp-primary, #4f46e5)',
          background: 'transparent',
        }}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        <span>{loading ? 'Expandiendo…' : 'IA'}</span>
      </button>
      {errorMsg && (
        <p
          className="text-xs text-right max-w-48"
          style={{ color: 'var(--color-kp-danger, #ef4444)' }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}
