import Link from "next/link";
import type { TimelineEntry } from "@/app/actions/timeline";

// ── Props ────────────────────────────────────────────────────────────────────

interface EgresoCardProps {
  entry: TimelineEntry;
  patientId: string;
}

// ── Labels ───────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  alta_clinica: "Alta clínica",
  abandono: "Abandono de tratamiento",
  derivacion: "Derivación",
  fallecimiento: "Fallecimiento",
  otro: "Otro",
};

// ── Badge style per tipo ──────────────────────────────────────────────────────

function getTipoBadgeStyle(tipo: string): React.CSSProperties {
  switch (tipo) {
    case "alta_clinica":
      return { background: "var(--kp-success)", color: "#fff" };
    case "abandono":
      return { background: "var(--kp-secondary)", color: "#fff" };
    case "derivacion":
      return { background: "var(--kp-info)", color: "#fff" };
    case "fallecimiento":
      return { background: "var(--kp-border)", color: "var(--ink-2)" };
    case "otro":
    default:
      return { background: "var(--kp-border)", color: "var(--ink-3)" };
  }
}

// ── Componente ───────────────────────────────────────────────────────────────

export function EgresoCard({ entry, patientId }: EgresoCardProps) {
  const tipoEgreso = String(entry.data?.tipo_egreso ?? "");
  const diagnostico = String(entry.data?.diagnostico_egreso ?? entry.resumen ?? "");
  const label = TIPO_LABELS[tipoEgreso] ?? tipoEgreso;
  const badgeStyle = getTipoBadgeStyle(tipoEgreso);

  const dateLabel = new Date(entry.date).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-kp-border bg-surface-1 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full"
          style={badgeStyle}
        >
          {label}
        </span>
        <span className="text-xs text-ink-3">{dateLabel}</span>
      </div>

      {/* Diagnóstico */}
      {diagnostico && (
        <p className="text-sm text-ink-1 line-clamp-3">{diagnostico}</p>
      )}

      {/* Profesional */}
      {entry.profesional_nombre && (
        <p className="text-xs text-ink-3">Por: {entry.profesional_nombre}</p>
      )}

      {/* Link */}
      <Link
        href={`/dashboard/pacientes/${patientId}/egreso/${entry.id}`}
        className="inline-flex items-center text-xs font-medium text-kp-primary hover:underline"
      >
        Ver detalle →
      </Link>
    </div>
  );
}
