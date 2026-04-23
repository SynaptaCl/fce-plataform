// src/components/modules/timeline/SignosVitalesExpandedCard.tsx
"use client";

import { EntryFooter } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

const CAMPOS: Array<{ key: string; label: string; unit: string }> = [
  { key: "presion_arterial",        label: "PA",       unit: "mmHg" },
  { key: "frecuencia_cardiaca",     label: "FC",       unit: "bpm"  },
  { key: "spo2",                    label: "SpO₂",     unit: "%"    },
  { key: "temperatura",             label: "T°",       unit: "°C"   },
  { key: "frecuencia_respiratoria", label: "FR",       unit: "rpm"  },
];

export function SignosVitalesExpandedCard({ entry }: Props) {
  const d = entry.data;
  const camposConValor = CAMPOS.filter((c) => d[c.key] != null);

  return (
    <div className="space-y-3">
      {camposConValor.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {camposConValor.map((c) => (
            <div
              key={c.key}
              className="bg-surface-0 rounded-lg px-2 py-1.5 text-center"
            >
              <p className="text-[0.55rem] font-bold text-ink-3 uppercase tracking-wide">
                {c.label}
              </p>
              <p className="text-sm font-bold text-ink-1">
                {String(d[c.key])}{" "}
                <span className="text-[0.6rem] font-normal text-ink-3">{c.unit}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-4 italic">Sin datos de signos vitales</p>
      )}
      <EntryFooter
        firmado={false}
        nombre={entry.profesional_nombre}
        fecha={entry.date}
        borradorLabel="Registrado"
      />
    </div>
  );
}
