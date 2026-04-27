"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { reingresarPaciente } from "@/app/actions/egresos";

// ── Props ────────────────────────────────────────────────────────────────────

interface ReingresoBannerProps {
  patientId: string;
  egresoFirmadoAt?: string | null;
  tipoEgreso?: string | null;
}

// ── Labels ───────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  alta_clinica: "Alta clínica",
  abandono: "Abandono de tratamiento",
  derivacion: "Derivación",
  fallecimiento: "Fallecimiento",
  otro: "Otro",
};

// ── Componente ───────────────────────────────────────────────────────────────

export function ReingresoBanner({
  patientId,
  egresoFirmadoAt,
  tipoEgreso,
}: ReingresoBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const tipoLabel = tipoEgreso ? (TIPO_LABELS[tipoEgreso] ?? tipoEgreso) : null;

  const fechaEgreso = egresoFirmadoAt
    ? new Date(egresoFirmadoAt).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  function handleConfirmar() {
    setError(null);
    startTransition(async () => {
      const result = await reingresarPaciente(patientId);
      if (!result.success) {
        setError(result.error);
        setShowConfirm(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <AlertBanner variant="warning" title={`Paciente egresado${tipoLabel ? ` — ${tipoLabel}` : ""}`}>
        <div className="space-y-2">
          {fechaEgreso && (
            <p className="text-sm">Egresado el {fechaEgreso}.</p>
          )}

          {error && (
            <p className="text-sm font-medium text-red-700">{error}</p>
          )}

          {!showConfirm ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
            >
              Reingresar paciente
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-1">
                ¿Confirma el reingreso del paciente? Esta acción cambiará su estado a activo.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmar}
                  disabled={isPending}
                >
                  {isPending ? "Reingresando…" : "Sí, reingresar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </AlertBanner>
    </div>
  );
}
