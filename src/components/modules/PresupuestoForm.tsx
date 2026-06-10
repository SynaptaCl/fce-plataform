"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  crearPresupuesto,
  actualizarPresupuesto,
  firmarPresupuesto,
} from "@/app/actions/presupuestos";
import type { Presupuesto, PresupuestoFormData } from "@/types/presupuesto";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemDraft {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  orden: number;
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

function calcularTotal(items: ItemDraft[]): number {
  return items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
}

function itemsFromPresupuesto(presupuesto?: Presupuesto): ItemDraft[] {
  if (!presupuesto?.items?.length) return [];
  return presupuesto.items.map((it) => ({
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    orden: it.orden,
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

  // ── Item handlers ────────────────────────────────────────────────────────

  function addItem() {
    setItems((prev) => [
      ...prev,
      { descripcion: "", cantidad: 1, precio_unitario: 0, orden: prev.length },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, orden: i })));
  }

  function updateItem<K extends keyof ItemDraft>(index: number, key: K, value: ItemDraft[K]) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  }

  // ── Submit helpers ────────────────────────────────────────────────────────

  function buildFormData(): PresupuestoFormData {
    return {
      titulo: titulo.trim(),
      notas: notas.trim() || undefined,
      items: items.map((it, i) => ({
        descripcion: it.descripcion.trim(),
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        orden: i,
      })),
    };
  }

  function validate(): string | null {
    if (!titulo.trim()) return "El título es obligatorio.";
    for (const it of items) {
      if (!it.descripcion.trim()) return "Todos los ítems deben tener una descripción.";
      if (it.cantidad < 1) return "La cantidad debe ser al menos 1.";
      if (it.precio_unitario < 0) return "El precio unitario no puede ser negativo.";
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
    setError(null);
    setSubmitting(true);
    try {
      const formData = buildFormData();
      // Save first, then sign
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

  const total = calcularTotal(items);

  // ── Read-only view (firmado) ──────────────────────────────────────────────

  if (isReadOnly && presupuesto) {
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
            style={{ background: "#DCFCE7", color: "#15803D" }}
          >
            Enviado
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
                  <th className="text-right py-1.5 pl-2 font-semibold" style={{ color: "var(--color-ink-2)" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid var(--color-kp-border)" }}>
                    <td className="py-1.5 pr-2" style={{ color: "var(--color-ink-1)" }}>{it.descripcion}</td>
                    <td className="text-right py-1.5 px-2" style={{ color: "var(--color-ink-2)" }}>{it.cantidad}</td>
                    <td className="text-right py-1.5 px-2" style={{ color: "var(--color-ink-2)" }}>{formatCLP(it.precio_unitario)}</td>
                    <td className="text-right py-1.5 pl-2 font-medium" style={{ color: "var(--color-ink-1)" }}>{formatCLP(it.cantidad * it.precio_unitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right pt-2 pr-2 font-semibold text-xs" style={{ color: "var(--color-ink-1)" }}>Total</td>
                  <td className="text-right pt-2 pl-2 font-bold text-sm" style={{ color: "var(--color-ink-1)" }}>
                    {formatCLP(presupuesto.items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
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
          placeholder="Ej: Plan de tratamiento orthodóntico"
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
            Sin ítems. Agrega al menos uno.
          </p>
        )}

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border p-3 space-y-2"
              style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Descripción</label>
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    placeholder="Descripción del servicio..."
                    className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                    style={{
                      borderColor: "var(--color-kp-border)",
                      background: "var(--color-surface-1)",
                      color: "var(--color-ink-1)",
                    }}
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
                  <label className="text-xs" style={{ color: "var(--color-ink-3)" }}>Precio unitario (CLP)</label>
                  <input
                    type="number"
                    min={0}
                    value={item.precio_unitario}
                    onChange={(e) => updateItem(index, "precio_unitario", Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                    style={{
                      borderColor: "var(--color-kp-border)",
                      background: "var(--color-surface-1)",
                      color: "var(--color-ink-1)",
                    }}
                  />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>Subtotal: </span>
                <span className="text-xs font-semibold" style={{ color: "var(--color-ink-1)" }}>
                  {formatCLP(item.cantidad * item.precio_unitario)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        {items.length > 0 && (
          <div
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: "var(--color-surface-0)", borderTop: "2px solid var(--color-kp-border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--color-ink-2)" }}>
              Total estimado
            </span>
            <span className="text-base font-bold" style={{ color: "var(--color-kp-primary)" }}>
              {formatCLP(total)}
            </span>
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
          disabled={submitting}
        >
          {submitting ? "Procesando..." : "Firmar y enviar"}
        </Button>
      </div>
    </div>
  );
}
