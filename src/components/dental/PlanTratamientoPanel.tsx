"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  XCircle,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PlanTratamientoItemForm } from "./PlanTratamientoItemForm";
import {
  createPlan,
  addItemPlan,
  updateItemEstado,
  removeItemPlan,
  cerrarPlan,
} from "@/app/actions/dental/plan-tratamiento";
import {
  calcularProgreso,
  calcularPresupuestoTotal,
  calcularMontoRealizado,
} from "@/lib/dental/plan";
import { getLabelPieza } from "@/lib/dental/fdi";
import type {
  PlanTratamiento,
  PlanTratamientoItem,
  EstadoItem,
  PrioridadItem,
  ProcedimientoCatalogo,
} from "@/types/plan-tratamiento";

// ── Helpers de presentación ───────────────────────────────────────────────────

const ESTADO_BADGE: Record<
  EstadoItem,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente",
    color: "#64748B",
    bg: "#F1F5F9",
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  en_progreso: {
    label: "En progreso",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  completado: {
    label: "Realizado",
    color: "#16A34A",
    bg: "#DCFCE7",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelado: {
    label: "Cancelado",
    color: "#64748B",
    bg: "#F1F5F9",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  rechazado_paciente: {
    label: "Rechazado",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const PRIORIDAD_COLOR: Record<PrioridadItem, string> = {
  urgente: "#DC2626",
  alta: "#D97706",
  normal: "#64748B",
  baja: "#94A3B8",
  electivo: "#CBD5E1",
};

function formatCLP(value: number) {
  return value.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

// ── EstadoBadge ───────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoItem }) {
  const { label, color, bg, icon } = ESTADO_BADGE[estado];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color, background: bg }}
    >
      {icon}
      {label}
    </span>
  );
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  planId,
  patientId,
  encuentroId,
  readOnly,
  onEstadoChange,
  onRemove,
}: {
  item: PlanTratamientoItem;
  planId: string;
  patientId: string;
  encuentroId: string;
  readOnly: boolean;
  onEstadoChange: (itemId: string, estado: EstadoItem) => void;
  onRemove: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPendiente =
    item.estado === "pendiente" || item.estado === "en_progreso";

  return (
    <li
      className="rounded-lg border"
      style={{ borderColor: "var(--kp-border)", background: "var(--surface-1)" }}
    >
      {/* Fila principal */}
      <div className="flex items-start gap-3 p-3">
        {/* Indicador prioridad */}
        <div
          className="mt-0.5 w-1 self-stretch rounded-full shrink-0"
          style={{ background: PRIORIDAD_COLOR[item.prioridad] }}
        />

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--ink-1)" }}
            >
              {item.procedimiento}
            </span>
            {item.pieza && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--ink-2)",
                  background: "var(--surface-0)",
                }}
              >
                Pieza {item.pieza}
                {item.superficie ? ` · ${item.superficie}` : ""}
              </span>
            )}
            <EstadoBadge estado={item.estado} />
          </div>

          {/* Valor */}
          {item.valor_unitario > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              {formatCLP(item.valor_unitario)}
            </p>
          )}

          {/* Notas expandidas */}
          {item.notas && expanded && (
            <p
              className="text-xs mt-1.5 leading-relaxed"
              style={{ color: "var(--ink-2)" }}
            >
              {item.notas}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          {item.notas && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded transition-colors hover:bg-surface-0"
              title={expanded ? "Ocultar notas" : "Ver notas"}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--ink-3)" }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--ink-3)" }} />
              )}
            </button>
          )}

          {!readOnly && isPendiente && (
            <button
              type="button"
              onClick={() => onEstadoChange(item.id, "completado")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: "#16A34A",
                background: "#DCFCE7",
              }}
              title="Marcar como realizado"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Realizado
            </button>
          )}

          {!readOnly && item.estado === "completado" && (
            <button
              type="button"
              onClick={() => onEstadoChange(item.id, "pendiente")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: "#64748B",
                background: "#F1F5F9",
              }}
              title="Deshacer realizado"
            >
              <Circle className="w-3.5 h-3.5" />
              Deshacer
            </button>
          )}

          {!readOnly && item.estado !== "completado" && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 rounded transition-colors hover:bg-red-50"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ── PlanTratamientoPanel ──────────────────────────────────────────────────────

interface Props {
  planInicial: PlanTratamiento | null;
  patientId: string;
  encuentroId: string;
  catalogo: ProcedimientoCatalogo[];
  readOnly: boolean;
}

export function PlanTratamientoPanel({
  planInicial,
  patientId,
  encuentroId,
  catalogo,
  readOnly,
}: Props) {
  const [plan, setPlan] = useState<PlanTratamiento | null>(planInicial);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = plan?.items ?? [];
  const progreso = calcularProgreso(items);
  const presupuesto = calcularPresupuestoTotal(items);
  const realizado = calcularMontoRealizado(items);

  // Sin plan: invitar a crear uno
  if (!plan) {
    if (readOnly) {
      return (
        <Empty mensaje="Sin plan de tratamiento registrado en este encuentro." />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "var(--surface-0)" }}
        >
          <ClipboardList className="w-6 h-6" style={{ color: "var(--ink-3)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
            Sin plan de tratamiento
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Crea un plan para registrar los procedimientos y hacer seguimiento del tratamiento.
          </p>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await createPlan(patientId, {});
              if (!res.success) {
                setError(res.error);
              } else {
                setPlan(res.data);
              }
            });
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--kp-primary)" }}
        >
          <Plus className="w-4 h-4" />
          {isPending ? "Creando…" : "Crear plan de tratamiento"}
        </button>
      </div>
    );
  }

  async function handleAddItem(data: {
    procedimiento: string;
    descripcion?: string;
    pieza?: number | null;
    superficie?: string | null;
    prioridad: PrioridadItem;
    valor_unitario: number;
    notas?: string;
  }) {
    setError(null);
    const res = await addItemPlan(plan!.id, patientId, data);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setPlan((p) =>
      p
        ? {
            ...p,
            items: [...(p.items ?? []), res.data],
            presupuesto_total: p.presupuesto_total + res.data.valor_unitario,
          }
        : p,
    );
    setShowForm(false);
  }

  function handleEstadoChange(itemId: string, nuevoEstado: EstadoItem) {
    setError(null);
    startTransition(async () => {
      const res = await updateItemEstado(itemId, plan!.id, patientId, encuentroId, nuevoEstado);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPlan((p) =>
        p
          ? {
              ...p,
              items: (p.items ?? []).map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      estado: nuevoEstado,
                      id_encuentro_realizado:
                        nuevoEstado === "completado" ? encuentroId : null,
                      realizado_at:
                        nuevoEstado === "completado"
                          ? new Date().toISOString()
                          : null,
                    }
                  : i,
              ),
            }
          : p,
      );
    });
  }

  function handleRemove(itemId: string) {
    setError(null);
    const item = items.find((i) => i.id === itemId);
    startTransition(async () => {
      const res = await removeItemPlan(itemId, plan!.id, patientId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPlan((p) =>
        p
          ? {
              ...p,
              items: (p.items ?? []).filter((i) => i.id !== itemId),
              presupuesto_total:
                p.presupuesto_total - (item?.valor_unitario ?? 0),
            }
          : p,
      );
    });
  }

  const pendientes = items.filter(
    (i) => i.estado === "pendiente" || i.estado === "en_progreso",
  );
  const completados = items.filter((i) => i.estado === "completado");
  const otros = items.filter(
    (i) => i.estado !== "pendiente" && i.estado !== "en_progreso" && i.estado !== "completado",
  );

  return (
    <div className="space-y-4">
      {/* Header del plan */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--kp-border)", background: "var(--surface-0)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
              {plan.titulo}
            </h3>
            {plan.diagnostico && (
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-2)" }}>
                {plan.diagnostico}
              </p>
            )}
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              color: plan.cerrado ? "#64748B" : "#16A34A",
              background: plan.cerrado ? "#F1F5F9" : "#DCFCE7",
            }}
          >
            {plan.cerrado ? "Cerrado" : "Activo"}
          </span>
        </div>

        {/* Barra de progreso */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              <span>Progreso: {progreso}%</span>
              <span>
                {completados.length}/{items.length} procedimientos
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--kp-border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progreso}%`,
                  background: "var(--kp-primary)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Botón agregar */}
      {!readOnly && !plan.cerrado && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-0"
          style={{
            borderColor: "var(--kp-border)",
            color: "var(--ink-3)",
          }}
        >
          <Plus className="w-4 h-4" />
          Agregar procedimiento
        </button>
      )}

      {/* Formulario nuevo item */}
      {showForm && (
        <PlanTratamientoItemForm
          catalogo={catalogo}
          onSubmit={handleAddItem}
          onCancel={() => setShowForm(false)}
          loading={isPending}
        />
      )}

      {/* Lista vacía */}
      {items.length === 0 && !showForm && (
        <Empty mensaje="Sin procedimientos registrados. Agrega el primer procedimiento al plan." />
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <section>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "var(--ink-3)" }}
          >
            Pendientes ({pendientes.length})
          </h4>
          <ul className="space-y-2">
            {pendientes.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                planId={plan.id}
                patientId={patientId}
                encuentroId={encuentroId}
                readOnly={readOnly || plan.cerrado}
                onEstadoChange={handleEstadoChange}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Realizados */}
      {completados.length > 0 && (
        <section>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "var(--ink-3)" }}
          >
            Realizados ({completados.length})
          </h4>
          <ul className="space-y-2">
            {completados.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                planId={plan.id}
                patientId={patientId}
                encuentroId={encuentroId}
                readOnly={readOnly || plan.cerrado}
                onEstadoChange={handleEstadoChange}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Otros (cancelados, rechazados) */}
      {otros.length > 0 && (
        <section>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "var(--ink-3)" }}
          >
            Otros ({otros.length})
          </h4>
          <ul className="space-y-2">
            {otros.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                planId={plan.id}
                patientId={patientId}
                encuentroId={encuentroId}
                readOnly={readOnly || plan.cerrado}
                onEstadoChange={handleEstadoChange}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Footer presupuesto */}
      {items.length > 0 && (
        <div
          className="rounded-xl border px-4 py-3 flex flex-wrap gap-4 justify-between items-center"
          style={{ borderColor: "var(--kp-border)", background: "var(--surface-0)" }}
        >
          <div className="space-y-0.5">
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Presupuesto total
            </p>
            <p className="text-base font-semibold" style={{ color: "var(--ink-1)" }}>
              {formatCLP(presupuesto)}
            </p>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Monto realizado
            </p>
            <p
              className="text-base font-semibold"
              style={{ color: realizado > 0 ? "#16A34A" : "var(--ink-2)" }}
            >
              {formatCLP(realizado)}
            </p>
          </div>
          {presupuesto > 0 && (
            <div className="space-y-0.5 text-right">
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Pendiente
              </p>
              <p className="text-base font-semibold" style={{ color: "var(--ink-2)" }}>
                {formatCLP(presupuesto - realizado)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ mensaje }: { mensaje: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center gap-2"
    >
      <ClipboardList className="w-8 h-8 opacity-30" style={{ color: "var(--ink-3)" }} />
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        {mensaje}
      </p>
    </div>
  );
}
