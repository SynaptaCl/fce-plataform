"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, ShieldCheck, AlertTriangle } from "lucide-react";
import { searchMedicamentos } from "@/app/actions/prescripciones";
import type { MedicamentoPrescrito, ViaAdministracion } from "@/types/prescripcion";
import type { MedicamentoConPresentaciones, MedicamentoPresentacion } from "@/types/medicamento";

interface Props {
  onSelect: (med: MedicamentoPrescrito) => void;
}

export function MedicamentoSelector({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicamentoConPresentaciones[]>([]);
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

  function select(med: MedicamentoConPresentaciones, presentacion: MedicamentoPresentacion | null) {
    const item: MedicamentoPrescrito = {
      id_medicamento_catalogo: med.id,
      id_presentacion: presentacion?.id ?? null,
      principio_activo: med.principio_activo,
      nombre_comercial: presentacion?.nombre_comercial ?? null,
      laboratorio: presentacion?.laboratorio ?? null,
      bioequivalente: presentacion?.bioequivalente ?? null,
      presentacion: presentacion?.presentacion ?? "",
      via: (med.via_administracion as ViaAdministracion | null) ?? "oral",
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
      id_presentacion: null,
      principio_activo: query,
      nombre_comercial: null,
      laboratorio: null,
      bioequivalente: null,
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
        <Search className="absolute left-3 top-2.5 size-4" style={{ color: "var(--color-ink-3)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por principio activo o marca..."
          className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
        />
      </div>

      {open && (
        <div
          className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg overflow-hidden max-h-96 overflow-y-auto"
          style={{ borderColor: "var(--color-kp-border)", background: "#ffffff" }}
        >
          {loading && (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--color-ink-3)" }}>Buscando...</div>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={addManual}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
              style={{ color: "var(--color-ink-2)" }}
            >
              <Plus className="size-4" />
              Agregar &ldquo;{query}&rdquo; manualmente
            </button>
          )}
          {results.map((med) => (
            <div key={med.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-kp-border)" }}>
              <button
                type="button"
                onClick={() => select(med, null)}
                className="w-full flex flex-col items-start px-3 py-2 text-sm text-left hover:bg-gray-50"
              >
                <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--color-ink-1)" }}>
                  {med.principio_activo}
                  {!med.validado_clinicamente && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "#fef3c7", color: "#92400e" }}
                      title="Contenido pendiente de validación clínica"
                    >
                      <AlertTriangle className="size-3" />
                      No validado
                    </span>
                  )}
                </span>
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {med.grupo_terapeutico ?? "DCI"} · usar sin marca
                </span>
              </button>
              {med.medicamentos_presentaciones?.map((pres) => (
                <button
                  key={pres.id}
                  type="button"
                  onClick={() => select(med, pres)}
                  className="w-full flex items-center justify-between gap-2 pl-6 pr-3 py-1.5 text-sm text-left hover:bg-gray-50"
                >
                  <span className="truncate" style={{ color: "var(--color-ink-2)" }}>
                    {pres.nombre_comercial}
                    {pres.laboratorio ? ` · ${pres.laboratorio}` : ""}
                    {pres.presentacion ? ` · ${pres.presentacion}` : ""}
                  </span>
                  {pres.bioequivalente === true && (
                    <span
                      className="inline-flex items-center gap-1 shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "#dcfce7", color: "#166534" }}
                      title="Bioequivalente certificado ISP"
                    >
                      <ShieldCheck className="size-3" />
                      Bioequivalente
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
