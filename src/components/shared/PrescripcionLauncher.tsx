"use client";

import { useState } from "react";
import { Pill } from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { PrescripcionForm } from "./PrescripcionForm";

interface Props {
  patientId: string;
  encuentroId: string | null;
  onPrescripcionCreated?: (folio: string) => void;
}

export function PrescripcionLauncher({ patientId, encuentroId, onPrescripcionCreated }: Props) {
  const session = useClinicaSession();
  const [open, setOpen] = useState(false);
  const [lastFolio, setLastFolio] = useState<string | null>(null);

  if (!session.config.modulosActivos.includes("M7_prescripciones")) return null;
  if (!session.profesionalActivo?.puede_prescribir) return null;

  function handleSuccess(folio: string) {
    setLastFolio(folio);
    setOpen(false);
    onPrescripcionCreated?.(folio);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
        <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
          Última: {lastFolio}
        </p>
      )}

      {open && (
        <PrescripcionForm
          patientId={patientId}
          encuentroId={encuentroId}
          profesional={session.profesionalActivo!}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
