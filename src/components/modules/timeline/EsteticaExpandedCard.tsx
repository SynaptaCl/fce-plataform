"use client";

import { isRichTextHtml } from "@/lib/utils";
import type { TimelineEntry } from "@/app/actions/timeline";
import type { AdendaTarget } from "@/types/adenda";

interface Props {
  entry: TimelineEntry;
  patientId: string;
  onAgregarAdenda?: (target: AdendaTarget) => void;
}

export function EsteticaExpandedCard({ entry, onAgregarAdenda }: Props) {
  const data = entry.data as {
    tipo_ficha: string;
    motivo: string | null;
    observaciones_generales: string | null;
    firmado: boolean;
    firmado_at: string | null;
    adendas: { count: number; tieneErrata: boolean; anulada: boolean } | null;
  };

  const TIPO_FICHA_LABEL: Record<string, string> = {
    facial: "Facial",
    corporal: "Corporal",
    mixta: "Mixta",
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-3)" }}>
          Tipo de ficha
        </span>
        <p style={{ color: "var(--color-ink-1)" }}>
          {TIPO_FICHA_LABEL[data.tipo_ficha] ?? data.tipo_ficha}
        </p>
      </div>
      {data.motivo && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-3)" }}>
            Motivo
          </span>
          <p style={{ color: "var(--color-ink-1)" }}>{data.motivo}</p>
        </div>
      )}
      {data.observaciones_generales && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-3)" }}>
            Observaciones
          </span>
          {isRichTextHtml(data.observaciones_generales) ? (
            <div
              className="prose prose-sm max-w-none"
              style={{ color: "var(--color-ink-1)" }}
              dangerouslySetInnerHTML={{ __html: data.observaciones_generales }}
            />
          ) : (
            <p className="whitespace-pre-wrap" style={{ color: "var(--color-ink-1)" }}>
              {data.observaciones_generales}
            </p>
          )}
        </div>
      )}
      {data.adendas && data.adendas.count > 0 && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          {data.adendas.count} adenda(s) asociada(s)
          {data.adendas.tieneErrata ? " · incluye errata" : ""}
          {data.adendas.anulada ? " · incluye anulación" : ""}
        </p>
      )}
      {data.firmado && onAgregarAdenda && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              onAgregarAdenda({
                tipoDocumento: "ficha_estetica",
                idDocumento: entry.id,
                firmadoAt: data.firmado_at ? String(data.firmado_at) : entry.date,
                createdBy: String(entry.autor_id ?? ""),
                idEncuentro: entry.encuentroId ?? null,
              })
            }
            className="text-xs font-medium hover:underline transition-colors"
            style={{ color: "var(--color-kp-accent)" }}
          >
            + Agregar adenda
          </button>
        </div>
      )}
    </div>
  );
}
