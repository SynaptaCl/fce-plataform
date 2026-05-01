"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { OrdenExamenForm } from "./OrdenExamenForm";
import { OrdenExamenDetalleModal } from "@/components/shared/OrdenExamenDetalleModal";
import type { Patient } from "@/types/patient";

interface Props {
  patientId: string;
  encuentroId: string | null;
  paciente: Patient;
  onOrdenCreated?: (folio: string) => void;
}

export function OrdenExamenLauncher({
  patientId,
  encuentroId,
  paciente,
  onOrdenCreated,
}: Props) {
  const session = useClinicaSession();
  const [formOpen, setFormOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [lastFolio, setLastFolio] = useState<string | null>(null);

  const m8Activo = session.config.modulosActivos.includes("M8_examenes");
  const puedeIndicar = session.profesionalActivo?.puede_indicar_examenes === true;

  if (process.env.NODE_ENV === "development") {
    console.log("[OrdenExamenLauncher] modulosActivos:", session.config.modulosActivos);
    console.log("[OrdenExamenLauncher] profesionalActivo:", session.profesionalActivo);
    console.log("[OrdenExamenLauncher] m8Activo:", m8Activo, "| puedeIndicar:", puedeIndicar);
  }

  if (!m8Activo) return null;
  if (!puedeIndicar) return null;

  function handleSuccess(folio: string, ordenId: string) {
    setLastFolio(folio);
    setFormOpen(false);
    setDetalleId(ordenId);
    onOrdenCreated?.(folio);
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
        <ClipboardList className="size-4" />
        Indicar exámenes
      </button>

      {lastFolio && (
        <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
          Última: {lastFolio}
        </p>
      )}

      {formOpen && (
        <OrdenExamenForm
          patientId={patientId}
          encuentroId={encuentroId}
          profesional={session.profesionalActivo!}
          onClose={() => setFormOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {detalleId && (
        <OrdenExamenDetalleModal
          ordenId={detalleId}
          paciente={paciente}
          clinica={session.config}
          onClose={() => setDetalleId(null)}
        />
      )}
    </>
  );
}
