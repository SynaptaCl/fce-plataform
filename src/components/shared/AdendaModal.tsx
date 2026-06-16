"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearAdenda } from "@/app/actions/adendas";
import type { TipoAdenda, AdendaTarget } from "@/types/adenda";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES_AUTORIZADORES = ["director", "admin", "superadmin"];
const VENTANA_ERRATA_MS = 72 * 60 * 60 * 1000;

// ── Label helpers ─────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoAdenda, string> = {
  adenda: "Adenda",
  errata: "Errata",
  anulacion: "Anulación",
};

const TIPO_DESCRIPCION: Record<TipoAdenda, string> = {
  adenda: "Complementar la nota",
  errata: "Corregir un error",
  anulacion: "Invalidar la nota",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdendaModalProps {
  open: boolean;
  onClose: () => void;
  target: AdendaTarget;
  idPaciente: string;
  profesionalIdActual: string;
  rolActual: string;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdendaModal({
  open,
  onClose,
  target,
  idPaciente,
  profesionalIdActual,
  rolActual,
  onSuccess,
}: AdendaModalProps) {
  if (!open) return null;

  return (
    <AdendaModalInner
      onClose={onClose}
      target={target}
      idPaciente={idPaciente}
      profesionalIdActual={profesionalIdActual}
      rolActual={rolActual}
      onSuccess={onSuccess}
    />
  );
}

// ── Inner component (always mounted when open) ────────────────────────────────
// Separate so hooks aren't called conditionally.

interface InnerProps {
  onClose: () => void;
  target: AdendaTarget;
  idPaciente: string;
  profesionalIdActual: string;
  rolActual: string;
  onSuccess: () => void;
}

function AdendaModalInner({
  onClose,
  target,
  idPaciente,
  profesionalIdActual,
  rolActual,
  onSuccess,
}: InnerProps) {
  // ── Permission logic (UX-only — server always revalidates) ─────────────────
  const esAutorizador = ROLES_AUTORIZADORES.includes(rolActual);
  const esAutorOriginal = target.createdBy === profesionalIdActual;
  const firmadoAt = target.firmadoAt ? new Date(target.firmadoAt).getTime() : 0;
  // UX preview only — server always revalidates actual permissions
  // eslint-disable-next-line react-hooks/purity
  const dentroVentana = Date.now() - firmadoAt <= VENTANA_ERRATA_MS;

  const puedeErrata = esAutorOriginal || esAutorizador;
  const puedeAnulacion = esAutorizador;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [tipoAdenda, setTipoAdenda] = useState<TipoAdenda>("adenda");
  const [motivo, setMotivo] = useState("");
  const [contenido, setContenido] = useState("");
  const [overrideMotivo, setOverrideMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Derived ────────────────────────────────────────────────────────────────
  const necesitaOverride =
    (tipoAdenda === "errata" && !dentroVentana && esAutorizador) ||
    tipoAdenda === "anulacion";

  const errataBloqueada =
    tipoAdenda === "errata" && !dentroVentana && !esAutorizador;

  const submitDisabled =
    isPending ||
    errataBloqueada ||
    !motivo.trim() ||
    !contenido.trim() ||
    (necesitaOverride && !overrideMotivo.trim());

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTipoChange(tipo: TipoAdenda) {
    setTipoAdenda(tipo);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await crearAdenda({
        tipoDocumento: target.tipoDocumento,
        idDocumento: target.idDocumento,
        idPaciente,
        idEncuentro: target.idEncuentro,
        tipoAdenda,
        motivo,
        contenido,
        overrideMotivo: necesitaOverride ? overrideMotivo : undefined,
      });
      if (result.success) {
        router.refresh();
        onSuccess();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl flex flex-col overflow-hidden"
        style={{ background: "var(--color-surface-1)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-kp-border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "var(--color-kp-accent-xs, rgba(0,176,168,0.1))" }}
            >
              <PenLine
                className="w-4 h-4"
                style={{ color: "var(--color-kp-accent)" }}
              />
            </span>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--color-ink-1)" }}
            >
              Agregar adenda / corrección
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--color-ink-3)" }}
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form (body + footer) ── */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 max-h-[60vh]">

            {/* Tipo selector */}
            <div>
              <p
                className="text-[0.65rem] font-semibold uppercase tracking-wide mb-2"
                style={{ color: "var(--color-ink-3)" }}
              >
                Tipo de anotación
              </p>
              <div className="flex gap-2">
                {(["adenda", "errata", "anulacion"] as TipoAdenda[]).map((tipo) => {
                  const isDisabled =
                    (tipo === "errata" && !puedeErrata) ||
                    (tipo === "anulacion" && !puedeAnulacion);
                  const isSelected = tipoAdenda === tipo;

                  const tooltip = isDisabled
                    ? tipo === "errata"
                      ? "No tienes permiso para corregir esta nota"
                      : "Solo un director puede anular"
                    : undefined;

                  return (
                    <button
                      key={tipo}
                      type="button"
                      disabled={isDisabled}
                      title={tooltip}
                      onClick={() => !isDisabled && handleTipoChange(tipo)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all",
                        isDisabled && "opacity-40 cursor-not-allowed"
                      )}
                      style={
                        isSelected
                          ? {
                              background:
                                "var(--color-kp-accent-xs, rgba(0,176,168,0.08))",
                              borderColor: "var(--color-kp-accent)",
                              color: "var(--color-kp-accent)",
                            }
                          : {
                              background: "transparent",
                              borderColor: "var(--color-kp-border)",
                              color: "var(--color-ink-2)",
                            }
                      }
                    >
                      <span className="font-semibold">{TIPO_LABEL[tipo]}</span>
                      <span
                        className="text-[0.6rem] font-normal"
                        style={{
                          color: isSelected
                            ? "var(--color-kp-accent)"
                            : "var(--color-ink-3)",
                        }}
                      >
                        {TIPO_DESCRIPCION[tipo]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning: errata fuera de ventana — autorizador */}
            {tipoAdenda === "errata" && !dentroVentana && esAutorizador && (
              <div
                className="flex gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "var(--color-kp-warning-lt, #FFFBEB)",
                  color: "#92400E",
                  border: "1px solid #FCD34D",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden />
                <p>
                  Esta nota supera el límite de 72 horas. Requiere justificación
                  de dirección.
                </p>
              </div>
            )}

            {/* Warning: errata fuera de ventana — NO autorizador */}
            {tipoAdenda === "errata" && !dentroVentana && !esAutorizador && (
              <div
                className="flex gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "var(--color-kp-danger-lt, #FEF2F2)",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden />
                <p>
                  Han pasado más de 72 horas. Esta corrección requiere
                  autorización de un director. Contacta al director de la
                  clínica.
                </p>
              </div>
            )}

            {/* Warning: anulación */}
            {tipoAdenda === "anulacion" && (
              <div
                className="flex gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "var(--color-kp-danger-lt, #FEF2F2)",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden />
                <p>
                  La anulación marca el documento como inválido. El contenido
                  original permanece visible con marca de anulación.
                </p>
              </div>
            )}

            {/* Field: Motivo */}
            <div className="space-y-1">
              <label
                htmlFor="adenda-motivo"
                className="text-[0.65rem] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-ink-3)" }}
              >
                Motivo{" "}
                <span style={{ color: "var(--color-kp-danger)" }}>*</span>
              </label>
              <input
                id="adenda-motivo"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                required
                placeholder="Describe brevemente el motivo"
                disabled={isPending}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-shadow"
                style={{
                  borderColor: "var(--color-kp-border)",
                  color: "var(--color-ink-1)",
                  background: "var(--color-surface-1)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px var(--color-kp-accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <p
                className="text-[0.6rem] text-right"
                style={{ color: "var(--color-ink-3)" }}
              >
                {motivo.length}/200
              </p>
            </div>

            {/* Field: Contenido */}
            <div className="space-y-1">
              <label
                htmlFor="adenda-contenido"
                className="text-[0.65rem] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-ink-3)" }}
              >
                Contenido / corrección{" "}
                <span style={{ color: "var(--color-kp-danger)" }}>*</span>
              </label>
              <textarea
                id="adenda-contenido"
                rows={5}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                required
                placeholder={
                  tipoAdenda === "adenda"
                    ? "Información complementaria a agregar al documento..."
                    : tipoAdenda === "errata"
                      ? "Describe el error original y la corrección correspondiente..."
                      : "Explica el motivo de la anulación y las consecuencias clínicas..."
                }
                disabled={isPending}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none transition-shadow"
                style={{
                  borderColor: "var(--color-kp-border)",
                  color: "var(--color-ink-1)",
                  background: "var(--color-surface-1)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px var(--color-kp-accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Field: Motivo de autorización (override, conditional) */}
            {necesitaOverride && (
              <div className="space-y-1">
                <label
                  htmlFor="adenda-override"
                  className="text-[0.65rem] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  Motivo de autorización{" "}
                  <span style={{ color: "var(--color-kp-danger)" }}>*</span>
                </label>
                <textarea
                  id="adenda-override"
                  rows={3}
                  value={overrideMotivo}
                  onChange={(e) => setOverrideMotivo(e.target.value)}
                  required
                  placeholder="Justificación de dirección para esta operación..."
                  disabled={isPending}
                  className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none transition-shadow"
                  style={{
                    borderColor: "var(--color-kp-border)",
                    color: "var(--color-ink-1)",
                    background: "var(--color-surface-1)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 0 0 2px var(--color-kp-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            )}

            {/* Inline error banner */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: "var(--color-kp-danger-lt, #FEF2F2)",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-end gap-3 px-5 py-4 shrink-0"
            style={{ borderTop: "1px solid var(--color-kp-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--color-kp-border)",
                color: "var(--color-ink-2)",
                background: "transparent",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-kp-accent)" }}
            >
              {isPending
                ? "Guardando..."
                : `Guardar ${TIPO_LABEL[tipoAdenda].toLowerCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
