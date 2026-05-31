"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { crearPlanIntervencion } from "@/app/actions/clinico/plan-intervencion";
import { PlanIntervencionPanel } from "./PlanIntervencionPanel";
import type { PlanIntervencion } from "@/types/plan-intervencion";

interface PlanIntervencionLauncherProps {
  patientId: string;
  encuentroId: string;
  planActivo?: PlanIntervencion | null;
  onPlanCreated?: (planId: string) => void;
}

export function PlanIntervencionLauncher({
  patientId,
  encuentroId,
  planActivo,
  onPlanCreated,
}: PlanIntervencionLauncherProps) {
  const session = useClinicaSession();
  const [panelOpen, setPanelOpen] = useState(false);
  const [planId, setPlanId] = useState<string | null>(planActivo?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session.config.modulosActivos.includes("M10_plan_intervencion")) return null;

  async function handleClick() {
    setError(null);
    if (planId) {
      setPanelOpen(true);
      return;
    }
    setLoading(true);
    const result = await crearPlanIntervencion({
      patientId,
      idEncuentroOrigen: encuentroId,
      titulo: "Plan de Intervención",
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const newPlanId = result.data.planId;
    setPlanId(newPlanId);
    onPlanCreated?.(newPlanId);
    setPanelOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
          style={{
            color: "var(--color-kp-accent)",
            borderColor: "var(--color-kp-accent)",
            background: "transparent",
          }}
        >
          <ClipboardList className="size-4" />
          {loading ? "Creando…" : planId ? "Ver plan" : "Crear plan de intervención"}
        </button>
        {error && (
          <p className="text-xs" style={{ color: "var(--color-kp-danger)" }}>
            {error}
          </p>
        )}
      </div>

      {panelOpen && planId && (
        <PlanIntervencionPanel
          planId={planId}
          patientId={patientId}
          encuentroId={encuentroId}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
