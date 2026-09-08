"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useClinicaSession } from "@/lib/modules/provider";
import { EsteticaWorkspace } from "./EsteticaWorkspace";
import type { Patient } from "@/types/patient";

interface Props {
  patientId: string;
  encuentroId: string;
  paciente: Patient;
}

export function EsteticaLauncher({ patientId, encuentroId, paciente }: Props) {
  const session = useClinicaSession();
  const [open, setOpen] = useState(false);

  if (!session.config.modulosActivos.includes("M13_estetica")) return null;
  if (!session.profesionalActivo?.puede_estetica) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
        style={{ color: "var(--color-kp-accent)", borderColor: "var(--color-kp-accent)", background: "transparent" }}
      >
        <Sparkles className="size-4" />
        Ficha estética
      </button>

      {open && (
        <EsteticaWorkspace
          patientId={patientId}
          encuentroId={encuentroId}
          paciente={paciente}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
