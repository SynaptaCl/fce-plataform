"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { createEncuentro } from "@/app/actions/encuentros";
import { getRutaEncuentro } from "@/lib/modules/modelos";
import { AlertBanner } from "@/components/ui/AlertBanner";

interface Props {
  patientId: string;
  especialidad: string;
}

export function EncuentroLauncher({ patientId, especialidad }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleIniciar() {
    setError(null);
    startTransition(async () => {
      const result = await createEncuentro(patientId, especialidad);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const url = getRutaEncuentro(result.data.modelo, patientId, result.data.encuentroId);
      router.push(url);
    });
  }

  return (
    <div className="space-y-2">
      {error && <AlertBanner variant="danger">{error}</AlertBanner>}
      <button
        onClick={handleIniciar}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-kp-accent text-white text-sm font-medium hover:bg-kp-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlayCircle className="w-4 h-4" />
        {isPending ? "Iniciando…" : `Iniciar atención · ${especialidad}`}
      </button>
    </div>
  );
}
