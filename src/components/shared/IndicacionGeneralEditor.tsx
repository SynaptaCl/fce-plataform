"use client";

import { PLANTILLAS_GENERALES } from "@/lib/prescripciones/plantillas";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function IndicacionGeneralEditor({ value, onChange }: Props) {
  function addPlantilla(contenido: string) {
    const separator = value.trim() ? "\n\n" : "";
    onChange(value + separator + contenido);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS_GENERALES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => addPlantilla(p.contenido)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={{ borderColor: "var(--color-kp-accent)", color: "var(--color-kp-accent)" }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="Escriba las indicaciones para el paciente..."
        className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
        style={{ borderColor: "var(--kp-border)", color: "var(--ink-1)" }}
      />
    </div>
  );
}
