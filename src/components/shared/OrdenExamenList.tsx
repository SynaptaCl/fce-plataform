"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { OrdenExamen } from "@/types/orden-examen";

interface Props {
  ordenes: OrdenExamen[];
  onVerOrden: (id: string) => void;
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function OrdenExamenList({ ordenes, onVerOrden }: Props) {
  if (ordenes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        style={{ color: "var(--color-ink-3)" }}
      >
        <ClipboardList className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm">Sin órdenes de examen registradas</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {ordenes.map((orden) => (
        <li
          key={orden.id}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              {/* Folio + prioridad */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="font-semibold text-sm"
                  style={{ color: "var(--color-ink-1)" }}
                >
                  {orden.folio_display}
                </span>
                {orden.prioridad === "urgente" && (
                  <Badge variant="warning">Urgente</Badge>
                )}
              </div>

              {/* Date + exam count */}
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                {formatFecha(orden.firmado_at ?? orden.created_at)} ·{" "}
                {orden.examenes.length} examen
                {orden.examenes.length !== 1 ? "es" : ""}
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => onVerOrden(orden.id)}
              className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--color-kp-border)",
                color: "var(--color-ink-2)",
                background: "var(--color-surface-0)",
              }}
            >
              Ver orden
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
