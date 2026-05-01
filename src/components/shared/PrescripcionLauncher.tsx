"use client";

import { useState } from "react";
import { Pill } from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { PrescripcionForm } from "./PrescripcionForm";
import { PrescripcionDetalleModal } from "@/components/shared/PrescripcionDetalleModal";
import type { Patient } from "@/types/patient";

interface Props {
  patientId: string;
  encuentroId: string | null;
  paciente: Patient;
  onPrescripcionCreated?: (folio: string) => void;
}

export function PrescripcionLauncher({ patientId, encuentroId, paciente, onPrescripcionCreated }: Props) {
  const session = useClinicaSession();
  const [formOpen, setFormOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [lastFolio, setLastFolio] = useState<string | null>(null);

  if (!session.config.modulosActivos.includes("M7_prescripciones")) return null;
  if (!session.profesionalActivo?.puede_prescribir) return null;

  function handleSuccess(folio: string, prescripcionId: string) {
    setLastFolio(folio);
    setFormOpen(false);
    setDetalleId(prescripcionId);
    onPrescripcionCreated?.(folio);
  }

  return (
    <>
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
        style={{
          color: "var(--color-kp-accent)",
          borderColor: "var(--color-kp-accent)",
          background: "transparent",
        }}
      >
        <Pill className="size-4" />
        Prescribir
      </button>

      {lastFolio && (
        <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
          Última: {lastFolio}
        </p>
      )}

      {formOpen && (
        <PrescripcionForm
          patientId={patientId}
          encuentroId={encuentroId}
          profesional={session.profesionalActivo!}
          onClose={() => setFormOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {detalleId && (
        <PrescripcionDetalleModal
          prescripcionId={detalleId}
          paciente={paciente}
          clinica={session.config}
          onClose={() => setDetalleId(null)}
        />
      )}
    </>
  );
}
