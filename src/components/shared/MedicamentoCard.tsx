"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import type { MedicamentoPrescrito } from "@/types/prescripcion";
import { MedicamentoEditor } from "./MedicamentoEditor";

interface Props {
  medicamento: MedicamentoPrescrito;
  onUpdate: (updated: MedicamentoPrescrito) => void;
  onRemove: () => void;
}

export function MedicamentoCard({ medicamento, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState(!medicamento.dosis);

  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--color-kp-border)" }}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink-1)" }}>
            {medicamento.principio_activo}
            {medicamento.nombre_comercial && ` (${medicamento.nombre_comercial})`}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-ink-3)" }}>
            {medicamento.presentacion}
            {medicamento.dosis && ` · ${medicamento.dosis}`}
            {medicamento.frecuencia && ` · ${medicamento.frecuencia}`}
          </p>
          {!medicamento.id_medicamento_catalogo && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "#fef9c3", color: "#854d0e" }}
            >
              Manual
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-gray-100">
            {expanded
              ? <ChevronUp className="size-4" style={{ color: "var(--color-ink-3)" }} />
              : <ChevronDown className="size-4" style={{ color: "var(--color-ink-3)" }} />}
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-gray-100">
            <X className="size-4" style={{ color: "var(--color-ink-3)" }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3" style={{ borderColor: "var(--color-kp-border)" }}>
          <MedicamentoEditor medicamento={medicamento} onChange={onUpdate} />
        </div>
      )}
    </div>
  );
}
