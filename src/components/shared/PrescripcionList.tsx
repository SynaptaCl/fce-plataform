"use client";

import type { Prescripcion } from "@/types/prescripcion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  prescripciones: Prescripcion[];
}

export function PrescripcionList({ prescripciones }: Props) {
  if (prescripciones.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
        Sin prescripciones en este encuentro.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {prescripciones.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--color-ink-1)" }}>
              {p.folio_display}
            </span>
            <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
            {p.tipo === "farmacologica"
              ? `${p.medicamentos?.length ?? 0} medicamento(s)`
              : "Indicación general"}
            {p.prof_nombre_snapshot && ` · ${p.prof_nombre_snapshot}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
