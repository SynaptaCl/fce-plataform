"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { ProcedimientoCatalogo } from "@/types/plan-tratamiento";

interface Props {
  catalogo: ProcedimientoCatalogo[];
  onSelect: (proc: ProcedimientoCatalogo) => void;
  onClose: () => void;
}

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
          p.categoria.toLowerCase().includes(query.toLowerCase()) ||
          p.codigo.toLowerCase().includes(query.toLowerCase()),
      )
    : catalogo;

  const porCategoria = categorias
    .map((cat) => ({
      cat,
      items: filtrados.filter((p) => p.categoria === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: "var(--kp-border)", background: "var(--surface-1)" }}
    >
      {/* Buscador */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "var(--kp-border)" }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--ink-3)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar procedimiento..."
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-ink-3"
          style={{ color: "var(--ink-1)" }}
        />
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded transition-colors hover:bg-surface-0"
        >
          <X className="w-4 h-4" style={{ color: "var(--ink-3)" }} />
        </button>
      </div>

      {/* Resultados */}
      <div className="max-h-64 overflow-y-auto">
        {filtrados.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--ink-3)" }}>
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
        ) : (
          porCategoria.map(({ cat, items }) => (
            <div key={cat}>
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide sticky top-0"
                style={{
                  color: "var(--ink-3)",
                  background: "var(--surface-0)",
                }}
              >
                {cat}
              </div>
              {items.map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => {
                    onSelect(proc);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors hover:bg-surface-0"
                  style={{ color: "var(--ink-1)" }}
                >
                  <span>{proc.nombre}</span>
                  {proc.precio_base > 0 && (
                    <span className="text-xs shrink-0 ml-3" style={{ color: "var(--ink-3)" }}>
                      ${proc.precio_base.toLocaleString("es-CL")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
