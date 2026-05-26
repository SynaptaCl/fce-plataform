// src/components/modules/timeline/InstrumentoExpandedCard.tsx
"use client";

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

/**
 * Returns colors for the interpretation badge based on risk level.
 */
function getInterpretacionStyle(
  interpretacion: string | null
): { background: string; color: string } {
  if (!interpretacion) {
    return {
      background: "var(--color-kp-success-lt, #DCFCE7)",
      color: "var(--color-kp-success, #16A34A)",
    };
  }
  const lower = interpretacion.toLowerCase();
  if (
    lower.includes("muy alto") ||
    lower.includes("alto") ||
    lower.includes("severo") ||
    lower.includes("grave")
  ) {
    return {
      background: "var(--color-kp-danger-lt, #FEE2E2)",
      color: "var(--color-kp-danger, #DC2626)",
    };
  }
  if (lower.includes("moderado") || lower.includes("medio")) {
    return {
      background: "var(--color-kp-secondary-lt, #FEF3E2)",
      color: "var(--color-kp-secondary, #F5A623)",
    };
  }
  return {
    background: "var(--color-kp-success-lt, #DCFCE7)",
    color: "var(--color-kp-success, #16A34A)",
  };
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

  const hasPuntaje = d.puntaje !== null && d.puntaje !== undefined;
  const hasInterpretacion = Boolean(d.interpretacion);
  const interpStyle = getInterpretacionStyle(
    hasInterpretacion ? String(d.interpretacion) : null
  );

  return (
    <div className="space-y-3">
      {/* Prominent score + interpretation */}
      {(hasPuntaje || hasInterpretacion) && (
        <div className="flex flex-col gap-1.5">
          {hasPuntaje && (
            <span
              className="font-mono-clinical text-ink-1"
              style={{ fontSize: "22px", fontWeight: 500, lineHeight: 1.2 }}
            >
              {String(d.puntaje)}
              {d.puntaje_maximo !== null && d.puntaje_maximo !== undefined
                ? ` / ${String(d.puntaje_maximo)} puntos`
                : " puntos"}
            </span>
          )}
          {hasInterpretacion && (
            <span
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 500,
                ...interpStyle,
              }}
            >
              {String(d.interpretacion)}
            </span>
          )}
        </div>
      )}

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
