"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getInformes } from "@/app/actions/informes";
import { useClinicaConfig } from "@/lib/modules/provider";
import type { InformeClinico, TipoInforme } from "@/types/informe";
import { InformeForm } from "./InformeForm";
import { exportInformePdf } from "./InformePdfView";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoInforme, string> = {
  isapre: "Isapre",
  colegio: "Colegio",
  laboral: "Laboral",
  judicial: "Judicial",
  otro: "Otro",
};

const TIPO_BADGE_STYLES: Record<TipoInforme, { background: string; color: string }> = {
  isapre:  { background: "#DBEAFE", color: "#1D4ED8" },
  colegio: { background: "#EDE9FE", color: "#5B21B6" },
  laboral: { background: "#FEF3C7", color: "#92400E" },
  judicial:{ background: "#FEE2E2", color: "#991B1B" },
  otro:    { background: "#F1F5F9", color: "#475569" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  idPaciente: string;
  idEncuentro?: string;
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

export function InformeList({ idPaciente, idEncuentro }: Props) {
  const config = useClinicaConfig();
  const [informes, setInformes] = useState<InformeClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedInforme, setSelectedInforme] = useState<InformeClinico | undefined>(undefined);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    loadInformes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPaciente]);

  async function loadInformes() {
    setLoading(true);
    setError(null);
    const result = await getInformes(idPaciente);
    if (result.success) {
      setInformes(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function handleNuevo() {
    setSelectedInforme(undefined);
    setShowForm(true);
  }

  function handleSelect(i: InformeClinico) {
    setSelectedInforme(i);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setSelectedInforme(undefined);
    loadInformes();
  }

  function handleFormCancel() {
    setShowForm(false);
    setSelectedInforme(undefined);
  }

  async function handleExportarPdf(i: InformeClinico, e: React.MouseEvent) {
    e.stopPropagation();
    setExportingId(i.id);
    try {
      const clinicaNombre = config?.nombreDisplay ?? "";
      await exportInformePdf(i, clinicaNombre);
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
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>Cargando informes...</p>
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
          Informes clínicos
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={handleNuevo}>
          <Plus size={14} className="mr-1" />
          Nuevo informe
        </Button>
      </div>

      {/* Form (inline) */}
      {showForm && (
        <InformeForm
          idPaciente={idPaciente}
          idEncuentro={idEncuentro}
          informe={selectedInforme}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Empty state */}
      {!showForm && informes.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <FileText size={28} className="mx-auto opacity-30" style={{ color: "var(--color-ink-3)" }} />
          <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
            Sin informes clínicos para este paciente.
          </p>
        </div>
      )}

      {/* List */}
      {informes.length > 0 && (
        <ul className="space-y-2">
          {informes.map((i) => {
            const isBorrador = !i.firmado;
            const tipoBadge = TIPO_BADGE_STYLES[i.tipo];
            return (
              <li
                key={i.id}
                className="rounded-xl border px-4 py-3 cursor-pointer transition-colors hover:bg-surface-0"
                style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-1)" }}
                onClick={() => handleSelect(i)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Tipo badge */}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                        style={tipoBadge}
                      >
                        {TIPO_LABELS[i.tipo]}
                      </span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-ink-1)" }}>
                        {i.titulo}
                      </span>
                      {/* Estado badge */}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                        style={
                          isBorrador
                            ? { background: "#FEF9C3", color: "#92400E" }
                            : { background: "#DCFCE7", color: "#15803D" }
                        }
                      >
                        {isBorrador ? "Borrador" : "Firmado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {i.destinatario && (
                        <span className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                          Para: {i.destinatario}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        {formatFecha(i.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleExportarPdf(i, e)}
                    disabled={exportingId === i.id}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors shrink-0"
                    style={{
                      borderColor: "var(--color-kp-border)",
                      color: "var(--color-ink-2)",
                      background: "var(--color-surface-0)",
                    }}
                    title="Exportar PDF"
                  >
                    <Download size={12} />
                    {exportingId === i.id ? "..." : "PDF"}
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
