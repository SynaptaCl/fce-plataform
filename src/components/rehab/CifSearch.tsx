'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { searchCIF } from '@/app/actions/rehab/cif';
import type { ICDSearchResult } from '@/lib/icd/types';

interface CifSearchProps {
  value: string;
  description: string;
  dominioPrefix?: string;
  placeholder?: string;
  readOnly?: boolean;
  onSelect: (result: { code: string; description: string }) => void;
}

export function CifSearch({
  value,
  description,
  dominioPrefix,
  placeholder,
  readOnly = false,
  onSelect,
}: CifSearchProps) {
  const [descInput, setDescInput] = useState(description);
  const [codeInput, setCodeInput] = useState(value);
  const [results, setResults] = useState<ICDSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setCodeInput(value);
    setDescInput(description);
  }, [value, description]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const runSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (query.trim().length < 2) {
          setResults([]);
          setOpen(false);
          return;
        }
        setLoading(true);
        try {
          const res = await searchCIF(query, dominioPrefix);
          if (res.success) {
            setResults(res.data);
            setOpen(res.data.length > 0 || query.trim().length >= 2);
          }
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [dominioPrefix],
  );

  function handleDescChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setDescInput(q);
    runSearch(q);
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      if (codeInput.trim().length >= 2) {
        runSearch(codeInput.trim());
        setOpen(true);
      }
    }
  }

  function handleSelect(result: ICDSearchResult) {
    const code = result.code ?? '';
    const desc = result.title;
    setCodeInput(code);
    setDescInput(desc);
    setOpen(false);
    setResults([]);
    onSelect({ code, description: desc });
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <input
          type="text"
          value={value}
          readOnly
          disabled
          className="w-16 px-2 py-1 text-xs font-mono rounded"
          style={{
            color: 'var(--color-kp-primary)',
            background: 'var(--color-kp-accent-xs)',
            border: '1px solid color-mix(in srgb, var(--color-kp-accent) 20%, transparent)',
          }}
        />
        <input
          type="text"
          value={description}
          readOnly
          disabled
          className="flex-1 px-2 py-1 text-xs rounded"
          style={{
            color: 'var(--color-kp-ink-1, var(--color-ink-1))',
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-kp-border)',
          }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center gap-2 flex-1 relative">
      {/* Code input */}
      <input
        type="text"
        placeholder={placeholder ?? 'b000'}
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value)}
        onKeyDown={handleCodeKeyDown}
        className="w-16 px-2 py-1 text-xs font-mono rounded focus:outline-none"
        style={{
          color: 'var(--color-kp-primary)',
          background: 'var(--color-kp-accent-xs)',
          border: '1px solid color-mix(in srgb, var(--color-kp-accent) 20%, transparent)',
          boxShadow: undefined,
        }}
        onFocus={(e) =>
          (e.currentTarget.style.boxShadow =
            '0 0 0 2px color-mix(in srgb, var(--color-kp-accent) 40%, transparent)')
        }
        onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
      />

      {/* Description input + spinner */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Descripción del ítem CIF…"
          value={descInput}
          onChange={handleDescChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          className="w-full px-2 py-1 text-xs rounded focus:outline-none"
          style={{
            color: 'var(--color-ink-1)',
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-kp-border)',
            paddingRight: loading ? '1.5rem' : undefined,
          }}
          onFocusCapture={(e) =>
            (e.currentTarget.style.boxShadow =
              '0 0 0 2px color-mix(in srgb, var(--color-kp-accent) 40%, transparent)')
          }
          onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
        />
        {loading && (
          <Loader2
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin"
            style={{ color: 'var(--color-kp-accent)' }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg shadow-lg overflow-hidden"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-kp-border)',
          }}
        >
          {results.length === 0 ? (
            <div
              className="px-3 py-2 text-xs italic"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Sin resultados. Ingresa el código manualmente.
            </div>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(r);
                    }}
                    className="w-full text-left px-3 py-2 text-xs transition-colors"
                    style={{ color: 'var(--color-ink-1)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--color-kp-accent-xs)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    {r.code ? (
                      <>
                        <span
                          className="font-mono font-semibold mr-1.5"
                          style={{ color: 'var(--color-kp-primary)' }}
                        >
                          {r.code}
                        </span>
                        <span>— {r.title}</span>
                      </>
                    ) : (
                      r.title
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
