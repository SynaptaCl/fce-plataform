"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card } from "@/components/ui/Card";
import { SignatureCanvas } from "@/components/shared/ConsentManager";
import {
  crearConsentimientoGrabacionPresencial,
  revocarConsentimientoGrabacion,
} from "@/app/actions/ambient/consentimiento";

const TEXTO_LEGAL = `Autorizo que mi consulta sea grabada y transcrita automáticamente, y que el texto resultante sea procesado por un sistema de inteligencia artificial con el único fin de generar un borrador de mi nota clínica, que será revisado y firmado por el profesional tratante.

La grabación no se almacena. El procesamiento involucra a proveedores fuera de Chile bajo contrato de tratamiento de datos. Puedo revocar esta autorización en cualquier momento, sin que ello afecte mi atención.`;

export interface AmbientConsentEstado {
  firmado: boolean;
  version: number;
  createdAt: string | null;
}

interface AmbientConsentPanelProps {
  patientId: string;
  estado: AmbientConsentEstado | null;
}

type Step = "resumen" | "capturar" | "revocar-confirmar";

export function AmbientConsentPanel({ patientId, estado }: AmbientConsentPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("resumen");
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vigente = estado?.firmado === true;

  const handleCapturar = async () => {
    if (!firmaDataUrl) return;
    setLoading(true);
    setError(null);
    const result = await crearConsentimientoGrabacionPresencial(patientId, firmaDataUrl);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setFirmaDataUrl(null);
    setStep("resumen");
    router.refresh();
  };

  const handleRevocar = async () => {
    setLoading(true);
    setError(null);
    const result = await revocarConsentimientoGrabacion(patientId);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setStep("resumen");
    router.refresh();
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        {vigente ? (
          <Mic className="w-5 h-5 text-kp-success" />
        ) : (
          <MicOff className="w-5 h-5 text-ink-3" />
        )}
        <h3 className="text-sm font-bold text-ink-1">Consentimiento de grabación (Ambient Scribe)</h3>
      </div>

      {error && <AlertBanner variant="danger">{error}</AlertBanner>}

      {step === "resumen" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-3">
            {vigente
              ? `Consentimiento vigente — versión ${estado?.version}${estado?.createdAt ? ` · ${new Date(estado.createdAt).toLocaleDateString("es-CL")}` : ""}.`
              : "El paciente no tiene consentimiento vigente de grabación. Ambient Scribe permanece deshabilitado hasta registrarlo."}
          </p>
          {vigente ? (
            <Button variant="ghost" size="sm" onClick={() => setStep("revocar-confirmar")}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Revocar consentimiento
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setStep("capturar")}>
              <Mic className="w-3.5 h-3.5 mr-1.5" />
              Registrar consentimiento presencial
            </Button>
          )}
        </div>
      )}

      {step === "capturar" && (
        <div className="space-y-4">
          <div className="bg-surface-0 border border-kp-border rounded-xl p-4">
            <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">{TEXTO_LEGAL}</p>
            <p className="text-[11px] text-ink-3 mt-2">
              Puede agendar/atenderse igualmente si no autoriza. Solicitar la firma del paciente a continuación.
            </p>
          </div>

          {firmaDataUrl ? (
            <div className="space-y-3">
              <p className="text-xs text-kp-primary font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Firma capturada
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firmaDataUrl} alt="Firma paciente" className="border border-kp-border rounded-lg max-h-40" />
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setFirmaDataUrl(null)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Repetir firma
                </Button>
                <Button variant="primary" size="sm" onClick={handleCapturar} disabled={loading}>
                  {loading ? "Guardando..." : "Confirmar consentimiento"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setStep("resumen"); setFirmaDataUrl(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <SignatureCanvas onSign={setFirmaDataUrl} onClear={() => setFirmaDataUrl(null)} />
          )}
        </div>
      )}

      {step === "revocar-confirmar" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-kp-warning-lt border border-amber-200 rounded-lg p-3">
            <ShieldAlert className="w-4 h-4 text-kp-warning shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              Al revocar, ninguna consulta futura de este paciente podrá grabarse hasta registrar un
              nuevo consentimiento. Efecto inmediato.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("resumen")} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={handleRevocar} disabled={loading}>
              {loading ? "Revocando..." : "Confirmar revocación"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
