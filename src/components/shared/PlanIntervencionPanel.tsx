"use client";

import { useEffect, useState } from "react";
import { X, Plus, CheckCircle2, AlertCircle, Clock, Pen } from "lucide-react";
import {
  getPlanIntervencionDetalle,
  actualizarPlanIntervencion,
  firmarPlanIntervencion,
} from "@/app/actions/clinico/plan-intervencion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ObjetivoEditor } from "./ObjetivoEditor";
import { ProgresoRegistro } from "./ProgresoRegistro";
import type {
  PlanIntervencionDetalle,
  PlanObjetivo,
  EstadoPlanIntervencion,
  NivelGAS,
} from "@/types/plan-intervencion";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlanIntervencionPanelProps {
  planId: string;
  patientId: string;
  encuentroId: string;
  onClose: () => void;
  onFirmado?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_LABELS: Record<EstadoPlanIntervencion, string> = {
  borrador: "Borrador",
  activo: "Activo",
  en_revision: "En revisión",
  cerrado: "Cerrado",
};

const ESTADO_COLORS: Record<EstadoPlanIntervencion, string> = {
  borrador: "var(--color-ink-3)",
  activo: "var(--color-kp-success)",
  en_revision: "var(--color-kp-warning)",
  cerrado: "var(--color-ink-2)",
};

function gasLabel(nivel: NivelGAS): string {
  const map: Record<NivelGAS, string> = {
    [-2]: "-2 Peor",
    [-1]: "-1",
    [0]: "0",
    [1]: "+1",
    [2]: "+2 Mejor",
  };
  return map[nivel];
}

function gasColor(nivel: NivelGAS): string {
  if (nivel <= -1) return "var(--color-kp-danger)";
  if (nivel === 0) return "var(--color-ink-2)";
  return "var(--color-kp-success)";
}

function prioridadLabel(p: string) {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  return "Baja";
}

function prioridadColor(p: string): string {
  if (p === "alta") return "var(--color-kp-danger)";
  if (p === "media") return "var(--color-kp-warning)";
  return "var(--color-ink-3)";
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanIntervencionPanel({
  planId,
  patientId,
  encuentroId,
  onClose,
  onFirmado,
}: PlanIntervencionPanelProps) {
  const [plan, setPlan] = useState<PlanIntervencionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit states
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState("");
  const [editingFechaRevision, setEditingFechaRevision] = useState(false);
  const [fechaRevisionTemp, setFechaRevisionTemp] = useState("");
  const [savingField, setSavingField] = useState(false);

  // Signing
  const [firmando, setFirmando] = useState(false);
  const [firmaError, setFirmaError] = useState<string | null>(null);

  // Sub-modals
  const [objetivoEditorOpen, setObjetivoEditorOpen] = useState(false);
  const [objetivoEditando, setObjetivoEditando] = useState<PlanObjetivo | undefined>(undefined);
  const [progresoObjetivo, setProgresoObjetivo] = useState<PlanObjetivo | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  async function cargarPlan() {
    setLoading(true);
    setError(null);
    const result = await getPlanIntervencionDetalle(planId);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPlan(result.data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // ── Inline edits ────────────────────────────────────────────────────────────

  async function saveTitulo() {
    if (!plan || !tituloTemp.trim()) return;
    setSavingField(true);
    await actualizarPlanIntervencion(planId, { titulo: tituloTemp.trim() });
    setSavingField(false);
    setEditingTitulo(false);
    setPlan((prev) => (prev ? { ...prev, titulo: tituloTemp.trim() } : prev));
  }

  async function saveFechaRevision() {
    if (!plan) return;
    setSavingField(true);
    await actualizarPlanIntervencion(planId, {
      fecha_revision: fechaRevisionTemp || null,
    });
    setSavingField(false);
    setEditingFechaRevision(false);
    setPlan((prev) =>
      prev ? { ...prev, fecha_revision: fechaRevisionTemp || null } : prev
    );
  }

  // ── Firma ────────────────────────────────────────────────────────────────────

  async function handleFirmar() {
    setFirmaError(null);
    setFirmando(true);
    const result = await firmarPlanIntervencion(planId);
    setFirmando(false);
    if (!result.success) {
      setFirmaError(result.error);
      return;
    }
    setPlan((prev) =>
      prev
        ? { ...prev, firmado: true, firmado_at: new Date().toISOString() }
        : prev
    );
    onFirmado?.();
  }

  // ── Objetivo callbacks ───────────────────────────────────────────────────────

  function handleObjetivoGuardado() {
    setObjetivoEditorOpen(false);
    setObjetivoEditando(undefined);
    cargarPlan();
  }

  function handleProgresoRegistrado() {
    setProgresoObjetivo(null);
    cargarPlan();
  }

  // ── Group objectives by domain ───────────────────────────────────────────────

  type ObjetivoConProgreso = PlanIntervencionDetalle["objetivos"][number];
  const objetivosPorDominio: Map<string, ObjetivoConProgreso[]> = new Map();
  if (plan) {
    for (const obj of plan.objetivos) {
      const key = obj.dominio_label || obj.dominio_codigo;
      if (!objetivosPorDominio.has(key)) objetivosPorDominio.set(key, []);
      objetivosPorDominio.get(key)!.push(obj);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col"
          style={{ background: "var(--color-surface-1)" }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div
            className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-4 border-b"
            style={{
              background: "var(--color-surface-1)",
              borderColor: "var(--color-kp-border)",
            }}
          >
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Título editable */}
              {editingTitulo ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={tituloTemp}
                    onChange={(e) => setTituloTemp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitulo();
                      if (e.key === "Escape") setEditingTitulo(false);
                    }}
                    className="text-lg font-semibold rounded-lg border px-2 py-1 flex-1 focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "var(--color-kp-accent)",
                      color: "var(--color-ink-1)",
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveTitulo}
                    disabled={savingField}
                  >
                    OK
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTitulo(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 group text-left"
                  onClick={() => {
                    setTituloTemp(plan?.titulo ?? "");
                    setEditingTitulo(true);
                  }}
                >
                  <h2
                    className="text-lg font-semibold truncate"
                    style={{ color: "var(--color-ink-1)" }}
                  >
                    {plan?.titulo ?? "Plan de Intervención"}
                  </h2>
                  <Pen
                    className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                    style={{ color: "var(--color-ink-3)" }}
                  />
                </button>
              )}

              {/* Meta badges */}
              {plan && (
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* Estado */}
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: ESTADO_COLORS[plan.estado],
                      background: "var(--color-surface-0)",
                    }}
                  >
                    {ESTADO_LABELS[plan.estado]}
                  </span>

                  {/* Firmado */}
                  {plan.firmado && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                      style={{
                        color: "var(--color-kp-success)",
                        background: "var(--color-surface-0)",
                      }}
                    >
                      <CheckCircle2 className="size-3" />
                      Firmado {plan.firmado_at ? formatFecha(plan.firmado_at) : ""}
                    </span>
                  )}

                  {/* Fecha inicio */}
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    <Clock className="size-3" />
                    Inicio: {formatFecha(plan.fecha_inicio)}
                  </span>

                  {/* Fecha revisión editable */}
                  {editingFechaRevision ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        value={fechaRevisionTemp}
                        onChange={(e) => setFechaRevisionTemp(e.target.value)}
                        className="h-6 py-0 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveFechaRevision}
                        disabled={savingField}
                      >
                        OK
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingFechaRevision(false)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                      style={{ color: "var(--color-ink-3)" }}
                      onClick={() => {
                        setFechaRevisionTemp(plan.fecha_revision ?? "");
                        setEditingFechaRevision(true);
                      }}
                    >
                      Revisión:{" "}
                      {plan.fecha_revision ? formatFecha(plan.fecha_revision) : "—"}
                      <Pen className="size-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Firmado notice */}
              {plan?.firmado && (
                <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  Documento vivo — sigue siendo editable
                </p>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:opacity-70 shrink-0"
              style={{ color: "var(--color-ink-3)" }}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="flex-1 px-6 py-5 flex flex-col gap-5">
            {/* Loading */}
            {loading && (
              <div
                className="flex items-center justify-center py-12 text-sm"
                style={{ color: "var(--color-ink-3)" }}
              >
                Cargando plan…
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                style={{
                  color: "var(--color-kp-danger)",
                  background: "var(--color-kp-danger-lt)",
                }}
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Content */}
            {!loading && plan && (
              <>
                {/* Objetivos por dominio */}
                {objetivosPorDominio.size === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed"
                    style={{ borderColor: "var(--color-kp-border)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
                      Sin objetivos definidos
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                      Agrega el primer objetivo para este plan
                    </p>
                  </div>
                ) : (
                  Array.from(objetivosPorDominio.entries()).map(([dominio, objs]) => (
                    <div key={dominio} className="flex flex-col gap-3">
                      <h3
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        {dominio}
                      </h3>
                      <div className="flex flex-col gap-2">
                        {objs.map((obj) => (
                          <div
                            key={obj.id}
                            className="rounded-xl border p-4 flex flex-col gap-3"
                            style={{
                              borderColor: "var(--color-kp-border)",
                              background: "var(--color-surface-0)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "var(--color-ink-1)" }}
                                >
                                  {obj.descripcion}
                                </p>
                                {obj.criterio_logro && (
                                  <p
                                    className="text-xs"
                                    style={{ color: "var(--color-ink-3)" }}
                                  >
                                    Criterio: {obj.criterio_logro}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Nivel actual */}
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                                  style={{
                                    color: gasColor(obj.nivel_actual),
                                    background: "var(--color-surface-1)",
                                    border: `1px solid ${gasColor(obj.nivel_actual)}`,
                                  }}
                                >
                                  {gasLabel(obj.nivel_actual)}
                                </span>
                                {/* Prioridad */}
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    color: prioridadColor(obj.prioridad),
                                    background: "var(--color-surface-1)",
                                  }}
                                >
                                  {prioridadLabel(obj.prioridad)}
                                </span>
                              </div>
                            </div>

                            {/* Ultimo progreso */}
                            {obj.ultimo_progreso && (
                              <p
                                className="text-xs rounded-lg px-2 py-1"
                                style={{
                                  color: "var(--color-ink-3)",
                                  background: "var(--color-surface-1)",
                                }}
                              >
                                Último progreso:{" "}
                                <strong style={{ color: gasColor(obj.ultimo_progreso.nivel_gas) }}>
                                  {gasLabel(obj.ultimo_progreso.nivel_gas)}
                                </strong>{" "}
                                — {formatFecha(obj.ultimo_progreso.registrado_at)}
                                {obj.ultimo_progreso.observacion && (
                                  <> · {obj.ultimo_progreso.observacion}</>
                                )}
                              </p>
                            )}

                            {/* Acciones del objetivo */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                                style={{
                                  color: "var(--color-kp-accent)",
                                  borderColor: "var(--color-kp-accent)",
                                }}
                                onClick={() => setProgresoObjetivo(obj)}
                              >
                                Registrar progreso
                              </button>
                              <button
                                type="button"
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                                style={{
                                  color: "var(--color-ink-2)",
                                  borderColor: "var(--color-kp-border)",
                                }}
                                onClick={() => {
                                  setObjetivoEditando(obj);
                                  setObjetivoEditorOpen(true);
                                }}
                              >
                                Editar objetivo
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          {!loading && plan && (
            <div
              className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 border-t"
              style={{
                background: "var(--color-surface-1)",
                borderColor: "var(--color-kp-border)",
              }}
            >
              {/* Firma error */}
              <div className="flex-1">
                {firmaError && (
                  <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
                    {firmaError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Agregar objetivo */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-colors hover:opacity-80"
                  style={{
                    color: "var(--color-kp-primary)",
                    borderColor: "var(--color-kp-primary)",
                  }}
                  onClick={() => {
                    setObjetivoEditando(undefined);
                    setObjetivoEditorOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Agregar objetivo
                </button>

                {/* Firmar */}
                {!plan.firmado ? (
                  <Button
                    type="button"
                    onClick={handleFirmar}
                    disabled={firmando}
                  >
                    {firmando ? "Firmando…" : "Firmar plan"}
                  </Button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg"
                    style={{
                      color: "var(--color-kp-success)",
                      background: "var(--color-surface-0)",
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    Firmado
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: ObjetivoEditor */}
      {objetivoEditorOpen && (
        <ObjetivoEditor
          planId={planId}
          patientId={patientId}
          objetivo={objetivoEditando}
          onGuardado={handleObjetivoGuardado}
          onClose={() => {
            setObjetivoEditorOpen(false);
            setObjetivoEditando(undefined);
          }}
        />
      )}

      {/* Sub-modal: ProgresoRegistro */}
      {progresoObjetivo && (
        <ProgresoRegistro
          objetivo={progresoObjetivo}
          encuentroId={encuentroId}
          onRegistrado={handleProgresoRegistrado}
          onClose={() => setProgresoObjetivo(null)}
        />
      )}
    </>
  );
}
