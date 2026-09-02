"use client";

import { useEffect, useState, useTransition } from "react";
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
  FileText,
} from "lucide-react";
import { PlanTratamientoItemForm } from "./PlanTratamientoItemForm";
import {
  createPlan,
  addItemPlan,
  updateItemEstado,
  removeItemPlan,
  getPresupuestoDePlan,
  generarPresupuestoDesdePlan,
} from "@/app/actions/dental/plan-tratamiento";
import {
  calcularProgreso,
  calcularPresupuestoTotal,
  calcularMontoRealizado,
} from "@/lib/dental/plan";
import type { PresupuestoDePlan } from "@/lib/dental/plan";
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
  readOnly,
  seleccionable,
  seleccionado,
  onToggleSeleccion,
  onEstadoChange,
  onRemove,
}: {
  item: PlanTratamientoItem;
  planId: string;
  patientId: string;
  encuentroId: string;
  readOnly: boolean;
  seleccionable?: boolean;
  seleccionado?: boolean;
  onToggleSeleccion?: (itemId: string) => void;
  onEstadoChange: (itemId: string, estado: EstadoItem) => void;
  onRemove: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPendiente =
    item.estado === "pendiente" || item.estado === "en_progreso";

  return (
    <li
      className="rounded-lg border"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      {/* Fila principal */}
      <div className="flex items-start gap-3 p-3">
        {/* Selección para presupuesto (PRE-1 F8) */}
        {seleccionable && (
          <input
            type="checkbox"
            checked={!!seleccionado}
            onChange={() => onToggleSeleccion?.(item.id)}
            className="mt-1 shrink-0"
            title="Incluir en el presupuesto"
          />
        )}

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
              style={{ color: "var(--color-ink-1)" }}
            >
              {item.procedimiento}
            </span>
            {item.pieza && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--color-ink-2)",
                  background: "var(--color-surface-0)",
                }}
              >
                Pieza {item.pieza}
                {item.superficie ? ` · ${item.superficie}` : ""}
              </span>
            )}
            <EstadoBadge estado={item.estado} />
            {!item.id_prestacion && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ color: "#92400E", background: "#FEF9C3" }}
                title="Sin prestación del catálogo asociada: no entra al presupuesto M11"
              >
                sin tarificar
              </span>
            )}
          </div>

          {/* Notas expandidas */}
          {item.notas && expanded && (
            <p
              className="text-xs mt-1.5 leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
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
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--color-ink-3)" }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--color-ink-3)" }} />
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
  const [presupuesto, setPresupuesto] = useState<PresupuestoDePlan | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [generando, setGenerando] = useState(false);

  // Sprint PRE-1 F8: los totales del plan derivan del presupuesto M11 generado
  const planId = plan?.id;
  useEffect(() => {
    if (!planId) return;
    let cancelado = false;
    getPresupuestoDePlan(planId).then((res) => {
      if (!cancelado && res.success) setPresupuesto(res.data);
    });
    return () => {
      cancelado = true;
    };
  }, [planId]);

  const items = plan?.items ?? [];
  const progreso = calcularProgreso(items);
  const totalPlan = calcularPresupuestoTotal(presupuesto);
  const realizado = calcularMontoRealizado(items, presupuesto);

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
          style={{ background: "var(--color-surface-0)" }}
        >
          <ClipboardList className="w-6 h-6" style={{ color: "var(--color-ink-3)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            Sin plan de tratamiento
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-3)" }}>
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
          style={{ background: "var(--color-kp-primary)" }}
        >
          <Plus className="w-4 h-4" />
          {isPending ? "Creando…" : "Crear plan de tratamiento"}
        </button>
      </div>
    );
  }

  async function handleAddItem(data: {
    id_prestacion?: string;
    procedimiento?: string;
    descripcion?: string;
    pieza?: number | null;
    superficie?: string | null;
    prioridad: PrioridadItem;
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
            }
          : p,
      );
    });
  }

  function toggleSeleccion(itemId: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleGenerarPresupuesto() {
    if (!plan || seleccion.size === 0) return;
    setError(null);
    setGenerando(true);
    try {
      const res = await generarPresupuestoDesdePlan(plan.id, patientId, Array.from(seleccion));
      if (!res.success) {
        setError(res.error);
        return;
      }
      const detalle = await getPresupuestoDePlan(plan.id);
      if (detalle.success) setPresupuesto(detalle.data);
      setSeleccion(new Set());
    } finally {
      setGenerando(false);
    }
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
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
              {plan.titulo}
            </h3>
            {plan.diagnostico && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
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
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-ink-3)" }}>
              <span>Progreso: {progreso}%</span>
              <span>
                {completados.length}/{items.length} procedimientos
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-kp-border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progreso}%`,
                  background: "var(--color-kp-primary)",
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
            borderColor: "var(--color-kp-border)",
            color: "var(--color-ink-3)",
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
            style={{ color: "var(--color-ink-3)" }}
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
                seleccionable={!readOnly && !plan.cerrado && !!item.id_prestacion}
                seleccionado={seleccion.has(item.id)}
                onToggleSeleccion={toggleSeleccion}
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
            style={{ color: "var(--color-ink-3)" }}
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
            style={{ color: "var(--color-ink-3)" }}
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

      {/* Footer presupuesto (derivado del M11 generado — PRE-1 F8) */}
      {items.length > 0 && (
        <div
          className="rounded-xl border px-4 py-3 flex flex-wrap gap-4 justify-between items-center"
          style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
        >
          <div className="space-y-0.5">
            <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              {presupuesto ? "Presupuesto M11" : "Presupuesto"}
            </p>
            <p className="text-base font-semibold" style={{ color: "var(--color-ink-1)" }}>
              {presupuesto ? formatCLP(totalPlan) : "—"}
            </p>
            {!presupuesto && (
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                Sin presupuesto generado
              </p>
            )}
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
              Monto realizado
            </p>
            <p
              className="text-base font-semibold"
              style={{ color: realizado > 0 ? "#16A34A" : "var(--color-ink-2)" }}
            >
              {formatCLP(realizado)}
            </p>
          </div>
          {presupuesto && totalPlan > 0 && (
            <div className="space-y-0.5 text-right">
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                Pendiente
              </p>
              <p className="text-base font-semibold" style={{ color: "var(--color-ink-2)" }}>
                {formatCLP(totalPlan - realizado)}
              </p>
            </div>
          )}

          {/* Generar presupuesto M11 desde los ítems seleccionados (PRE-1 F8) */}
          {!readOnly && !plan.cerrado && (
            <button
              type="button"
              onClick={handleGenerarPresupuesto}
              disabled={generando || seleccion.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-kp-primary)" }}
              title={
                seleccion.size === 0
                  ? "Selecciona procedimientos pendientes con prestación asociada"
                  : "Generar presupuesto M11 con los ítems seleccionados"
              }
            >
              <FileText className="w-4 h-4" />
              {generando
                ? "Generando…"
                : seleccion.size > 0
                  ? `Generar presupuesto (${seleccion.size})`
                  : "Generar presupuesto"}
            </button>
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
      <ClipboardList className="w-8 h-8 opacity-30" style={{ color: "var(--color-ink-3)" }} />
      <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
        {mensaje}
      </p>
    </div>
  );
}
