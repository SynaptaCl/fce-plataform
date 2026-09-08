"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { ProcedimientoEsteticoCatalogo } from "@/types/estetica";

interface Props {
  catalogo: ProcedimientoEsteticoCatalogo[];
  onSelect: (proc: ProcedimientoEsteticoCatalogo) => void;
  onClose: () => void;
}

const CATEGORIA_LABELS: Record<string, string> = {
  toxina_botulinica: "Toxina botulínica",
  relleno_ac_hialuronico: "Relleno / ácido hialurónico",
  laser: "Láser",
  peeling: "Peeling",
  radiofrecuencia: "Radiofrecuencia",
  mesoterapia: "Mesoterapia",
  otro: "Otros",
};

export function ProcedimientoPicker({ catalogo, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const categorias = Array.from(new Set(catalogo.map((p) => p.categoria)));

  const filtrados = query.trim()
    ? catalogo.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          p.categoria.toLowerCase().includes(query.toLowerCase()),
      )
    : catalogo;

  const porCategoria = categorias
    .map((cat) => ({ cat, items: filtrados.filter((p) => p.categoria === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--color-kp-border)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-ink-3)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar procedimiento..."
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-ink-3"
          style={{ color: "var(--color-ink-1)" }}
        />
        <button type="button" onClick={onClose} className="p-0.5 rounded transition-colors hover:bg-surface-0">
          <X className="w-4 h-4" style={{ color: "var(--color-ink-3)" }} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtrados.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--color-ink-3)" }}>
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
        ) : (
          porCategoria.map(({ cat, items }) => (
            <div key={cat}>
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide sticky top-0"
                style={{ color: "var(--color-ink-3)", background: "var(--color-surface-0)" }}
              >
                {CATEGORIA_LABELS[cat] ?? cat}
              </div>
              {items.map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => {
                    onSelect(proc);
                    onClose();
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-left transition-colors hover:bg-surface-0"
                  style={{ color: "var(--color-ink-1)" }}
                >
                  {proc.nombre}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
