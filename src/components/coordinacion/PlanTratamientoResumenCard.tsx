import type { PlanTratamiento, EstadoItem } from "@/types/plan-tratamiento";

interface PlanTratamientoResumenCardProps {
  plan: PlanTratamiento;
}

const ESTADO_ITEM_LABELS: Record<EstadoItem, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  cancelado: "Cancelado",
  rechazado_paciente: "Rechazado por paciente",
};

const ESTADO_ITEM_COLORS: Record<EstadoItem, string> = {
  pendiente: "var(--color-ink-3)",
  en_progreso: "var(--color-kp-warning)",
  completado: "var(--color-kp-success)",
  cancelado: "var(--color-ink-3)",
  rechazado_paciente: "var(--color-kp-danger)",
};

export function PlanTratamientoResumenCard({ plan }: PlanTratamientoResumenCardProps) {
  const items = plan.items ?? [];
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <span className="text-sm font-medium" style={{ color: "var(--color-ink-1)" }}>
        {plan.titulo}
      </span>
      {plan.diagnostico && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          {plan.diagnostico}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Sin procedimientos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: "var(--color-surface-0)" }}
            >
              <span className="text-sm truncate" style={{ color: "var(--color-ink-1)" }}>
                {item.procedimiento}
                {item.pieza ? ` (pieza ${item.pieza})` : ""}
              </span>
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: ESTADO_ITEM_COLORS[item.estado] }}
              >
                {ESTADO_ITEM_LABELS[item.estado]}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
        Exportación PDF de plan de tratamiento dental no disponible aún — para el informe
        formal, derivar al profesional tratante.
      </p>
    </div>
  );
}
