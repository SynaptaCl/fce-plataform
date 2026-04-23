// src/components/modules/timeline/ConsentimientoExpandedCard.tsx
"use client";

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EntryFooter } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

const TIPO_LABELS: Record<string, string> = {
  general: "General de tratamiento",
  menores: "Menores / vulnerables",
  teleconsulta: "Teleconsulta",
};

export function ConsentimientoExpandedCard({ entry }: Props) {
  const d = entry.data;
  const tipo = String(d.tipo ?? "");
  const firmado = Boolean(d.firmado);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink-1">Tipo:</span>
          <span className="text-ink-2">{(TIPO_LABELS[tipo] ?? tipo) || "—"}</span>
        </div>
        {d.version != null && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-1">Versión:</span>
            <span className="text-ink-2">{String(d.version)}</span>
          </div>
        )}
        <div>
          {firmado ? (
            <Badge variant="success" icon={<Lock className="w-3 h-3" />}>
              Firmado por el paciente
            </Badge>
          ) : (
            <Badge variant="warning">Pendiente de firma</Badge>
          )}
        </div>
      </div>
      <EntryFooter
        firmado={firmado}
        nombre={undefined}
        fecha={entry.date}
        firmadoLabel="Firmado"
        borradorLabel="Pendiente de firma"
      />
    </div>
  );
}
