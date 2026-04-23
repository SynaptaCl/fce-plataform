"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createAndSignPrescripcion } from "@/app/actions/prescripciones";
import type { ProfesionalPerfil } from "@/lib/fce/profesional";
import type { MedicamentoPrescrito, TipoPrescripcion } from "@/types/prescripcion";
import { MedicamentoSelector } from "./MedicamentoSelector";
import { MedicamentoCard } from "./MedicamentoCard";
import { IndicacionGeneralEditor } from "./IndicacionGeneralEditor";
import { PrescripcionFirmaPanel } from "./PrescripcionFirmaPanel";

interface Props {
  patientId: string;
  encuentroId: string | null;
  profesional: ProfesionalPerfil;
  onClose: () => void;
  onSuccess: (folio: string) => void;
}

export function PrescripcionForm({ patientId, encuentroId, profesional, onClose, onSuccess }: Props) {
  const [tipo, setTipo] = useState<TipoPrescripcion>("farmacologica");
  const [medicamentos, setMedicamentos] = useState<MedicamentoPrescrito[]>([]);
  const [indicaciones, setIndicaciones] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [modoFirma, setModoFirma] = useState<"impresa" | "canvas">("impresa");
  const [firmaCanvas, setFirmaCanvas] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMedicamento(med: MedicamentoPrescrito) {
    setMedicamentos((prev) => [...prev, med]);
  }

  function updateMedicamento(index: number, updated: MedicamentoPrescrito) {
    setMedicamentos((prev) => prev.map((m, i) => i === index ? updated : m));
  }

  function removeMedicamento(index: number) {
    setMedicamentos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createAndSignPrescripcion({
        patientId,
        encuentroId,
        tipo,
        medicamentos: tipo === "farmacologica" ? medicamentos : null,
        indicacionesGenerales: indicaciones || null,
        diagnosticoAsociado: diagnostico || null,
        modoFirma,
        firmaCanvas: modoFirma === "canvas" ? firmaCanvas : null,
      });
      if (result.success) {
        onSuccess(result.data.folio);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
        style={{ background: "var(--surface-1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--kp-border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--ink-1)" }}>Nueva prescripción</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              {profesional.nombre} · {profesional.especialidad}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="size-4" style={{ color: "var(--ink-3)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Tipo toggle */}
          <div className="flex gap-2">
            {(["farmacologica", "indicacion_general"] as TipoPrescripcion[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                style={tipo === t ? {
                  background: "var(--color-kp-accent)",
                  color: "#fff",
                  borderColor: "var(--color-kp-accent)",
                } : {
                  background: "transparent",
                  color: "var(--ink-2)",
                  borderColor: "var(--kp-border)",
                }}
              >
                {t === "farmacologica" ? "Receta farmacológica" : "Indicación general"}
              </button>
            ))}
          </div>

          {/* Content by tipo */}
          {tipo === "farmacologica" ? (
            <div className="space-y-3">
              <MedicamentoSelector onSelect={addMedicamento} />
              {medicamentos.map((med, i) => (
                <MedicamentoCard
                  key={i}
                  medicamento={med}
                  onUpdate={(updated) => updateMedicamento(i, updated)}
                  onRemove={() => removeMedicamento(i)}
                />
              ))}
            </div>
          ) : (
            <IndicacionGeneralEditor value={indicaciones} onChange={setIndicaciones} />
          )}

          {/* Diagnóstico (siempre visible) */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              Diagnóstico asociado <span style={{ color: "var(--ink-3)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Ej: Cefalea tensional"
              className="w-full text-sm px-3 py-2 rounded-lg border"
              style={{ borderColor: "var(--kp-border)", color: "var(--ink-1)" }}
            />
          </div>

          {/* Indicaciones adicionales (solo si farmacologica) */}
          {tipo === "farmacologica" && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-2)" }}>
                Indicaciones adicionales <span style={{ color: "var(--ink-3)" }}>(opcional)</span>
              </label>
              <textarea
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                rows={3}
                placeholder="Ej: Tomar con abundante agua. Evitar alcohol."
                className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
                style={{ borderColor: "var(--kp-border)", color: "var(--ink-1)" }}
              />
            </div>
          )}

          <PrescripcionFirmaPanel
            modoFirma={modoFirma}
            onModoChange={setModoFirma}
            onFirmaChange={setFirmaCanvas}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--kp-border)" }}>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          {!error && <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--kp-border)", color: "var(--ink-2)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-kp-accent)" }}
            >
              {submitting ? "Emitiendo..." : "Firmar y emitir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
