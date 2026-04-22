// src/components/modules/timeline/EvaluacionExpandedCard.tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import { getModeloDeEspecialidad, getRutaEncuentro } from "@/lib/modules/modelos";
import { KeyValueList, EntryFooter, EncuentroLink } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

export function EvaluacionExpandedCard({ entry, patientId }: Props) {
  const d = entry.data;
  const evData = (d.evData ?? {}) as Record<string, unknown>;

  const url = entry.encuentroId
    ? getRutaEncuentro(
        getModeloDeEspecialidad(entry.especialidad ?? ""),
        patientId,
        entry.encuentroId
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {d.especialidad && (
          <Badge variant="info">{String(d.especialidad)}</Badge>
        )}
        {d.sub_area && (
          <Badge variant="teal">
            {String(d.sub_area).replace(/_/g, " ")}
          </Badge>
        )}
        {d.contraindicaciones_certificadas && (
          <Badge variant="success">Contraindicaciones certificadas ✓</Badge>
        )}
      </div>
      {Object.keys(evData).length > 0 && (
        <KeyValueList data={evData} />
      )}
      <EntryFooter
        firmado={false}
        nombre={entry.profesional_nombre}
        fecha={entry.date}
        borradorLabel="Registrado"
      />
      {url && <EncuentroLink url={url} />}
    </div>
  );
}
