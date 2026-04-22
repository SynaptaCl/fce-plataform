// src/components/modules/timeline/SoapExpandedCard.tsx
"use client";

import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";
import { Section, CifSection, EntryFooter, EncuentroLink, formatDate } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";
import type { CifAssessment } from "@/types/cif";
import type { Intervention } from "@/types/soap";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

export function SoapExpandedCard({ entry, patientId }: Props) {
  const d = entry.data;
  const cif = d.analisis_cif as CifAssessment | null;
  const intervenciones = (d.intervenciones ?? []) as Intervention[];

  const url = entry.encuentroId
    ? getRutaEncuentro(
        getModeloDeEspecialidad(entry.especialidad ?? ""),
        patientId,
        entry.encuentroId
      )
    : null;

  return (
    <div className="space-y-3">
      {d.subjetivo && (
        <Section label="S — Subjetivo">{String(d.subjetivo)}</Section>
      )}
      {d.objetivo && (
        <Section label="O — Objetivo">{String(d.objetivo)}</Section>
      )}
      {cif && <CifSection cif={cif} />}
      {d.plan && (
        <Section label="P — Plan">{String(d.plan)}</Section>
      )}
      {intervenciones.length > 0 && (
        <div>
          <p className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem] mb-1">
            Intervenciones
          </p>
          <ul className="space-y-0.5">
            {intervenciones.map((iv, i) => (
              <li key={i} className="text-xs text-ink-2">
                <span className="font-medium text-ink-1">{iv.tipo}</span>
                {iv.descripcion && ` — ${iv.descripcion}`}
                {iv.dosificacion && (
                  <span className="text-ink-3"> ({iv.dosificacion})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.tareas_domiciliarias && (
        <Section label="Tareas domiciliarias">{String(d.tareas_domiciliarias)}</Section>
      )}
      <div className="flex items-center gap-1.5 text-xs text-ink-2">
        <span className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem]">
          Próxima sesión:
        </span>
        <span>
          {d.proxima_sesion ? formatDate(String(d.proxima_sesion)) : "No agendada"}
        </span>
      </div>
      <EntryFooter
        firmado={Boolean(d.firmado)}
        nombre={entry.profesional_nombre}
        fecha={d.firmado_at ? String(d.firmado_at) : entry.date}
      />
      {url && <EncuentroLink url={url} />}
    </div>
  );
}
