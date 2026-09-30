import { CheckCircle2 } from "lucide-react";
import { PlanIntervencionPdfView } from "@/components/shared/PlanIntervencionPdfView";
import type { PlanIntervencionDetalle, NivelGAS } from "@/types/plan-intervencion";

interface PlanIntervencionResumenCardProps {
  detalle: PlanIntervencionDetalle;
  patientId: string;
}

const GAS_LABELS: Record<NivelGAS, string> = {
  [-2]: "-2 Peor",
  [-1]: "-1",
  [0]: "0 Esperado",
  [1]: "+1",
  [2]: "+2 Mejor",
};

function gasColor(nivel: NivelGAS): string {
  if (nivel <= -1) return "var(--color-kp-danger)";
  if (nivel === 0) return "var(--color-ink-2)";
  return "var(--color-kp-success)";
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

export function PlanIntervencionResumenCard({
  detalle,
  patientId,
}: PlanIntervencionResumenCardProps) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: "var(--color-ink-1)" }}>
          {detalle.titulo}
        </span>
        {detalle.firmado && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--color-kp-success)" }}
          >
            <CheckCircle2 className="size-3.5" />
            Firmado {detalle.firmado_at ? formatFecha(detalle.firmado_at) : ""}
          </span>
        )}
      </div>

      {detalle.objetivos.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Sin objetivos definidos todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {detalle.objetivos.map((obj) => (
            <div
              key={obj.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: "var(--color-surface-0)" }}
            >
              <span className="text-sm truncate" style={{ color: "var(--color-ink-1)" }}>
                {obj.descripcion}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                style={{
                  color: gasColor(obj.nivel_actual),
                  border: `1px solid ${gasColor(obj.nivel_actual)}`,
                }}
              >
                {GAS_LABELS[obj.nivel_actual]}
              </span>
            </div>
          ))}
        </div>
      )}

      <PlanIntervencionPdfView planId={detalle.id} patientId={patientId} />
    </div>
  );
}
