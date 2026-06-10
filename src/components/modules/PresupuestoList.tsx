"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPresupuestos } from "@/app/actions/presupuestos";
import { useClinicaConfig } from "@/lib/modules/provider";
import type { Presupuesto } from "@/types/presupuesto";
import { PresupuestoForm } from "./PresupuestoForm";
import { exportPresupuestoPdf } from "./PresupuestoPdfView";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  idPaciente: string;
  idEncuentro?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function calcularTotal(p: Presupuesto): number {
  if (!p.items?.length) return 0;
  return p.items.reduce((sum, it) => sum + it.cantidad * it.precio_unitario, 0);
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PresupuestoList({ idPaciente, idEncuentro }: Props) {
  const config = useClinicaConfig();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | undefined>(undefined);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    loadPresupuestos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPaciente]);

  async function loadPresupuestos() {
    setLoading(true);
    setError(null);
    const result = await getPresupuestos(idPaciente);
    if (result.success) {
      setPresupuestos(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function handleNuevo() {
    setSelectedPresupuesto(undefined);
    setShowForm(true);
  }

  function handleSelect(p: Presupuesto) {
    setSelectedPresupuesto(p);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setSelectedPresupuesto(undefined);
    // Refresh list
    loadPresupuestos();
  }

  function handleFormCancel() {
    setShowForm(false);
    setSelectedPresupuesto(undefined);
  }

  async function handleExportarPdf(p: Presupuesto, e: React.MouseEvent) {
    e.stopPropagation();
    setExportingId(p.id);
    try {
      const clinicaNombre = config?.nombreDisplay ?? "";
      await exportPresupuestoPdf(p, clinicaNombre);
    } catch (err) {
      console.error("Error exportando PDF:", err);
    } finally {
      setExportingId(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>Cargando presupuestos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
          Presupuestos
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={handleNuevo}>
          <Plus size={14} className="mr-1" />
          Nuevo presupuesto
        </Button>
      </div>

      {/* Form (inline) */}
      {showForm && (
        <PresupuestoForm
          idPaciente={idPaciente}
          idEncuentro={idEncuentro}
          presupuesto={selectedPresupuesto}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Empty state */}
      {!showForm && presupuestos.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <FileText size={28} className="mx-auto opacity-30" style={{ color: "var(--color-ink-3)" }} />
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Sin presupuestos para este paciente.
          </p>
        </div>
      )}

      {/* List */}
      {presupuestos.length > 0 && (
        <ul className="space-y-2">
          {presupuestos.map((p) => {
            const isBorrador = p.estado === "borrador";
            const total = calcularTotal(p);
            return (
              <li
                key={p.id}
                className="rounded-xl border px-4 py-3 cursor-pointer transition-colors hover:bg-surface-0"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
                onClick={() => handleSelect(p)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-ink-1)" }}>
                        {p.titulo}
                      </span>
                      {/* Estado badge */}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={
                          isBorrador
                            ? { background: "#FEF9C3", color: "#92400E" }
                            : { background: "#DCFCE7", color: "#15803D" }
                        }
                      >
                        {isBorrador ? "Borrador" : "Enviado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: "var(--color-ink-1)" }}>
                        {formatCLP(total)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        {formatFecha(p.created_at)}
                      </span>
                      {p.items?.length !== undefined && (
                        <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                          {p.items.length} ítem{p.items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleExportarPdf(p, e)}
                    disabled={exportingId === p.id}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors shrink-0"
                    style={{
                      borderColor: "var(--color-kp-border)",
                      color: "var(--color-ink-2)",
                      background: "var(--color-surface-0)",
                    }}
                    title="Exportar PDF"
                  >
                    <Download size={12} />
                    {exportingId === p.id ? "..." : "PDF"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}
