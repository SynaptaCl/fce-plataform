"use client";

import { useEffect, useState } from "react";
import { ClipboardList, X, Download, Printer, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { OrdenExamenPdfView } from "@/components/shared/OrdenExamenPdfView";
import { generarOrdenExamenPdf } from "@/lib/ordenes-examen/pdf-renderer";
import { buildMailtoLink, buildWhatsappLink } from "@/lib/ordenes-examen/share-helpers";
import { getOrdenExamenById, logOrdenExamenAction } from "@/app/actions/ordenes-examen";
import type { OrdenExamen, ExamenIndicado } from "@/types/orden-examen";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ordenId: string;
  paciente: Patient;
  clinica: ClinicaConfig;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrdenExamenDetalleModal({
  ordenId,
  paciente,
  clinica,
  onClose,
}: Props) {
  const [orden, setOrden] = useState<OrdenExamen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orden" | "detalles" | "acciones">("orden");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getOrdenExamenById(ordenId)
      .then((result) => {
        if (result.success) setOrden(result.data);
        else setError(result.error);
      })
      .finally(() => setLoading(false));

    // Fire-and-forget audit log
    logOrdenExamenAction(ordenId, "ver_orden_examen").catch(() => {});
  }, [ordenId]);

  async function handleDownload() {
    if (!orden) return;
    setPdfLoading(true);
    try {
      await generarOrdenExamenPdf("orden-examen-pdf", {
        filename: `orden-${orden.folio_display}.pdf`,
        download: true,
      });
      logOrdenExamenAction(orden.id, "descargar_pdf_orden").catch(() => {});
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    if (!orden) return;
    setPdfLoading(true);
    try {
      await generarOrdenExamenPdf("orden-examen-pdf", { newWindow: true });
      logOrdenExamenAction(orden.id, "imprimir_orden").catch(() => {});
    } catch (err) {
      console.error("Error imprimiendo:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Loading / Error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div
          className="rounded-2xl shadow-xl w-full max-w-3xl p-10 text-center text-sm"
          style={{ background: "var(--surface-1)", color: "var(--ink-3)" }}
        >
          Cargando orden de exámenes...
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div
          className="rounded-2xl shadow-xl w-full max-w-3xl p-10 text-center text-sm"
          style={{ background: "var(--surface-1)", color: "var(--ink-3)" }}
        >
          No se pudo cargar la orden de exámenes.
        </div>
      </div>
    );
  }

  // ── Main modal ────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: "var(--surface-1)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--kp-border)" }}
        >
          <div className="flex items-center gap-2">
            <ClipboardList
              className="w-4 h-4"
              style={{ color: "var(--color-kp-accent)" }}
            />
            <span
              className="font-semibold text-sm"
              style={{ color: "var(--ink-1)" }}
            >
              {orden.folio_display ?? "Orden de exámenes"}
            </span>
            {orden.prioridad === "urgente" && (
              <Badge variant="danger">Urgente</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--ink-3)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b px-5 shrink-0"
          style={{ borderColor: "var(--kp-border)" }}
        >
          {(["orden", "detalles", "acciones"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              )}
              style={
                activeTab === tab
                  ? {
                      borderBottomColor: "var(--color-kp-accent)",
                      color: "var(--color-kp-primary)",
                    }
                  : {}
              }
            >
              {tab === "orden" ? "Orden" : tab === "detalles" ? "Detalles" : "Acciones"}
            </button>
          ))}
        </div>

        {/* Tab: Orden */}
        {activeTab === "orden" && (
          <div className="flex-1 overflow-auto">
            {/* Hidden OrdenExamenPdfView rendered off-screen for html2pdf.js */}
            <div className="sr-only absolute pointer-events-none" aria-hidden>
              <OrdenExamenPdfView
                orden={orden}
                paciente={paciente}
                clinica={clinica}
              />
            </div>

            {/* Preview message + buttons */}
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                El PDF se genera on-demand. Use los botones para descargar o imprimir.
              </p>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownload}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-colors"
                  style={{ background: "var(--color-kp-accent)" }}
                >
                  <Download className="w-4 h-4" />
                  {pdfLoading ? "Generando..." : "Descargar PDF"}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors border"
                  style={{
                    borderColor: "var(--kp-border)",
                    color: "var(--ink-2)",
                    background: "transparent",
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Detalles */}
        {activeTab === "detalles" && (
          <div className="flex-1 overflow-auto p-5 space-y-5">
            {/* Fecha emisión */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "var(--ink-3)" }}
              >
                Fecha de emisión
              </p>
              <p className="text-sm" style={{ color: "var(--ink-1)" }}>
                {orden.firmado_at
                  ? new Date(orden.firmado_at).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Santiago",
                    })
                  : "—"}
              </p>
            </div>

            {/* Prioridad */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "var(--ink-3)" }}
              >
                Prioridad
              </p>
              <p className="text-sm capitalize" style={{ color: "var(--ink-1)" }}>
                {orden.prioridad}
              </p>
            </div>

            {/* Estado de resultados */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "var(--ink-3)" }}
              >
                Estado de resultados
              </p>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={
                  orden.estado_resultados === "completo"
                    ? { background: "#dcfce7", color: "#166534" }
                    : orden.estado_resultados === "parcial"
                    ? { background: "#fef9c3", color: "#854d0e" }
                    : { background: "var(--surface-0)", color: "var(--ink-3)" }
                }
              >
                {orden.estado_resultados}
              </span>
            </div>

            {/* Diagnóstico presuntivo */}
            {orden.diagnostico_presuntivo && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: "var(--ink-3)" }}
                >
                  Diagnóstico presuntivo
                </p>
                <p className="text-sm" style={{ color: "var(--ink-1)" }}>
                  {orden.diagnostico_presuntivo}
                </p>
              </div>
            )}

            {/* Exámenes */}
            {Array.isArray(orden.examenes) && orden.examenes.length > 0 && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  Exámenes indicados
                </p>
                <div className="space-y-3">
                  {(orden.examenes as ExamenIndicado[]).map((examen, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-3 space-y-1 border"
                      style={{ borderColor: "var(--kp-border)" }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--ink-1)" }}
                        >
                          {idx + 1}. {examen.nombre}
                        </p>
                        {examen.urgente && (
                          <Badge variant="danger">Urgente</Badge>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                        {examen.categoria}
                      </p>
                      {examen.indicacion_clinica && (
                        <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                          Indicación: {examen.indicacion_clinica}
                        </p>
                      )}
                      {examen.instrucciones && (
                        <p
                          className="text-xs italic"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {examen.instrucciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {orden.observaciones && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: "var(--ink-3)" }}
                >
                  Observaciones
                </p>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: "var(--ink-1)" }}
                >
                  {orden.observaciones}
                </p>
              </div>
            )}

            {/* Profesional */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "var(--ink-3)" }}
              >
                Profesional
              </p>
              <div className="text-sm space-y-0.5" style={{ color: "var(--ink-1)" }}>
                <p>{orden.prof_nombre_snapshot ?? "—"}</p>
                {orden.prof_rut_snapshot && (
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    RUT: {orden.prof_rut_snapshot}
                  </p>
                )}
                {orden.prof_registro_snapshot && (
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {orden.prof_tipo_registro_snapshot ?? "Reg."}:{" "}
                    {orden.prof_registro_snapshot}
                  </p>
                )}
                {orden.prof_especialidad_snapshot && (
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {orden.prof_especialidad_snapshot}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Acciones */}
        {activeTab === "acciones" && (
          <div className="flex-1 overflow-auto p-5 space-y-4">
            {/* Warning */}
            <div className="rounded-lg p-3 text-xs border border-amber-200 bg-amber-50 text-amber-800">
              <strong>Datos sensibles.</strong> Verifica el destinatario antes de enviar
              — esta orden contiene información de salud privada.
            </div>

            {/* Share links */}
            <div className="space-y-2">
              <a
                href={buildMailtoLink(orden, paciente, clinica.nombreDisplay)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors"
                style={{
                  borderColor: "var(--kp-border)",
                  color: "var(--ink-2)",
                }}
                onClick={() =>
                  logOrdenExamenAction(orden.id, "compartir_orden_email").catch(() => {})
                }
              >
                <Mail className="w-4 h-4" />
                Compartir por email
              </a>
              <a
                href={buildWhatsappLink(
                  orden,
                  clinica.nombreDisplay,
                  paciente.telefono ?? undefined
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors"
                style={{
                  borderColor: "var(--kp-border)",
                  color: "var(--ink-2)",
                }}
                onClick={() =>
                  logOrdenExamenAction(orden.id, "compartir_orden_whatsapp").catch(() => {})
                }
              >
                <MessageCircle className="w-4 h-4" />
                Compartir por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
