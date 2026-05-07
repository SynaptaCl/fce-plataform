'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ICDCodeSnap, ICDEntity } from '@/lib/icd/types';
import { getEntityDetail } from '@/app/actions/clinico/diagnostico';

interface DiagnosticoChipProps {
  code: ICDCodeSnap;
  onRemove?: () => void;
  showTooltip?: boolean;
}

/**
 * Extrae el último segmento del path de la URI de una entidad ICD-11.
 * Ej: "http://id.who.int/icd/release/11/2025-01/mms/12345678" → "12345678"
 */
function extractEntityId(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] ?? '';
}

/**
 * Trunca un string a maxLen caracteres, añadiendo "…" si es necesario.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function DiagnosticoChip({
  code,
  onRemove,
  showTooltip = true,
}: DiagnosticoChipProps) {
  const isReadOnly = onRemove === undefined;

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [entity, setEntity] = useState<ICDEntity | null>(null);
  const [tooltipLoading, setTooltipLoading] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tooltip is shown when showTooltip=true AND NOT readOnly (i.e., onRemove is defined)
  const showTooltipFeature = showTooltip && !isReadOnly;

  const handleMouseEnter = async () => {
    if (!showTooltipFeature) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setTooltipVisible(true);

    // Lazy load entity detail only once
    if (!entity && !tooltipLoading) {
      setTooltipLoading(true);
      try {
        const entityId = extractEntityId(code.uri);
        const result = await getEntityDetail(entityId);
        if (result.success && result.data) {
          setEntity(result.data);
        }
      } catch {
        // Silently fail — tooltip shows title from snap
      } finally {
        setTooltipLoading(false);
      }
    }
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 150);
  };

  return (
    <span
      className="relative inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        backgroundColor: 'var(--color-kp-accent-lt)',
        color: 'var(--color-kp-primary)',
      }}
      onMouseEnter={showTooltipFeature ? handleMouseEnter : undefined}
      onMouseLeave={showTooltipFeature ? handleMouseLeave : undefined}
    >
      {/* Code badge */}
      <span className="font-mono font-semibold">{code.code}</span>

      {/* Title truncated */}
      <span>{truncate(code.title, 30)}</span>

      {/* Remove button — only when onRemove is defined */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5',
            'hover:opacity-70 focus-visible:outline-none focus-visible:ring-1',
            'transition-opacity'
          )}
          style={{ color: 'var(--color-kp-primary)' }}
          aria-label={`Eliminar diagnóstico ${code.code}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Tooltip — only when showTooltip=true AND NOT readOnly (onRemove is defined) */}
      {showTooltipFeature && tooltipVisible && (
        <span
          className={cn(
            'absolute bottom-full left-0 mb-1.5 z-50',
            'min-w-48 max-w-72 p-3 rounded-lg shadow-lg text-left',
            'border border-kp-border bg-surface-1'
          )}
          style={{ color: 'var(--color-kp-primary)' }}
          onMouseEnter={() => {
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <span className="block font-semibold font-mono text-xs mb-1">{code.code}</span>
          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--color-kp-primary)' }}>
            {code.title}
          </span>
          {tooltipLoading && (
            <span className="block text-xs" style={{ color: 'var(--color-ink-3)' }}>
              Cargando detalle...
            </span>
          )}
          {!tooltipLoading && entity?.description && (
            <span className="block text-xs mt-1" style={{ color: 'var(--color-ink-2)' }}>
              {entity.description}
            </span>
          )}
          {!tooltipLoading && !entity?.description && (
            <span className="block text-xs mt-1" style={{ color: 'var(--color-ink-3)' }}>
              ICD-11 · {code.version}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
