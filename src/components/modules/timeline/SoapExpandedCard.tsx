// src/components/modules/timeline/SoapExpandedCard.tsx
"use client";

import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";
import { CifSection, EntryFooter, EncuentroLink, RichTextSection, formatDate } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";
import type { CifAssessment } from "@/types/cif";
import type { Intervention } from "@/types/soap";
import type { AdendaTarget } from "@/types/adenda";

interface Props {
  entry: TimelineEntry;
  patientId: string;
  onAgregarAdenda?: (target: AdendaTarget) => void;
}

export function SoapExpandedCard({ entry, patientId, onAgregarAdenda }: Props) {
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
        <RichTextSection label="S — Subjetivo" value={String(d.subjetivo)} />
      )}
      {d.objetivo && (
        <RichTextSection label="O — Objetivo" value={String(d.objetivo)} />
      )}
      {cif && <CifSection cif={cif} />}
      {d.plan && (
        <RichTextSection label="P — Plan" value={String(d.plan)} />
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
        <RichTextSection label="Tareas domiciliarias" value={String(d.tareas_domiciliarias)} />
      )}
      <div className="flex items-center gap-1.5 text-xs text-ink-2">
        <span className="font-bold text-ink-3 uppercase tracking-wide text-[0.6rem]">
          Próxima sesión:
        </span>
        <span>
          {d.proxima_sesion ? formatDate(String(d.proxima_sesion)) : "No agendada"}
        </span>
      </div>
      {/* Adenda badge — shown if the note has adendas */}
      {entry.data.adendas && (entry.data.adendas as { count: number; tieneErrata: boolean; anulada: boolean }).count > 0 && (
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold"
          style={{
            background: (entry.data.adendas as { anulada: boolean }).anulada
              ? "var(--color-kp-danger-lt)"
              : (entry.data.adendas as { tieneErrata: boolean }).tieneErrata
                ? "var(--color-kp-warning-lt)"
                : "var(--color-surface-0)",
            color: (entry.data.adendas as { anulada: boolean }).anulada
              ? "var(--color-kp-danger)"
              : (entry.data.adendas as { tieneErrata: boolean }).tieneErrata
                ? "var(--color-kp-warning)"
                : "var(--color-ink-3)",
            border: "1px solid currentColor",
          }}
        >
          {(entry.data.adendas as { anulada: boolean }).anulada
            ? "Anulada"
            : (entry.data.adendas as { tieneErrata: boolean }).tieneErrata
              ? "Corregida"
              : `${(entry.data.adendas as { count: number }).count} adenda${(entry.data.adendas as { count: number }).count > 1 ? "s" : ""}`}
        </div>
      )}
      <EntryFooter
        firmado={Boolean(d.firmado)}
        nombre={entry.profesional_nombre}
        fecha={d.firmado_at ? String(d.firmado_at) : entry.date}
      />
      {url && <EncuentroLink url={url} />}
      {Boolean(d.firmado) && onAgregarAdenda && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              onAgregarAdenda({
                tipoDocumento: "soap",
                idDocumento: entry.id,
                firmadoAt: d.firmado_at ? String(d.firmado_at) : entry.date,
                createdBy: String(entry.autor_id ?? ""),
                idEncuentro: entry.encuentroId ?? null,
              })
            }
            className="text-xs font-medium hover:underline transition-colors"
            style={{ color: "var(--color-kp-accent)" }}
          >
            Agregar adenda / corrección
          </button>
        </div>
      )}
    </div>
  );
}
