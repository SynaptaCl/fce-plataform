"use client";

import { Section, EntryFooter } from "./_shared";
import type { TimelineEntry } from "@/app/actions/timeline";

// ── Types ──────────────────────────────────────────────────────────────────────

type TipoAdenda = "adenda" | "errata" | "anulacion";

interface AdendaData {
  tipo_adenda: TipoAdenda;
  motivo: string;
  contenido: string;
  override_director: boolean;
  override_motivo: string | null;
  autor_nombre: string;
  tipo_documento_original: string;
  titulo_documento_original: string;
}

interface Props {
  entry: TimelineEntry;
  patientId: string;
}

// ── Badge config ───────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<
  TipoAdenda,
  { label: string; bg: string; color: string }
> = {
  adenda: {
    label: "Adenda",
    bg: "var(--color-surface-0)",
    color: "var(--color-ink-2)",
  },
  errata: {
    label: "Errata",
    bg: "var(--color-kp-warning-lt)",
    color: "var(--color-kp-warning)",
  },
  anulacion: {
    label: "Anulación",
    bg: "var(--color-kp-danger-lt)",
    color: "var(--color-kp-danger)",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AdendaExpandedCard({ entry }: Props) {
  const data = entry.data as AdendaData;
  const tipo = data.tipo_adenda ?? "adenda";
  const badgeCfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.adenda;

  return (
    <div className="space-y-3 text-xs">
      {/* Tipo badge + reference line */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold leading-none"
            style={{
              background: badgeCfg.bg,
              color: badgeCfg.color,
              border: `1px solid ${badgeCfg.color}`,
            }}
          >
            {badgeCfg.label}
          </span>
        </div>

        {data.titulo_documento_original && (
          <p
            className="text-[0.65rem] leading-snug"
            style={{ color: "var(--color-ink-3)" }}
          >
            Sobre:{" "}
            <span style={{ color: "var(--color-ink-2)" }}>
              {data.titulo_documento_original}
            </span>
          </p>
        )}
      </div>

      {/* Motivo */}
      {data.motivo && (
        <Section label="Motivo">{data.motivo}</Section>
      )}

      {/* Contenido */}
      {data.contenido && (
        <Section label="Contenido">{data.contenido}</Section>
      )}

      {/* Override director */}
      {data.override_director && (
        <div
          className="rounded-r px-3 py-2 text-[0.65rem] leading-snug space-y-0.5"
          style={{
            borderLeft: "3px solid var(--color-kp-warning)",
            background: "var(--color-kp-warning-lt)",
            color: "var(--color-ink-2)",
          }}
        >
          <p
            className="font-semibold text-[0.6rem] uppercase tracking-wide"
            style={{ color: "var(--color-kp-warning)" }}
          >
            Autorizado por dirección
          </p>
          {data.override_motivo && (
            <p className="leading-snug">{data.override_motivo}</p>
          )}
        </div>
      )}

      {/* Footer */}
      <EntryFooter
        firmado={true}
        nombre={String(data.autor_nombre ?? entry.profesional_nombre ?? "")}
        fecha={entry.date}
        firmadoLabel="Registrado"
      />
    </div>
  );
}
