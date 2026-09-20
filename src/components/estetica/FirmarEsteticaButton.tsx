"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, X } from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";

interface Resumen {
  zonasCount: number;
  fotosCount: number;
  tieneConsentimiento: boolean;
}

interface Props {
  disabled: boolean;
  onFirmar: () => Promise<void>;
  resumen: Resumen;
}

export function FirmarEsteticaButton({ disabled, onFirmar, resumen }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [firmando, setFirmando] = useState(false);

  async function handleConfirmar() {
    setFirmando(true);
    await onFirmar();
    setFirmando(false);
    setConfirmOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setConfirmOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        style={{ background: "var(--color-kp-accent)", color: "#fff" }}
      >
        <CheckCircle2 className="w-4 h-4" />
        Firmar ficha
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-xl"
            style={{ background: "var(--color-surface-1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-kp-border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink-1)" }}>
                Confirmar firma de ficha estética
              </h3>
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={firmando}>
                <X className="w-4 h-4" style={{ color: "var(--color-ink-3)" }} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <ul className="text-sm space-y-1.5" style={{ color: "var(--color-ink-2)" }}>
                <li>
                  <strong style={{ color: "var(--color-ink-1)" }}>{resumen.zonasCount}</strong>{" "}
                  {resumen.zonasCount === 1 ? "zona tratada" : "zonas tratadas"}
                </li>
                <li>
                  <strong style={{ color: "var(--color-ink-1)" }}>{resumen.fotosCount}</strong>{" "}
                  {resumen.fotosCount === 1 ? "fotografía registrada" : "fotografías registradas"}
                </li>
              </ul>

              {!resumen.tieneConsentimiento && (
                <AlertBanner variant="warning" title="Sin consentimiento de procedimiento estético">
                  El paciente no tiene un consentimiento firmado de tipo &ldquo;Procedimiento estético&rdquo;. Puedes
                  firmar igual, pero se recomienda registrarlo antes o inmediatamente después.
                </AlertBanner>
              )}

              <AlertBanner variant="info" title="Esta acción es irreversible">
                Una vez firmada, la ficha queda inmutable. Cualquier corrección posterior requiere una adenda desde
                el timeline del paciente.
              </AlertBanner>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={firmando}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={firmando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "var(--color-kp-accent)", color: "#fff" }}
                >
                  {firmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  Firmar ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
