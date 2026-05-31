// src/components/modules/timeline/PlanIntervencionExpandedCard.tsx
"use client";

import { Section, EntryFooter, formatDate } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activo: "Activo",
  en_revision: "En revisión",
  cerrado: "Cerrado",
};

export function PlanIntervencionExpandedCard({ entry }: Props) {
  const d = entry.data;

  return (
    <div className="space-y-3">
      <Section label="Estado">
        {ESTADO_LABELS[d.estado as string] ?? String(d.estado)}
        {d.condicion_codigo && ` · ${d.condicion_codigo}`}
      </Section>

      <Section label="Objetivos activos">
        {String(d.objetivos_activos ?? 0)} objetivo(s) en curso
      </Section>

      {d.fecha_inicio && (
        <Section label="Inicio">
          {formatDate(d.fecha_inicio as string)}
        </Section>
      )}

      {d.fecha_revision && (
        <Section label="Próxima revisión">
          {formatDate(d.fecha_revision as string)}
        </Section>
      )}

      <EntryFooter
        firmado={Boolean(d.firmado)}
        nombre={entry.profesional_nombre}
        fecha={d.firmado_at ? (d.firmado_at as string) : entry.date}
      />
    </div>
  );
}
