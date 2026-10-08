"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Trash2 } from "lucide-react";
import { createEncuentro, descartarEncuentro, type EncuentroEnProgreso } from "@/app/actions/encuentros";
import { getRutaEncuentro } from "@/lib/modules/modelos";
import { AlertBanner } from "@/components/ui/AlertBanner";

interface Props {
  patientId: string;
  especialidad: string;
  /** Atención en progreso del profesional para este paciente (si existe). */
  enProgreso?: EncuentroEnProgreso | null;
}

function horaSantiago(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago",
  });
}

export function EncuentroLauncher({ patientId, especialidad, enProgreso }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleIniciar() {
    setError(null);
    startTransition(async () => {
      if (enProgreso) {
        router.push(getRutaEncuentro(enProgreso.modelo, patientId, enProgreso.id));
        return;
      }
      const result = await createEncuentro(patientId, especialidad);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(getRutaEncuentro(result.data.modelo, patientId, result.data.encuentroId));
    });
  }

  function handleDescartar() {
    if (!enProgreso) return;
    setError(null);
    startTransition(async () => {
      const result = await descartarEncuentro(enProgreso.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const label = enProgreso
    ? `Continuar atención · ${horaSantiago(enProgreso.startedAt)}`
    : `Iniciar atención · ${especialidad}`;

  return (
    <div className="space-y-2">
      {error && <AlertBanner variant="danger">{error}</AlertBanner>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleIniciar}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-kp-accent text-white text-sm font-medium hover:bg-kp-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircle className="w-4 h-4" />
          {isPending ? "Cargando…" : label}
        </button>
        {enProgreso?.sinContenido && (
          <button
            type="button"
            onClick={handleDescartar}
            disabled={isPending}
            title="Descartar esta atención (no tiene registros)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-kp-border text-ink-2 text-xs font-medium hover:border-kp-danger hover:text-kp-danger transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Descartar
          </button>
        )}
      </div>
    </div>
  );
}
