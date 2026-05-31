"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { upsertObjetivo } from "@/app/actions/clinico/plan-intervencion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PlanObjetivo, NivelGAS, PrioridadObjetivo } from "@/types/plan-intervencion";

// ── Schema ────────────────────────────────────────────────────────────────────

const objetivoSchema = z.object({
  dominio_codigo: z.string().min(1, "El dominio es requerido"),
  dominio_label: z.string().min(1, "La etiqueta de dominio es requerida"),
  descripcion: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  criterio_logro: z.string().optional(),
  gas_menos_2: z.string().optional(),
  gas_menos_1: z.string().optional(),
  gas_0: z.string().min(1, "El resultado esperado (0) es requerido"),
  gas_mas_1: z.string().optional(),
  gas_mas_2: z.string().optional(),
  // String selects — cast on submit
  nivel_basal: z.string(),
  prioridad: z.enum(["alta", "media", "baja"]),
});

type ObjetivoFormValues = z.infer<typeof objetivoSchema>;

// Validated casts — select values are strings, these are safe after schema validation
function toNivelGAS(s: string): NivelGAS {
  return Number(s) as NivelGAS;
}
function toPrioridad(s: string): PrioridadObjetivo {
  return s as PrioridadObjetivo;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ObjetivoEditorProps {
  planId: string;
  patientId: string;
  objetivo?: PlanObjetivo;
  dominiosDisponibles?: { codigo: string; label: string }[];
  onGuardado: (objetivo: PlanObjetivo) => void;
  onClose: () => void;
}

const GAS_LABELS: Record<string, string> = {
  gas_menos_2: "Resultado mucho peor que lo esperado (-2)",
  gas_menos_1: "Resultado algo peor que lo esperado (-1)",
  gas_0: "Resultado esperado (0)",
  gas_mas_1: "Resultado algo mejor que lo esperado (+1)",
  gas_mas_2: "Resultado mucho mejor que lo esperado (+2)",
};

const NIVEL_BASAL_OPTIONS: { value: NivelGAS; label: string }[] = [
  { value: -2, label: "-2 — Mucho peor" },
  { value: -1, label: "-1 — Algo peor" },
  { value: 0, label: "0 — Esperado" },
  { value: 1, label: "+1 — Algo mejor" },
  { value: 2, label: "+2 — Mucho mejor" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ObjetivoEditor({
  planId,
  objetivo,
  dominiosDisponibles,
  onGuardado,
  onClose,
}: ObjetivoEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ObjetivoFormValues>({
    resolver: zodResolver(objetivoSchema),
    defaultValues: {
      dominio_codigo: objetivo?.dominio_codigo ?? "",
      dominio_label: objetivo?.dominio_label ?? "",
      descripcion: objetivo?.descripcion ?? "",
      criterio_logro: objetivo?.criterio_logro ?? "",
      gas_menos_2: objetivo?.gas_menos_2 ?? "",
      gas_menos_1: objetivo?.gas_menos_1 ?? "",
      gas_0: objetivo?.gas_0 ?? "",
      gas_mas_1: objetivo?.gas_mas_1 ?? "",
      gas_mas_2: objetivo?.gas_mas_2 ?? "",
      nivel_basal: String(objetivo?.nivel_basal ?? -1),
      prioridad: objetivo?.prioridad ?? "media",
    },
  });

  async function onSubmit(values: ObjetivoFormValues) {
    setServerError(null);
    const result = await upsertObjetivo(planId, {
      ...(objetivo?.id ? { id: objetivo.id } : {}),
      dominio_codigo: values.dominio_codigo,
      dominio_label: values.dominio_label,
      descripcion: values.descripcion,
      criterio_logro: values.criterio_logro || undefined,
      gas_menos_2: values.gas_menos_2 || undefined,
      gas_menos_1: values.gas_menos_1 || undefined,
      gas_0: values.gas_0,
      gas_mas_1: values.gas_mas_1 || undefined,
      gas_mas_2: values.gas_mas_2 || undefined,
      nivel_basal: toNivelGAS(values.nivel_basal),
      prioridad: toPrioridad(values.prioridad),
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    // Build a partial PlanObjetivo to return upstream
    const saved: PlanObjetivo = {
      id: result.data.id,
      id_clinica: objetivo?.id_clinica ?? "",
      id_paciente: objetivo?.id_paciente ?? "",
      id_plan: planId,
      dominio_codigo: values.dominio_codigo,
      dominio_label: values.dominio_label,
      descripcion: values.descripcion,
      criterio_logro: values.criterio_logro ?? null,
      gas_menos_2: values.gas_menos_2 ?? null,
      gas_menos_1: values.gas_menos_1 ?? null,
      gas_0: values.gas_0,
      gas_mas_1: values.gas_mas_1 ?? null,
      gas_mas_2: values.gas_mas_2 ?? null,
      nivel_basal: toNivelGAS(values.nivel_basal),
      nivel_actual: objetivo?.nivel_actual ?? toNivelGAS(values.nivel_basal),
      prioridad: toPrioridad(values.prioridad),
      estado: objetivo?.estado ?? "activo",
      responsable_principal: objetivo?.responsable_principal ?? null,
      orden: objetivo?.orden ?? 0,
      created_by: objetivo?.created_by ?? "",
      created_at: objetivo?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onGuardado(saved);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6"
        style={{ background: "var(--color-surface-1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--color-ink-1)" }}>
            {objetivo ? "Editar objetivo" : "Agregar objetivo"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:opacity-70"
            style={{ color: "var(--color-ink-3)" }}
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Dominio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
              Dominio
            </label>
            {dominiosDisponibles && dominiosDisponibles.length > 0 ? (
              <>
                <select
                  {...register("dominio_codigo")}
                  className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-kp-border)",
                    color: "var(--color-ink-1)",
                    background: "var(--color-surface-1)",
                  }}
                  onChange={(e) => {
                    // sync dominio_label from selected option label
                    const selected = dominiosDisponibles.find((d) => d.codigo === e.target.value);
                    if (selected) {
                      const labelInput = document.querySelector<HTMLInputElement>(
                        '[name="dominio_label"]'
                      );
                      if (labelInput) labelInput.value = selected.label;
                    }
                  }}
                >
                  <option value="">Seleccionar dominio…</option>
                  {dominiosDisponibles.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input type="hidden" {...register("dominio_label")} />
              </>
            ) : (
              <div className="flex gap-2">
                <Input
                  {...register("dominio_codigo")}
                  placeholder="Código (ej: motor)"
                  className="flex-1"
                />
                <Input
                  {...register("dominio_label")}
                  placeholder="Etiqueta (ej: Motor)"
                  className="flex-1"
                />
              </div>
            )}
            {errors.dominio_codigo && (
              <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
                {errors.dominio_codigo.message}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
              Descripción del objetivo <span style={{ color: "var(--color-kp-danger)" }}>*</span>
            </label>
            <Textarea
              {...register("descripcion")}
              rows={3}
              placeholder="Descripción clara del objetivo terapéutico…"
            />
            {errors.descripcion && (
              <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
                {errors.descripcion.message}
              </p>
            )}
          </div>

          {/* Criterio de logro */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
              Criterio de logro
            </label>
            <Textarea
              {...register("criterio_logro")}
              rows={2}
              placeholder="¿Cómo se medirá que el objetivo fue alcanzado?"
            />
          </div>

          {/* Niveles GAS */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
              Niveles GAS (Goal Attainment Scaling)
            </p>
            {(
              [
                "gas_menos_2",
                "gas_menos_1",
                "gas_0",
                "gas_mas_1",
                "gas_mas_2",
              ] as const
            ).map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "var(--color-ink-3)" }}>
                  {GAS_LABELS[key]}
                  {key === "gas_0" && (
                    <span style={{ color: "var(--color-kp-danger)" }}> *</span>
                  )}
                </label>
                <Input
                  {...register(key)}
                  placeholder={GAS_LABELS[key]}
                />
                {key === "gas_0" && errors.gas_0 && (
                  <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
                    {errors.gas_0.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Nivel basal + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
                Nivel basal
              </label>
              <select
                {...register("nivel_basal")}
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderColor: "var(--color-kp-border)",
                  color: "var(--color-ink-1)",
                  background: "var(--color-surface-1)",
                }}
              >
                {NIVEL_BASAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
                Prioridad
              </label>
              <select
                {...register("prioridad")}
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderColor: "var(--color-kp-border)",
                  color: "var(--color-ink-1)",
                  background: "var(--color-surface-1)",
                }}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: "var(--color-kp-danger)", background: "var(--color-kp-danger-lt)" }}>
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar objetivo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
