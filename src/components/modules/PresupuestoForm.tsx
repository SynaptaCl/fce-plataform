"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  crearPresupuesto,
  actualizarPresupuesto,
  firmarPresupuesto,
  getDatosTarificacion,
  getSaldoPresupuesto,
} from "@/app/actions/presupuestos";
import type { DatosTarificacion, SaldoPresupuesto } from "@/app/actions/presupuestos";
import { PrestacionPicker } from "./PrestacionPicker";
import { calcular } from "@/lib/tarificacion/calcular";
import type { LineaInput } from "@/lib/tarificacion";
import type {
  Presupuesto,
  PresupuestoFormData,
  PresupuestoEstado,
} from "@/types/presupuesto";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemDraft {
  id_prestacion: string | null;
  cantidad: number;
  descuento_pct: number;
  pieza: number | null;
  superficie: string;
}

interface Props {
  idPaciente: string;
  idEncuentro?: string;
  presupuesto?: Presupuesto; // if provided = edit mode
  onSuccess?: (p: Presupuesto) => void;
  onCancel?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

const ESTADO_BADGE: Record<PresupuestoEstado, { label: string; bg: string; color: string }> = {
  borrador: { label: "Borrador", bg: "#FEF9C3", color: "#92400E" },
  enviado: { label: "Enviado", bg: "#DBEAFE", color: "#1D4ED8" },
  aceptado: { label: "Aceptado", bg: "#DCFCE7", color: "#15803D" },
  rechazado: { label: "Rechazado", bg: "#FEE2E2", color: "#B91C1C" },
  anulado: { label: "Anulado", bg: "#E5E7EB", color: "#4B5563" },
};

function itemsFromPresupuesto(presupuesto?: Presupuesto): ItemDraft[] {
  if (!presupuesto?.items?.length) return [];
  return presupuesto.items
    .filter((it) => it.id_prestacion)
    .map((it) => ({
      id_prestacion: it.id_prestacion,
      cantidad: it.cantidad,
      descuento_pct: it.descuento_pct ?? 0,
      pieza: it.pieza ?? null,
      superficie: it.superficie ?? "",
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PresupuestoForm({
  idPaciente,
  idEncuentro,
  presupuesto,
  onSuccess,
  onCancel,
}: Props) {
  const isEditMode = !!presupuesto;
  const isReadOnly = isEditMode && presupuesto.firmado === true;

  const [titulo, setTitulo] = useState(presupuesto?.titulo ?? "");
  const [notas, setNotas] = useState(presupuesto?.notas ?? "");
  const [items, setItems] = useState<ItemDraft[]>(itemsFromPresupuesto(presupuesto));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tarif, setTarif] = useState<DatosTarificacion | null>(null);
  const [tarifError, setTarifError] = useState<string | null>(null);
  const [saldo, setSaldo] = useState<SaldoPresupuesto | null>(null);

  // F7: saldo derivado (pagos registrados en synapta) para presupuestos ya enviados
  useEffect(() => {
    if (!presupuesto?.firmado) return;
    if (presupuesto.estado !== "enviado" && presupuesto.estado !== "aceptado") return;
    let cancelado = false;
    getSaldoPresupuesto(presupuesto.id).then((result) => {
      if (!cancelado && result.success) setSaldo(result.data);
    });
    return () => {
      cancelado = true;
    };
  }, [presupuesto?.id, presupuesto?.firmado, presupuesto?.estado]);

  useEffect(() => {
    if (isReadOnly) return;
    let cancelado = false;
    getDatosTarificacion().then((result) => {
      if (cancelado) return;
      if (result.success) setTarif(result.data);
      else setTarifError(result.error);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Preview de totales: mismas funciones puras del server (choke point único).
  //    El server recalcula siempre al guardar; esto es solo visual. ──────────

  const preview = useMemo(() => {
    if (!tarif) return null;
    const overridePorId = new Map(tarif.overrides.map((o) => [o.id_prestacion, o]));
    const prestacionPorId = new Map(tarif.prestaciones.map((p) => [p.id, p]));
    const lineas: LineaInput[] = items
      .filter((it) => it.id_prestacion && prestacionPorId.has(it.id_prestacion))
      .map((it) => ({
        prestacion: prestacionPorId.get(it.id_prestacion as string)!,
        override: overridePorId.get(it.id_prestacion as string) ?? null,
        cantidad: it.cantidad,
        descuento_pct: it.descuento_pct,
        pieza: it.pieza,
        superficie: it.superficie || null,
      }));
    return calcular(lineas, tarif.modelo);
  }, [items, tarif]);

  const requierePieza = (idPrestacion: string | null): boolean =>
    !!idPrestacion && !!tarif?.prestaciones.find((p) => p.id === idPrestacion)?.requiere_pieza;

  // ── Item handlers ────────────────────────────────────────────────────────

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id_prestacion: null, cantidad: 1, descuento_pct: 0, pieza: null, superficie: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem<K extends keyof ItemDraft>(index: number, key: K, value: ItemDraft[K]) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  }

  // ── Submit helpers ────────────────────────────────────────────────────────

  function buildFormData(): PresupuestoFormData {
    return {
      titulo: titulo.trim(),
      notas: notas.trim() || undefined,
      items: items
        .filter((it) => it.id_prestacion)
        .map((it) => ({
          id_prestacion: it.id_prestacion as string,
          cantidad: it.cantidad,
          descuento_pct: it.descuento_pct,
          pieza: it.pieza,
          superficie: it.superficie.trim() || null,
        })),
    };
  }

  function validate(): string | null {
    if (!titulo.trim()) return "El título es obligatorio.";
    if (items.length === 0) return "Agrega al menos un ítem.";
    for (const [i, it] of items.entries()) {
      if (!it.id_prestacion) return `Ítem ${i + 1}: selecciona una prestación del catálogo.`;
      if (it.cantidad < 1) return `Ítem ${i + 1}: la cantidad debe ser al menos 1.`;
      if (tarif && !tarif.politica.permite_descuento_item && it.descuento_pct > 0) {
        return "La clínica no permite descuentos por ítem.";
      }
      if (tarif && it.descuento_pct > tarif.politica.descuento_max_pct) {
        return `Ítem ${i + 1}: el descuento excede el máximo de la clínica (${tarif.politica.descuento_max_pct}%).`;
      }
      if (requierePieza(it.id_prestacion) && (it.pieza == null || it.pieza < 11 || it.pieza > 48)) {
        return `Ítem ${i + 1}: indica la pieza dentaria (FDI 11–48).`;
      }
    }
    return null;
  }

  async function handleGuardarBorrador() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSubmitting(true);
    try {
      const formData = buildFormData();
      const result = isEditMode && presupuesto
        ? await actualizarPresupuesto(presupuesto.id, formData)
        : await crearPresupuesto(idPaciente, formData, idEncuentro);
      if (result.success) {
        onSuccess?.(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFirmar() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (preview?.pendiente_tarificar) {
      setError("No se puede firmar: hay prestaciones sin precio cargado (pendientes de tarificar).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const formData = buildFormData();
      const saveResult = isEditMode && presupuesto
        ? await actualizarPresupuesto(presupuesto.id, formData)
        : await crearPresupuesto(idPaciente, formData, idEncuentro);
      if (!saveResult.success) { setError(saveResult.error); return; }

      const signResult = await firmarPresupuesto(saveResult.data.id);
      if (signResult.success) {
        onSuccess?.(signResult.data);
      } else {
        setError(signResult.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Read-only view (firmado) ──────────────────────────────────────────────

  if (isReadOnly && presupuesto) {
    const badge = ESTADO_BADGE[presupuesto.estado] ?? ESTADO_BADGE.enviado;
    const tieneIva = (presupuesto.iva_clp ?? 0) > 0;
    return (
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {presupuesto.titulo}
          </h3>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>

        {presupuesto.notas && (
          <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
            {presupuesto.notas}
          </p>
        )}

        {presupuesto.items && presupuesto.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-kp-border)" }}>
                  <th className="text-left py-1.5 pr-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Descripción</th>
                  <th className="text-right py-1.5 px-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Cant.</th>
                  <th className="text-right py-1.5 px-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Precio unit.</th>
                  <th className="text-right py-1.5 px-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Dcto.</th>
                  <th className="text-right py-1.5 pl-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid var(--color-kp-border)" }}>
                    <td className="py-1.5 pr-2" style={{ color: "var(--color-ink-1)" }}>
                      {it.descripcion}
                      {it.pieza != null && (
                        <span className="ml-1" style={{ color: "var(--color-ink-3)" }}>
                          (pieza {it.pieza}{it.superficie ? ` · ${it.superficie}` : ""})
                        </span>
                      )}
                    </td>
                    <td className="text-right py-1.5 px-2" style={{ color: "var(--color-ink-2)" }}>{it.cantidad}</td>
                    <td className="text-right py-1.5 px-2" style={{ color: "var(--color-ink-2)" }}>{formatCLP(it.precio_unitario)}</td>
                    <td className="text-right py-1.5 px-2" style={{ color: "var(--color-ink-2)" }}>
                      {it.descuento_clp > 0 ? `−${formatCLP(it.descuento_clp)}` : "—"}
                    </td>
                    <td className="text-right py-1.5 pl-2 font-medium" style={{ color: "var(--color-ink-1)" }}>
                      {formatCLP(it.total_linea_clp)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right pt-2 pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-2)" }}>Subtotal</td>
                  <td className="text-right pt-2 pl-2 text-xs" style={{ color: "var(--color-ink-1)" }}>{formatCLP(presupuesto.subtotal_clp ?? 0)}</td>
                </tr>
                {(presupuesto.descuento_clp ?? 0) > 0 && (
                  <tr>
                    <td colSpan={4} className="text-right pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-2)" }}>Descuento</td>
                    <td className="text-right pl-2 text-xs" style={{ color: "var(--color-ink-1)" }}>−{formatCLP(presupuesto.descuento_clp ?? 0)}</td>
                  </tr>
                )}
                {tieneIva && (
                  <>
                    <tr>
                      <td colSpan={4} className="text-right pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-2)" }}>Neto</td>
                      <td className="text-right pl-2 text-xs" style={{ color: "var(--color-ink-1)" }}>{formatCLP(presupuesto.neto_clp ?? 0)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="text-right pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-2)" }}>IVA (19%)</td>
                      <td className="text-right pl-2 text-xs" style={{ color: "var(--color-ink-1)" }}>{formatCLP(presupuesto.iva_clp ?? 0)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={4} className="text-right pt-1 pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-1)" }}>Total</td>
                  <td className="text-right pt-1 pl-2 font-bold text-sm" style={{ color: "var(--color-ink-1)" }}>
                    {formatCLP(presupuesto.total_clp ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {saldo && (saldo.pagado_clp > 0 || presupuesto.estado === "aceptado") && (
          <div
            className="flex items-center justify-between rounded-lg px-4 py-2"
            style={{ background: "var(--color-surface-1)", border: "1px dashed var(--color-kp-border)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
              Pagado (caja)
            </span>
            <span className="text-xs" style={{ color: "var(--color-ink-1)" }}>
              {formatCLP(saldo.pagado_clp)}
              {saldo.saldo_clp > 0 && (
                <span className="font-semibold" style={{ color: "#B45309" }}>
                  {" "}· saldo {formatCLP(saldo.saldo_clp)}
                </span>
              )}
            </span>
          </div>
        )}

        {onCancel && (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Edit / Create form ────────────────────────────────────────────────────

  if (tarifError) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
      >
        <p className="text-xs font-medium" style={{ color: "#EF4444" }}>{tarifError}</p>
        {onCancel && (
          <div className="flex justify-end mt-3">
            <Button variant="secondary" size="sm" type="button" onClick={onCancel}>Cerrar</Button>
          </div>
        )}
      </div>
    );
  }

  if (!tarif) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
      >
        <p className="text-xs py-3 text-center" style={{ color: "var(--color-ink-3)" }}>
          Cargando catálogo de prestaciones…
        </p>
      </div>
    );
  }

  const permiteDescuento = tarif.politica.permite_descuento_item;
  const descuentoMax = tarif.politica.descuento_max_pct;

  return (
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
        {isEditMode ? "Editar presupuesto" : "Nuevo presupuesto"}
      </h3>

      {/* Título */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Título <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Plan de tratamiento ortodóntico"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
          }}
        />
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>
          Notas (opcional)
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observaciones adicionales..."
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
          style={{
            borderColor: "var(--color-kp-border)",
            background: "var(--color-surface-0)",
            color: "var(--color-ink-1)",
          }}
        />
      </div>

      {/* Ítems */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--color-ink-2)" }}>
            Ítems del presupuesto
          </span>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors"
            style={{ color: "var(--color-kp-primary)", background: "var(--color-kp-accent-xs, #EFF6FF)" }}
          >
            <Plus size={12} />
            Agregar ítem
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-xs py-3 text-center" style={{ color: "var(--color-ink-3)" }}>
            Sin ítems. Agrega al menos uno desde el catálogo de prestaciones.
          </p>
        )}

        <div className="space-y-2">
          {items.map((item, index) => {
            const lineaCalc = preview?.lineas[index];
            const pendiente = lineaCalc?.pendiente_tarificar ?? false;
            return (
              <div
                key={index}
                className="rounded-lg border p-3 space-y-2"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Prestación</label>
                    <PrestacionPicker
                      prestaciones={tarif.prestaciones}
                      overrides={tarif.overrides}
                      modelo={tarif.modelo}
                      value={item.id_prestacion}
                      onChange={(id) => updateItem(index, "id_prestacion", id)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="mt-5 p-1.5 rounded-md transition-colors"
                    style={{ color: "#EF4444" }}
                    title="Eliminar ítem"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, "cantidad", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                      style={{
                        borderColor: "var(--color-kp-border)",
                        background: "var(--color-surface-1)",
                        color: "var(--color-ink-1)",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                      Descuento %{permiteDescuento ? ` (máx. ${descuentoMax})` : " (no permitido)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={permiteDescuento ? descuentoMax : 0}
                      step="0.01"
                      value={item.descuento_pct}
                      disabled={!permiteDescuento}
                      onChange={(e) =>
                        updateItem(index, "descuento_pct", Math.min(descuentoMax, Math.max(0, parseFloat(e.target.value) || 0)))
                      }
                      className="w-full rounded-md border px-2 py-1.5 text-xs outline-none disabled:opacity-50"
                      style={{
                        borderColor: "var(--color-kp-border)",
                        background: "var(--color-surface-1)",
                        color: "var(--color-ink-1)",
                      }}
                    />
                  </div>
                </div>
                {requierePieza(item.id_prestacion) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Pieza (FDI 11–48)</label>
                      <input
                        type="number"
                        min={11}
                        max={48}
                        value={item.pieza ?? ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          updateItem(index, "pieza", Number.isNaN(v) ? null : v);
                        }}
                        className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                        style={{
                          borderColor: "var(--color-kp-border)",
                          background: "var(--color-surface-1)",
                          color: "var(--color-ink-1)",
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Superficie (opcional)</label>
                      <input
                        type="text"
                        value={item.superficie}
                        onChange={(e) => updateItem(index, "superficie", e.target.value)}
                        placeholder="Ej: O"
                        className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                        style={{
                          borderColor: "var(--color-kp-border)",
                          background: "var(--color-surface-1)",
                          color: "var(--color-ink-1)",
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {pendiente ? (
                    <span className="text-xs font-medium" style={{ color: "#B45309" }}>
                      Sin precio cargado — pendiente de tarificar
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>Total línea: </span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--color-ink-1)" }}>
                    {lineaCalc && !pendiente ? formatCLP(lineaCalc.total_linea_clp) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totales (preview con las mismas funciones puras del server) */}
        {preview && preview.lineas.length > 0 && (
          <div
            className="rounded-lg px-4 py-3 space-y-1"
            style={{ background: "var(--color-surface-0)", borderTop: "2px solid var(--color-kp-border)" }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-ink-2)" }}>
              <span>Subtotal</span>
              <span>{formatCLP(preview.subtotal_clp)}</span>
            </div>
            {preview.descuento_clp > 0 && (
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-ink-2)" }}>
                <span>Descuento</span>
                <span>−{formatCLP(preview.descuento_clp)}</span>
              </div>
            )}
            {preview.iva_clp > 0 && (
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-ink-2)" }}>
                <span>Neto / IVA (19%)</span>
                <span>{formatCLP(preview.neto_clp)} / {formatCLP(preview.iva_clp)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold" style={{ color: "var(--color-ink-2)" }}>Total estimado</span>
              <span className="text-base font-bold" style={{ color: "var(--color-kp-primary)" }}>
                {formatCLP(preview.total_clp)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-medium" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={handleGuardarBorrador}
          disabled={submitting}
        >
          {submitting ? "Guardando..." : "Guardar borrador"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={handleFirmar}
          disabled={submitting || !!preview?.pendiente_tarificar}
        >
          {submitting ? "Procesando..." : "Firmar y enviar"}
        </Button>
      </div>
    </div>
  );
}
