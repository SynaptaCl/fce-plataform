"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getPlanesIntervencion,
  crearPlanIntervencion,
} from "@/app/actions/clinico/plan-intervencion";
import { PlanIntervencionPanel } from "./PlanIntervencionPanel";
import type { EstadoPlanIntervencion, PlanIntervencion } from "@/types/plan-intervencion";

// ── Constants ─────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoPlanIntervencion, { label: string; bg: string; color: string }> = {
  borrador: { label: "Borrador", bg: "#F1F5F9", color: "#475569" },
  activo: { label: "Activo", bg: "#DCFCE7", color: "#15803D" },
  en_revision: { label: "En revisión", bg: "#FEF9C3", color: "#92400E" },
  cerrado: { label: "Cerrado", bg: "#E5E7EB", color: "#4B5563" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  idPaciente: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanesIntervencionList({ idPaciente }: Props) {
  const [planes, setPlanes] = useState<PlanIntervencion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPaciente]);

  async function loadPlanes() {
    setLoading(true);
    setError(null);
    const result = await getPlanesIntervencion(idPaciente);
    if (result.success) {
      setPlanes(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleNuevo() {
    setError(null);
    setCreando(true);
    const result = await crearPlanIntervencion({
      patientId: idPaciente,
      titulo: "Plan de Intervención",
    });
    setCreando(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpenPlanId(result.data.planId);
  }

  function handlePanelClose() {
    setOpenPlanId(null);
    loadPlanes();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>Cargando planes de intervención...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          Planes de intervención
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={handleNuevo} disabled={creando}>
          <Plus size={14} className="mr-1" />
          {creando ? "Creando..." : "Nuevo plan"}
        </Button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>
      )}

      {/* Empty state */}
      {planes.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <ClipboardList size={28} className="mx-auto opacity-30" style={{ color: "var(--color-ink-3)" }} />
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Sin planes de intervención para este paciente.
          </p>
        </div>
      )}

      {/* List */}
      {planes.length > 0 && (
        <ul className="space-y-2">
          {planes.map((p) => {
            const badge = ESTADO_BADGE[p.estado];
            return (
              <li
                key={p.id}
                className="rounded-xl border px-4 py-3 cursor-pointer transition-colors hover:bg-surface-0"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
                onClick={() => setOpenPlanId(p.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-ink-1)" }}>
                        {p.titulo}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      {p.firmado && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: "#DCFCE7", color: "#15803D" }}
                        >
                          Firmado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {p.diagnostico && (
                        <span className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                          {p.diagnostico}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        Inicio: {formatFecha(p.fecha_inicio)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openPlanId && (
        <PlanIntervencionPanel
          planId={openPlanId}
          patientId={idPaciente}
          onClose={handlePanelClose}
        />
      )}
    </div>
  );
}
