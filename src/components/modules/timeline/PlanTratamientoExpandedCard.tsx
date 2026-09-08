// src/components/modules/timeline/PlanTratamientoExpandedCard.tsx
"use client";

import { Section, formatDate } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activo: "Activo",
  completado: "Completado",
  cancelado: "Cancelado",
};

export function PlanTratamientoExpandedCard({ entry }: Props) {
  const d = entry.data;

  return (
    <div className="space-y-3">
      <Section label="Estado">
        {ESTADO_LABELS[d.estado as string] ?? String(d.estado)}
        {d.cerrado ? " · Cerrado" : ""}
      </Section>

      {d.diagnostico && <Section label="Diagnóstico">{String(d.diagnostico)}</Section>}

      {d.cerrado_at && (
        <Section label="Cerrado">{formatDate(d.cerrado_at as string)}</Section>
      )}

      <p className="text-[0.65rem] text-ink-3 italic">
        Plan de tratamiento — documento vivo, sin firma. El detalle de procedimientos vive en
        el workspace dental (tab &quot;Plan de tratamiento&quot;).
      </p>
    </div>
  );
}
