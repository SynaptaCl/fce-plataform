"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { searchExamenes } from "@/app/actions/ordenes-examen";
import type { ExamenCatalogo, ExamenIndicado } from "@/types/orden-examen";

interface Props {
  onSelect: (examen: ExamenIndicado) => void;
}

function categoriaBadgeVariant(
  categoria: ExamenCatalogo["categoria"]
): "info" | "teal" | "success" | "default" {
  if (categoria === "laboratorio") return "info";
  if (categoria === "imagenologia") return "teal";
  if (categoria === "procedimiento") return "success";
  return "default";
}

function categoriaLabel(categoria: ExamenCatalogo["categoria"]): string {
  const map: Record<ExamenCatalogo["categoria"], string> = {
    laboratorio: "Laboratorio",
    imagenologia: "Imagenología",
    procedimiento: "Procedimiento",
    otro: "Otro",
  };
  return map[categoria];
}

export function ExamenSelector({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExamenCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchExamenes(query);
        if (res.success) {
          setResults(res.data);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function buildFromCatalogo(cat: ExamenCatalogo): ExamenIndicado {
    return {
      id_examen_catalogo: cat.id,
      codigo: cat.codigo,
      nombre: cat.nombre,
      categoria: cat.categoria,
      indicacion_clinica: "",
      urgente: false,
      instrucciones: null,
      preparacion_paciente: cat.preparacion_paciente,
    };
  }

  function buildManual(nombre: string): ExamenIndicado {
    return {
      id_examen_catalogo: null,
      codigo: "MANUAL",
      nombre,
      categoria: "otro",
      indicacion_clinica: "",
      urgente: false,
      instrucciones: null,
      preparacion_paciente: null,
    };
  }

  function handleSelect(examen: ExamenIndicado) {
    onSelect(examen);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--ink-3)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar examen..."
          className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            borderColor: "var(--kp-border)",
            background: "var(--surface-0)",
            color: "var(--ink-1)",
          }}
        />
        {loading && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--ink-3)" }}
          >
            Buscando…
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
          style={{ borderColor: "var(--kp-border)", background: "var(--surface-1)" }}
        >
          {results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "var(--kp-border)" }}>
              {results.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-0 transition-colors flex items-center gap-2"
                    onClick={() => handleSelect(buildFromCatalogo(cat))}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate" style={{ color: "var(--ink-1)" }}>
                        {cat.nombre}
                      </span>
                      <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                        {cat.codigo}
                      </span>
                    </span>
                    <Badge variant={categoriaBadgeVariant(cat.categoria)}>
                      {categoriaLabel(cat.categoria)}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                Sin resultados para &quot;{query}&quot;.
              </p>
            </div>
          )}

          {/* Manual add option — always shown when query.length >= 2 and no results */}
          {results.length === 0 && query.length >= 2 && (
            <div className="px-4 pb-3">
              <button
                type="button"
                className="w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors"
                style={{ borderColor: "var(--kp-border)", color: "var(--ink-2)" }}
                onClick={() => handleSelect(buildManual(query))}
              >
                Agregar &quot;{query}&quot; manualmente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
