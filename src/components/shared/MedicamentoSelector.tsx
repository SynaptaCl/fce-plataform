"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import { searchMedicamentos } from "@/app/actions/prescripciones";
import type { MedicamentoPrescrito, ViaAdministracion } from "@/types/prescripcion";
import type { MedicamentoCatalogo } from "@/types/medicamento";

interface Props {
  onSelect: (med: MedicamentoPrescrito) => void;
}

export function MedicamentoSelector({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicamentoCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      timerRef.current = setTimeout(() => {
        setResults([]);
        setOpen(false);
      }, 0);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const result = await searchMedicamentos(query);
      if (result.success) {
        setResults(result.data);
        setOpen(true);
      }
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  function selectFromCatalog(med: MedicamentoCatalogo) {
    const item: MedicamentoPrescrito = {
      id_medicamento_catalogo: med.id,
      principio_activo: med.principio_activo,
      nombre_comercial: med.nombre_comercial,
      presentacion: med.presentacion,
      via: med.via_administracion as ViaAdministracion,
      dosis: "",
      frecuencia: med.dosis_adulto_sugerida ?? "",
      duracion: "",
      cantidad_total: "",
      instrucciones: null,
    };
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function addManual() {
    const item: MedicamentoPrescrito = {
      id_medicamento_catalogo: null,
      principio_activo: query,
      nombre_comercial: null,
      presentacion: "",
      via: "oral",
      dosis: "",
      frecuencia: "",
      duracion: "",
      cantidad_total: "",
      instrucciones: null,
    };
    onSelect(item);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4" style={{ color: "var(--ink-3)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar medicamento..."
          className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border"
          style={{ borderColor: "var(--kp-border)", color: "var(--ink-1)" }}
        />
      </div>

      {open && (
        <div
          className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{ borderColor: "var(--kp-border)", background: "#ffffff" }}
        >
          {loading && (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--ink-3)" }}>Buscando...</div>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <button
              onClick={addManual}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
              style={{ color: "var(--ink-2)" }}
            >
              <Plus className="size-4" />
              Agregar &ldquo;{query}&rdquo; manualmente
            </button>
          )}
          {results.map((med) => (
            <button
              key={med.id}
              onClick={() => selectFromCatalog(med)}
              className="w-full flex flex-col items-start px-3 py-2 text-sm text-left hover:bg-gray-50"
            >
              <span className="font-medium" style={{ color: "var(--ink-1)" }}>
                {med.principio_activo}{med.nombre_comercial ? ` (${med.nombre_comercial})` : ""}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                {med.presentacion} · {med.grupo_terapeutico ?? ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
