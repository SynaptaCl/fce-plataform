// src/components/modules/timeline/PrescripcionExpandedCard.tsx
"use client";

import { Pill } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Section, EntryFooter } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
  onVerReceta?: (prescripcionId: string) => void;
}

export function PrescripcionExpandedCard({ entry, onVerReceta }: Props) {
  const prescripcionData = entry.prescripcionData;

  if (!prescripcionData) {
    return <div className="text-xs text-ink-4 italic">Sin datos de prescripción</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-bold text-ink-1 text-sm">{prescripcionData.folio}</p>
        <Badge variant={prescripcionData.tipo === "farmacologica" ? "info" : "success"}>
          {prescripcionData.tipo === "farmacologica" ? "Receta farmacológica" : "Indicación general"}
        </Badge>
      </div>

      {prescripcionData.tipo === "farmacologica" && prescripcionData.medicamentosCount > 0 && (
        <div>
          <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1">
            Medicamentos
          </p>
          <div className="space-y-1 text-xs text-ink-2">
            {prescripcionData.primerMedicamento && (
              <p>{prescripcionData.primerMedicamento}</p>
            )}
            {prescripcionData.medicamentosCount > 1 && (
              <p className="text-ink-3 italic">
                y {prescripcionData.medicamentosCount - 1} medicamento(s) más
              </p>
            )}
          </div>
        </div>
      )}

      {prescripcionData.diagnostico && (
        <Section label="Diagnóstico">
          {String(prescripcionData.diagnostico)}
        </Section>
      )}

      {onVerReceta && (
        <button
          onClick={() => onVerReceta(entry.id)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-kp-accent hover:underline transition-colors"
        >
          <Pill className="w-3 h-3" />
          Ver receta completa / Descargar PDF
        </button>
      )}

      <EntryFooter
        firmado={true}
        nombre={entry.profesional_nombre}
        fecha={entry.date}
        firmadoLabel="Prescripción firmada"
      />
    </div>
  );
}
