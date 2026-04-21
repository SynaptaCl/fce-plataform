'use client';

import { useState } from "react";
import { eliminarInstrumentoAplicado } from "@/app/actions/clinico/instrumentos";
import type { InstrumentoAplicado } from "@/types/instrumento";

interface InstrumentoResultadoCardProps {
  instrumento: InstrumentoAplicado;
  encuentroFinalizado: boolean;
  onEliminado?: () => void;
}

export function InstrumentoResultadoCard({
  instrumento,
  encuentroFinalizado,
  onEliminado,
}: InstrumentoResultadoCardProps) {
  const [expandido, setExpandido] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEliminar() {
    if (!window.confirm("¿Eliminar este instrumento aplicado?")) return;
    setEliminando(true);
    const result = await eliminarInstrumentoAplicado(instrumento.id);
    setEliminando(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onEliminado?.();
  }

  return (
    <div
      className="rounded-md border p-3 space-y-2"
      style={{ borderColor: "var(--kp-border)", background: "var(--surface-1)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--ink-1)" }}>
            {instrumento.instrumento?.nombre ?? "Instrumento"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {instrumento.puntaje_total !== null && (
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                Puntaje: {instrumento.puntaje_total}
              </span>
            )}
            {instrumento.interpretacion && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                {instrumento.interpretacion}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              {new Date(instrumento.aplicado_at).toLocaleDateString("es-CL")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpandido((v) => !v)}
            className="text-xs underline"
            style={{ color: "var(--ink-3)" }}
          >
            {expandido ? "Ocultar" : "Ver detalle"}
          </button>
          {!encuentroFinalizado && (
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="text-xs text-red-500 underline disabled:opacity-50 ml-1"
            >
              {eliminando ? "..." : "Eliminar"}
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <div className="text-xs space-y-1 pt-1 border-t" style={{ borderColor: "var(--kp-border)", color: "var(--ink-2)" }}>
          {Object.entries(instrumento.respuestas).map(([key, val]) => (
            <div key={key} className="flex gap-1">
              <span className="font-medium">{key}:</span>
              <span>{val}</span>
            </div>
          ))}
          {instrumento.notas && (
            <p className="mt-1 italic">{instrumento.notas}</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
