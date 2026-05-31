"use client";

import { useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { registrarProgreso } from "@/app/actions/clinico/plan-intervencion";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { PlanObjetivo, NivelGAS } from "@/types/plan-intervencion";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProgresoRegistroProps {
  objetivo: PlanObjetivo;
  encuentroId?: string;
  onRegistrado: () => void;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GAS_NIVELES: {
  value: NivelGAS;
  label: string;
  shortLabel: string;
  fieldKey: keyof Pick<
    PlanObjetivo,
    "gas_menos_2" | "gas_menos_1" | "gas_0" | "gas_mas_1" | "gas_mas_2"
  >;
}[] = [
  {
    value: -2,
    label: "Mucho peor que lo esperado",
    shortLabel: "-2",
    fieldKey: "gas_menos_2",
  },
  {
    value: -1,
    label: "Algo peor que lo esperado",
    shortLabel: "-1",
    fieldKey: "gas_menos_1",
  },
  { value: 0, label: "Resultado esperado", shortLabel: "0", fieldKey: "gas_0" },
  {
    value: 1,
    label: "Algo mejor que lo esperado",
    shortLabel: "+1",
    fieldKey: "gas_mas_1",
  },
  {
    value: 2,
    label: "Mucho mejor que lo esperado",
    shortLabel: "+2",
    fieldKey: "gas_mas_2",
  },
];

function getNivelColor(nivel: NivelGAS): string {
  if (nivel <= -1) return "var(--color-kp-danger)";
  if (nivel === 0) return "var(--color-ink-2)";
  return "var(--color-kp-success)";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProgresoRegistro({
  objetivo,
  encuentroId,
  onRegistrado,
  onClose,
}: ProgresoRegistroProps) {
  const [nivelGas, setNivelGas] = useState<NivelGAS>(objetivo.nivel_actual);
  const [observacion, setObservacion] = useState("");
  const [estrategias, setEstrategias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descripcionTruncada =
    objetivo.descripcion.length > 80
      ? objetivo.descripcion.slice(0, 80) + "…"
      : objetivo.descripcion;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await registrarProgreso({
      objetivoId: objetivo.id,
      idEncuentro: encuentroId,
      nivelGas,
      observacion: observacion.trim() || undefined,
      estrategias: estrategias.trim() || undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onRegistrado();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-xl shadow-xl p-6 flex flex-col gap-4"
        style={{ background: "var(--color-surface-1)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 shrink-0" style={{ color: "var(--color-kp-accent)" }} />
              <h3 className="text-base font-semibold" style={{ color: "var(--color-ink-1)" }}>
                Registrar progreso
              </h3>
            </div>
            <p className="text-xs ml-6" style={{ color: "var(--color-ink-3)" }}>
              <span className="font-medium" style={{ color: "var(--color-ink-2)" }}>
                {objetivo.dominio_label}
              </span>{" "}
              — {descripcionTruncada}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:opacity-70 shrink-0"
            style={{ color: "var(--color-ink-3)" }}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Selector de nivel GAS */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
            Nivel GAS actual
          </p>
          <div className="flex flex-col gap-2">
            {GAS_NIVELES.map((nivel) => {
              const descripcionNivel = objetivo[nivel.fieldKey];
              const isSelected = nivelGas === nivel.value;
              return (
                <button
                  key={nivel.value}
                  type="button"
                  onClick={() => setNivelGas(nivel.value)}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                  style={{
                    borderColor: isSelected
                      ? getNivelColor(nivel.value)
                      : "var(--color-kp-border)",
                    background: isSelected ? "var(--color-surface-0)" : "transparent",
                  }}
                >
                  <span
                    className="text-sm font-bold shrink-0 w-6 text-center"
                    style={{ color: getNivelColor(nivel.value) }}
                  >
                    {nivel.shortLabel}
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                    {descripcionNivel ?? nivel.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observación */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
            Observación <span style={{ color: "var(--color-ink-3)" }}>(opcional)</span>
          </label>
          <Textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            placeholder="Observaciones clínicas sobre el progreso…"
          />
        </div>

        {/* Estrategias */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
            Estrategias <span style={{ color: "var(--color-ink-3)" }}>(opcional)</span>
          </label>
          <Textarea
            value={estrategias}
            onChange={(e) => setEstrategias(e.target.value)}
            rows={2}
            placeholder="Estrategias utilizadas o planificadas…"
          />
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              color: "var(--color-kp-danger)",
              background: "var(--color-kp-danger-lt)",
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando…" : "Registrar progreso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
