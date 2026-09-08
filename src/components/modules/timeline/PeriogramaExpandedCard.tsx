// src/components/modules/timeline/PeriogramaExpandedCard.tsx
"use client";

import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";
import { Section, EntryFooter, EncuentroLink } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";
import type { AdendaTarget } from "@/types/adenda";

interface Props {
  entry: TimelineEntry;
  patientId: string;
  onAgregarAdenda?: (target: AdendaTarget) => void;
}

export function PeriogramaExpandedCard({ entry, patientId, onAgregarAdenda }: Props) {
  const d = entry.data;
  const diagnostico = d.diagnostico_icd as { code?: string; title?: string } | null;

  const url = entry.encuentroId
    ? getRutaEncuentro(
        getModeloDeEspecialidad(entry.especialidad ?? "Odontología"),
        patientId,
        entry.encuentroId
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Section label="Índice de sangrado">
          {d.indice_sangrado != null ? `${d.indice_sangrado}%` : "—"}
        </Section>
        <Section label="Profundidad media">
          {d.profundidad_media != null ? `${d.profundidad_media}mm` : "—"}
        </Section>
        <Section label="Sitios patológicos">
          {d.sitios_patologicos != null ? String(d.sitios_patologicos) : "—"}
        </Section>
      </div>

      {diagnostico?.title && (
        <Section label="Diagnóstico (ICD-11)">
          {diagnostico.code ? `${diagnostico.code} — ${diagnostico.title}` : diagnostico.title}
        </Section>
      )}

      {d.notas ? <Section label="Notas">{String(d.notas)}</Section> : null}

      {/* Adenda badge — mismo patrón que SOAP/nota clínica */}
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
                tipoDocumento: "periograma",
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
