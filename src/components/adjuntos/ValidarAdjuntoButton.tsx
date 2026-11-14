"use client";

/**
 * ADJ-1 — ValidarAdjuntoButton: modal de validación profesional.
 * Si el adjunto está vinculado a una orden M8, permite actualizar
 * estado_resultados (parcial/completo) en el mismo paso.
 */

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { validarAdjunto } from "@/app/actions/adjuntos";
import type { Adjunto } from "@/types/adjunto";

interface Props {
  adjunto: Adjunto;
  onValidado: () => void;
}

export function ValidarAdjuntoButton({ adjunto, onValidado }: Props) {
  const [open, setOpen] = useState(false);
  const [estadoResultados, setEstadoResultados] = useState<"completo" | "parcial" | "">("completo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setBusy(true);
    setError(null);
    const res = await validarAdjunto(adjunto.id, estadoResultados || null);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setOpen(false);
    onValidado();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium"
        style={{ color: "var(--color-kp-success, #16a34a)" }}
      >
        <CheckCircle2 className="size-3.5" />
        Validar
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Validar adjunto"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.6)" }}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-5 space-y-4"
            style={{ background: "var(--color-surface-1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold" style={{ color: "var(--color-ink-1)" }}>
              Validar adjunto
            </h3>
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              {adjunto.descripcion ?? adjunto.nombre_archivo_original} — al validar, el archivo pasa
              a formar parte del contenido clínico del paciente.
            </p>

            {adjunto.id_orden_examen && (
              <label className="block">
                <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-2)" }}>
                  Resultados de la orden vinculada
                </span>
                <select
                  value={estadoResultados}
                  onChange={(e) => setEstadoResultados(e.target.value as "completo" | "parcial" | "")}
                  disabled={busy}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-1)" }}
                >
                  <option value="completo">Marcar orden como completa</option>
                  <option value="parcial">Marcar orden como parcial</option>
                  <option value="">No cambiar la orden</option>
                </select>
              </label>
            )}

            {error && (
              <p className="text-sm" style={{ color: "var(--color-kp-danger)" }} role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-3 py-1.5 text-sm rounded-lg border font-medium"
                style={{ borderColor: "var(--color-kp-border)", color: "var(--color-ink-2)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={busy}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-semibold text-white"
                style={{ background: "var(--color-kp-success, #16a34a)" }}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Confirmar validación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
