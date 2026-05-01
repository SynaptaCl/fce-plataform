// src/components/modules/timeline/OrdenExamenExpandedCard.tsx
"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Section, EntryFooter } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";
import type { ExamenIndicado } from "@/types/orden-examen";

interface OrdenData {
  folio: string;
  examenes: ExamenIndicado[];
  diagnostico_presuntivo: string | null;
  prioridad: "normal" | "urgente";
  estado_resultados: "pendiente" | "parcial" | "completo";
}

interface Props {
  entry: TimelineEntry;
  patientId: string;
  onVerOrden?: (ordenId: string) => void;
}

export function OrdenExamenExpandedCard({ entry, onVerOrden }: Props) {
  const data = entry.data as OrdenData;

  if (!data) {
    return (
      <div className="text-xs italic" style={{ color: "var(--color-ink-3)" }}>
        Sin datos de orden
      </div>
    );
  }

  const examenes: ExamenIndicado[] = Array.isArray(data.examenes)
    ? data.examenes
    : [];

  function estadoBadgeVariant(
    estado: OrdenData["estado_resultados"]
  ): "default" | "warning" | "success" {
    if (estado === "parcial") return "warning";
    if (estado === "completo") return "success";
    return "default";
  }

  function estadoLabel(estado: OrdenData["estado_resultados"]): string {
    const map: Record<OrdenData["estado_resultados"], string> = {
      pendiente: "Resultados pendientes",
      parcial: "Resultados parciales",
      completo: "Resultados completos",
    };
    return map[estado];
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-sm" style={{ color: "var(--color-ink-1)" }}>
          {data.folio}
        </p>
        {data.prioridad === "urgente" && (
          <Badge variant="warning">Urgente</Badge>
        )}
        <Badge variant={estadoBadgeVariant(data.estado_resultados)}>
          {estadoLabel(data.estado_resultados)}
        </Badge>
      </div>

      {/* Exam count */}
      <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
        {examenes.length} examen{examenes.length !== 1 ? "es" : ""} solicitado
        {examenes.length !== 1 ? "s" : ""}
      </p>

      {/* Diagnóstico */}
      {data.diagnostico_presuntivo && (
        <Section label="Diagnóstico presuntivo">
          {data.diagnostico_presuntivo}
        </Section>
      )}

      {/* First 3 exam names */}
      {examenes.length > 0 && (
        <div>
          <p
            className="font-bold uppercase tracking-wide text-[0.6rem] mb-1"
            style={{ color: "var(--color-ink-3)" }}
          >
            Exámenes
          </p>
          <ul className="space-y-0.5">
            {examenes.slice(0, 3).map((e, i) => (
              <li
                key={i}
                className="text-xs"
                style={{ color: "var(--color-ink-2)" }}
              >
                • {e.nombre}
              </li>
            ))}
            {examenes.length > 3 && (
              <li className="text-xs italic" style={{ color: "var(--color-ink-3)" }}>
                y {examenes.length - 3} más…
              </li>
            )}
          </ul>
        </div>
      )}

      {/* CTA button */}
      {onVerOrden && (
        <button
          type="button"
          onClick={() => onVerOrden(entry.id)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:underline"
          style={{ color: "var(--color-kp-accent)" }}
        >
          <ClipboardList className="w-3 h-3" />
          Ver orden completa / Descargar PDF
        </button>
      )}

      <EntryFooter
        firmado={true}
        nombre={entry.profesional_nombre}
        fecha={entry.date}
        firmadoLabel="Orden firmada"
      />
    </div>
  );
}
