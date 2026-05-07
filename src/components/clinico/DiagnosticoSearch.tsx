'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ICDCodeSnap, ICDSearchResult } from '@/lib/icd/types';
import { searchDiagnosticos } from '@/app/actions/clinico/diagnostico';
import { DiagnosticoChip } from './DiagnosticoChip';

interface DiagnosticoSearchProps {
  value: ICDCodeSnap[];
  onChange: (codes: ICDCodeSnap[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const ICD_VERSION = '11/2025-01';
const ICD_LANGUAGE = 'es';
const ICD_URI_BASE = 'http://id.who.int/icd/release/11/2025-01/mms';

function buildUri(id: string): string {
  return `${ICD_URI_BASE}/${id}`;
}

function buildSnap(result: ICDSearchResult): ICDCodeSnap {
  return {
    code: result.code ?? '',
    title: result.title,
    uri: buildUri(result.id),
    version: ICD_VERSION,
    language: ICD_LANGUAGE,
    addedAt: new Date().toISOString(),
    addedBy: '',
  };
}

export function DiagnosticoSearch({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Busca por nombre o código ICD-11 (ej: diabetes, J45)',
}: DiagnosticoSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ICDSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchDiagnosticos(query.trim());
        if (res.success && res.data) {
          setResults(res.data.slice(0, 10));
          setDropdownOpen(true);
        } else {
          setResults([]);
          setDropdownOpen(false);
        }
      } catch {
        // Silently degrade — API failure should not block the clinical flow
        setResults([]);
        setDropdownOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(result: ICDSearchResult) {
    const uri = buildUri(result.id);

    // Prevent duplicates
    if (value.some((v) => v.uri === uri)) {
      setQuery('');
      setDropdownOpen(false);
      setResults([]);
      return;
    }

    const snap = buildSnap(result);
    onChange([...value, snap]);
    setQuery('');
    setDropdownOpen(false);
    setResults([]);
  }

  function handleRemove(uri: string) {
    onChange(value.filter((v) => v.uri !== uri));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Chips row */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((snap) => (
            <DiagnosticoChip
              key={snap.uri}
              code={snap}
              onRemove={readOnly ? undefined : () => handleRemove(snap.uri)}
              showTooltip={true}
            />
          ))}
        </div>
      )}

      {/* Input + dropdown — hidden in readOnly */}
      {!readOnly && (
        <div ref={containerRef} className="relative">
          {/* Input */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              'border border-kp-border bg-surface-1',
              'focus-within:ring-1',
            )}
            style={{ '--tw-ring-color': 'var(--color-kp-accent)' } as React.CSSProperties}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-ink-1 placeholder:text-ink-3 text-sm"
              autoComplete="off"
              spellCheck={false}
              aria-label="Búsqueda de diagnóstico ICD-11"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen}
            />
            {isLoading && (
              <Loader2
                className="w-4 h-4 animate-spin shrink-0"
                style={{ color: 'var(--color-kp-accent)' }}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className={cn(
                'absolute top-full left-0 right-0 mt-1 z-50',
                'rounded-lg shadow-lg overflow-hidden',
                'border border-kp-border bg-surface-1',
                'max-h-72 overflow-y-auto',
              )}
              role="listbox"
              aria-label="Resultados de búsqueda ICD-11"
            >
              {results.length === 0 ? (
                <p
                  className="px-3 py-3 text-sm"
                  style={{ color: 'var(--color-ink-3)' }}
                >
                  Sin resultados. Puedes ingresar el diagnóstico como texto libre.
                </p>
              ) : (
                results.map((result) => {
                  const uri = buildUri(result.id);
                  const isDuplicate = value.some((v) => v.uri === uri);
                  return (
                    <button
                      key={result.id}
                      type="button"
                      role="option"
                      aria-selected={isDuplicate}
                      disabled={isDuplicate}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 text-sm',
                        'transition-colors border-b border-kp-border last:border-b-0',
                        isDuplicate
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-surface-0 cursor-pointer',
                      )}
                      style={{ color: 'var(--color-ink-1)' }}
                    >
                      {result.code ? (
                        <>
                          <span
                            className="font-mono font-semibold mr-2 text-xs"
                            style={{ color: 'var(--color-kp-primary)' }}
                          >
                            {result.code}
                          </span>
                          <span>{result.title}</span>
                        </>
                      ) : (
                        <span>{result.title}</span>
                      )}
                      {isDuplicate && (
                        <span
                          className="ml-2 text-xs"
                          style={{ color: 'var(--color-ink-3)' }}
                        >
                          (ya agregado)
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
