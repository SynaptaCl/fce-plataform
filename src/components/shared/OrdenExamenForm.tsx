"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createAndSignOrdenExamen } from "@/app/actions/ordenes-examen";
import type { ProfesionalPerfil } from "@/lib/fce/profesional";
import type { ExamenIndicado } from "@/types/orden-examen";
import { ExamenSelector } from "@/components/shared/ExamenSelector";
import { ExamenCard } from "@/components/shared/ExamenCard";
import { OrdenExamenFirmaPanel } from "@/components/shared/OrdenExamenFirmaPanel";

interface Props {
  patientId: string;
  encuentroId: string | null;
  profesional: ProfesionalPerfil;
  onClose: () => void;
  onSuccess: (folio: string, ordenId: string) => void;
}

export function OrdenExamenForm({
  patientId,
  encuentroId,
  profesional,
  onClose,
  onSuccess,
}: Props) {
  const [examenes, setExamenes] = useState<ExamenIndicado[]>([]);
  const [diagnostico, setDiagnostico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [prioridad, setPrioridad] = useState<"normal" | "urgente">("normal");
  const [modoFirma, setModoFirma] = useState<"impresa" | "canvas">("impresa");
  const [firmaCanvas, setFirmaCanvas] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExamen(examen: ExamenIndicado) {
    setExamenes((prev) => [...prev, examen]);
  }

  function updateExamen(index: number, updated: ExamenIndicado) {
    setExamenes((prev) => prev.map((e, i) => (i === index ? updated : e)));
  }

  function removeExamen(index: number) {
    setExamenes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createAndSignOrdenExamen({
        patientId,
        encuentroId,
        examenes,
        diagnostico_presuntivo: diagnostico || null,
        observaciones: observaciones || null,
        prioridad,
        modoFirma,
        firmaCanvas: modoFirma === "canvas" ? firmaCanvas : null,
      });
      if (result.success) {
        onSuccess(result.data.folio_display, result.data.id);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
        style={{ background: "var(--color-surface-1)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--color-ink-1)" }}
            >
              Nueva orden de exámenes
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
              {profesional.nombre} · {profesional.especialidad}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="size-4" style={{ color: "var(--color-ink-3)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Buscador de exámenes */}
          <ExamenSelector onSelect={addExamen} />

          {/* Lista de exámenes indicados */}
          {examenes.length > 0 ? (
            <div className="space-y-3">
              {examenes.map((examen, i) => (
                <ExamenCard
                  key={i}
                  examen={examen}
                  onUpdate={(updated) => updateExamen(i, updated)}
                  onRemove={() => removeExamen(i)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "var(--color-ink-3)" }}>
              Agregue al menos un examen usando el buscador
            </p>
          )}

          {/* Diagnóstico presuntivo */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--color-ink-2)" }}
            >
              Diagnóstico presuntivo{" "}
              <span style={{ color: "var(--color-ink-3)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Ej: Hipotiroidismo"
              className="w-full text-sm px-3 py-2 rounded-lg border"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
            />
          </div>

          {/* Observaciones para el laboratorio */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--color-ink-2)" }}
            >
              Observaciones para el laboratorio{" "}
              <span style={{ color: "var(--color-ink-3)" }}>(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
            />
          </div>

          {/* Prioridad */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: "var(--color-ink-2)" }}
            >
              Prioridad
            </label>
            <div className="flex gap-2">
              {(["normal", "urgente"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPrioridad(p)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border capitalize"
                  style={
                    prioridad === p
                      ? {
                          background: "var(--color-kp-accent)",
                          color: "#fff",
                          borderColor: "var(--color-kp-accent)",
                        }
                      : {
                          background: "transparent",
                          color: "var(--color-ink-2)",
                          borderColor: "var(--color-kp-border)",
                        }
                  }
                >
                  {p === "normal" ? "Normal" : "Urgente"}
                </button>
              ))}
            </div>
          </div>

          {/* Firma */}
          <OrdenExamenFirmaPanel
            modoFirma={modoFirma}
            onModoChange={setModoFirma}
            onFirmaChange={setFirmaCanvas}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: "var(--color-kp-border)" }}
        >
          {error ? (
            <p className="text-xs" style={{ color: "#dc2626" }}>
              {error}
            </p>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={examenes.length === 0 || submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-kp-accent)" }}
            >
              {submitting ? "Emitiendo..." : "Firmar y emitir orden"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
