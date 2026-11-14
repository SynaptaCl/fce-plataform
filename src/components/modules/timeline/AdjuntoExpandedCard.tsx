// src/components/modules/timeline/AdjuntoExpandedCard.tsx
"use client";

/**
 * ADJ-1 — Card de timeline para adjuntos clínicos validados.
 * El botón "Ver archivo" pide una URL firmada FRESCA (getAdjuntoUrl) en cada
 * click — nunca cachea (TTL 10 min, criterio de verificación del plan).
 */

import { useState } from "react";
import { FileText, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { Section, EntryFooter } from "./_shared";
import { getAdjuntoUrl } from "@/app/actions/adjuntos";
import { CATEGORIA_ADJUNTO_LABELS, type CategoriaAdjunto } from "@/types/adjunto";
import type { TimelineEntry } from "@/app/actions/timeline";

interface AdjuntoData {
  categoria: CategoriaAdjunto;
  descripcion: string | null;
  nombre_archivo_original: string;
  mime_type: string;
  tamano_bytes: number;
  fecha_documento: string;
  id_orden_examen: string | null;
  validado_por: string | null;
  validado_at: string | null;
}

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

export function AdjuntoExpandedCard({ entry }: Props) {
  const data = entry.data as AdjuntoData;
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="text-sm italic" style={{ color: "var(--color-ink-3)" }}>
        Sin datos del adjunto
      </div>
    );
  }

  const esPdf = data.mime_type === "application/pdf";
  const kb = Math.max(1, Math.round(data.tamano_bytes / 1024));

  async function ver() {
    setAbriendo(true);
    setError(null);
    const res = await getAdjuntoUrl(entry.id);
    setAbriendo(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-sm" style={{ color: "var(--color-ink-1)" }}>
          {esPdf ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
          {CATEGORIA_ADJUNTO_LABELS[data.categoria] ?? data.categoria}
        </span>
        {data.id_orden_examen && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-surface-0)", color: "var(--color-ink-2)" }}
          >
            Resultado de orden de examen
          </span>
        )}
      </div>

      <Section label="Archivo">
        {data.descripcion || data.nombre_archivo_original} · {esPdf ? "PDF" : "Imagen"} · {kb} KB
      </Section>

      <Section label="Fecha del documento">{data.fecha_documento}</Section>

      <div>
        <button
          type="button"
          onClick={ver}
          disabled={abriendo}
          className="inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ color: "var(--color-kp-accent)" }}
        >
          {abriendo ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
          Ver archivo
        </button>
        {error && (
          <span className="ml-2 text-xs" style={{ color: "var(--color-kp-danger)" }} role="alert">
            {error}
          </span>
        )}
      </div>

      {data.validado_at && (
        <EntryFooter firmado fecha={data.validado_at} firmadoLabel="Validado" />
      )}
    </div>
  );
}
