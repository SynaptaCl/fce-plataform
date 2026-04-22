// src/components/modules/timeline/InstrumentoExpandedCard.tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import { Section, FieldLabel, EntryFooter, EncuentroLink } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

interface SchemaItem {
  id: string;
  label: string;
}

function getInterpretacionVariant(
  interpretacion: string | null
): "success" | "warning" | "info" {
  if (!interpretacion) return "info";
  const lower = interpretacion.toLowerCase();
  if (lower.includes("alto") || lower.includes("severo") || lower.includes("grave")) return "warning";
  if (lower.includes("bajo") || lower.includes("normal") || lower.includes("leve")) return "success";
  return "info";
}

export function InstrumentoExpandedCard({ entry, patientId }: Props) {
  const d = entry.data;
  const respuestas = (d.respuestas ?? {}) as Record<string, unknown>;
  const rawSchema = (d.schema_items ?? []) as unknown[];
  const schemaItems = rawSchema.filter(
    (s): s is SchemaItem =>
      typeof s === "object" && s !== null && "id" in s && "label" in s
  );
  const schemaMap = new Map(schemaItems.map((s) => [s.id, s.label]));

  const url = entry.encuentroId
    ? `/dashboard/pacientes/${patientId}/encuentro/${entry.encuentroId}/clinico`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {d.puntaje !== null && d.puntaje !== undefined && (
          <span className="text-sm font-bold text-ink-1">
            Puntaje: {String(d.puntaje)}
          </span>
        )}
        {d.interpretacion && (
          <Badge variant={getInterpretacionVariant(String(d.interpretacion))}>
            {String(d.interpretacion)}
          </Badge>
        )}
      </div>
      {Object.keys(respuestas).length > 0 && (
        <div>
          <FieldLabel>Respuestas</FieldLabel>
          <div className="mt-1 space-y-0.5">
            {Object.entries(respuestas).map(([key, val]) => (
              <div key={key} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-ink-2 flex-1">
                  {schemaMap.get(key) ?? key.replace(/_/g, " ")}
                </span>
                <span className="font-medium text-ink-1 shrink-0">
                  {val != null ? String(val) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.notas && (
        <Section label="Notas del profesional">{String(d.notas)}</Section>
      )}
      <EntryFooter
        firmado={false}
        nombre={entry.profesional_nombre}
        fecha={entry.date}
        borradorLabel="Aplicado"
      />
      {url && <EncuentroLink url={url} />}
    </div>
  );
}
