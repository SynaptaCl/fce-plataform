"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { ProcedimientoPicker } from "./ProcedimientoPicker";
import { PIEZAS_ADULTO, PIEZAS_NINO } from "@/lib/dental/fdi";
import type { ProcedimientoCatalogo, PrioridadItem } from "@/types/plan-tratamiento";

interface FormData {
  procedimiento: string;
  descripcion: string;
  pieza: number | "";
  superficie: string;
  prioridad: PrioridadItem;
  valor_unitario: number | "";
  notas: string;
}

interface Props {
  catalogo: ProcedimientoCatalogo[];
  onSubmit: (data: {
    procedimiento: string;
    descripcion?: string;
    pieza?: number | null;
    superficie?: string | null;
    prioridad: PrioridadItem;
    valor_unitario: number;
    notas?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const PRIORIDADES: { value: PrioridadItem; label: string }[] = [
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "baja", label: "Baja" },
  { value: "electivo", label: "Electivo" },
];

const TODAS_PIEZAS = [...PIEZAS_ADULTO, ...PIEZAS_NINO];

export function PlanTratamientoItemForm({
  catalogo,
  onSubmit,
  onCancel,
  loading = false,
}: Props) {
  const [form, setForm] = useState<FormData>({
    procedimiento: "",
    descripcion: "",
    pieza: "",
    superficie: "",
    prioridad: "normal",
    valor_unitario: "",
    notas: "",
  });
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectProc(proc: ProcedimientoCatalogo) {
    setForm((f) => ({
      ...f,
      procedimiento: proc.nombre,
      valor_unitario: proc.precio_base > 0 ? proc.precio_base : f.valor_unitario,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.procedimiento.trim()) {
      setError("El procedimiento es requerido.");
      return;
    }
    try {
      await onSubmit({
        procedimiento: form.procedimiento.trim(),
        descripcion: form.descripcion.trim() || undefined,
        pieza: form.pieza !== "" ? Number(form.pieza) : null,
        superficie: form.superficie.trim() || null,
        prioridad: form.prioridad,
        valor_unitario: form.valor_unitario !== "" ? Number(form.valor_unitario) : 0,
        notas: form.notas.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: "var(--color-kp-primary)", background: "var(--color-surface-1)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-kp-primary)" }}>
        Nuevo procedimiento
      </p>

      {/* Procedimiento */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.procedimiento}
            onChange={(e) => setForm((f) => ({ ...f, procedimiento: e.target.value }))}
            placeholder="Nombre del procedimiento *"
            required
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-kp-primary/20"
            style={{
              borderColor: "var(--color-kp-border)",
              color: "var(--color-ink-1)",
              background: "var(--color-surface-0)",
            }}
          />
          {catalogo.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-surface-0"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
              title="Buscar en catálogo"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Catálogo
            </button>
          )}
        </div>

        {showPicker && catalogo.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20">
            <ProcedimientoPicker
              catalogo={catalogo}
              onSelect={handleSelectProc}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Pieza + Superficie */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--color-ink-3)" }}>
            Pieza (FDI)
          </label>
          <select
            value={form.pieza}
            onChange={(e) =>
              setForm((f) => ({ ...f, pieza: e.target.value === "" ? "" : Number(e.target.value) }))
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--color-kp-border)",
              color: "var(--color-ink-1)",
              background: "var(--color-surface-0)",
            }}
          >
            <option value="">Sin pieza</option>
            <optgroup label="Permanentes">
              {PIEZAS_ADULTO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
            <optgroup label="Temporales">
              {PIEZAS_NINO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--color-ink-3)" }}>
            Superficie
          </label>
          <input
            type="text"
            value={form.superficie}
            onChange={(e) => setForm((f) => ({ ...f, superficie: e.target.value }))}
            placeholder="MO, MOD…"
            maxLength={10}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--color-kp-border)",
              color: "var(--color-ink-1)",
              background: "var(--color-surface-0)",
            }}
          />
        </div>
      </div>

      {/* Prioridad + Valor */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--color-ink-3)" }}>
            Prioridad
          </label>
          <select
            value={form.prioridad}
            onChange={(e) =>
              setForm((f) => ({ ...f, prioridad: e.target.value as PrioridadItem }))
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--color-kp-border)",
              color: "var(--color-ink-1)",
              background: "var(--color-surface-0)",
            }}
          >
            {PRIORIDADES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--color-ink-3)" }}>
            Valor ($)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={form.valor_unitario}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                valor_unitario: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            placeholder="0"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--color-kp-border)",
              color: "var(--color-ink-1)",
              background: "var(--color-surface-0)",
            }}
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <textarea
          value={form.notas}
          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          placeholder="Notas (opcional)"
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
          style={{
            borderColor: "var(--color-kp-border)",
            color: "var(--color-ink-1)",
            background: "var(--color-surface-0)",
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-0 disabled:opacity-50"
          style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--color-kp-primary)" }}
        >
          {loading ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
