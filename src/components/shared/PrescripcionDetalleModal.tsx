"use client";

import { useEffect, useState } from "react";
import { Pill, X, Download, Printer, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { RecetaPdfView } from "@/components/shared/RecetaPdfView";
import { generarRecetaPdf } from "@/lib/prescripciones/pdf-renderer";
import { buildMailtoLink, buildWhatsappLink } from "@/lib/prescripciones/share-helpers";
import { getPrescripcionById } from "@/app/actions/prescripciones";
import {
  logPrescripcionDownload,
  logPrescripcionPrint,
  logPrescripcionShare,
} from "@/app/actions/prescripciones";
import type { Prescripcion, MedicamentoPrescrito } from "@/types/prescripcion";
import type { Patient } from "@/types/patient";
import type { ClinicaConfig } from "@/lib/modules/config";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PrescripcionDetalleModalProps {
  prescripcionId: string;
  paciente: Patient;
  clinica: ClinicaConfig;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PrescripcionDetalleModal({
  prescripcionId,
  paciente,
  clinica,
  onClose,
}: PrescripcionDetalleModalProps) {
  const [prescripcion, setPrescripcion] = useState<Prescripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"receta" | "detalles" | "acciones">("receta");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getPrescripcionById(prescripcionId)
      .then((result) => {
        if (result.success) setPrescripcion(result.data);
        else setError(result.error);
      })
      .finally(() => setLoading(false));
  }, [prescripcionId]);

  async function handleDownload() {
    if (!prescripcion) return;
    setPdfLoading(true);
    try {
      await generarRecetaPdf("receta-pdf", {
        filename: `receta-${prescripcion.folio_display}.pdf`,
        download: true,
      });
      // fire and forget audit log
      logPrescripcionDownload(prescripcion.id).catch(() => {});
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    if (!prescripcion) return;
    setPdfLoading(true);
    try {
      await generarRecetaPdf("receta-pdf", { newWindow: true });
      logPrescripcionPrint(prescripcion.id).catch(() => {});
    } catch (err) {
      console.error("Error imprimiendo:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Loading / Error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-surface-1 rounded-2xl shadow-xl w-full max-w-3xl p-10 text-center text-ink-3 text-sm">
          Cargando prescripción...
        </div>
      </div>
    );
  }

  if (error || !prescripcion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-surface-1 rounded-2xl shadow-xl w-full max-w-3xl p-10 text-center text-ink-3 text-sm">
          No se pudo cargar la prescripción.
        </div>
      </div>
    );
  }

  // ── Main modal ────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-1 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kp-border shrink-0">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-kp-accent" />
            <span className="font-semibold text-ink-1 text-sm">
              {prescripcion.folio_display ?? "Prescripción"}
            </span>
            <Badge variant="info">
              {prescripcion.tipo === "farmacologica"
                ? "Receta farmacológica"
                : "Indicación general"}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-kp-border px-5 shrink-0">
          {(["receta", "detalles", "acciones"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-kp-accent text-kp-primary"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              )}
            >
              {tab === "receta" ? "Receta" : tab === "detalles" ? "Detalles" : "Acciones"}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "receta" && (
          <div className="flex-1 overflow-auto">
            {/* Hidden RecetaPdfView rendered off-screen for html2pdf.js */}
            <div className="sr-only absolute pointer-events-none" aria-hidden>
              <RecetaPdfView
                prescripcion={prescripcion}
                paciente={paciente}
                clinica={clinica}
              />
            </div>

            {/* Preview message */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-ink-2">
                El PDF se genera con los datos de la receta original. Use los botones abajo
                para descargar o imprimir.
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownload}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-kp-accent text-white rounded-lg text-sm font-medium hover:bg-kp-primary-hover transition-colors disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {pdfLoading ? "Generando..." : "Descargar PDF"}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-kp-border rounded-lg text-sm font-medium text-ink-2 hover:bg-surface-0 transition-colors disabled:opacity-60"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "detalles" && (
          <div className="flex-1 overflow-auto p-5 space-y-5">
            {/* Fecha emisión */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">
                Fecha de emisión
              </p>
              <p className="text-sm text-ink-1">
                {prescripcion.firmado_at
                  ? new Date(prescripcion.firmado_at).toLocaleDateString("es-CL", {
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

            {/* Diagnóstico */}
            {prescripcion.diagnostico_asociado && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">
                  Diagnóstico asociado
                </p>
                <p className="text-sm text-ink-1">{prescripcion.diagnostico_asociado}</p>
              </div>
            )}

            {/* Medicamentos (farmacológica) */}
            {prescripcion.tipo === "farmacologica" &&
              Array.isArray(prescripcion.medicamentos) &&
              prescripcion.medicamentos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-2">
                    Medicamentos
                  </p>
                  <div className="space-y-3">
                    {(prescripcion.medicamentos as MedicamentoPrescrito[]).map((med, idx) => (
                      <div
                        key={idx}
                        className="border border-kp-border rounded-lg p-3 space-y-1"
                      >
                        <p className="text-sm font-semibold text-ink-1">
                          {idx + 1}. {med.principio_activo}
                          {med.nombre_comercial ? ` (${med.nombre_comercial})` : ""}{" "}
                          {med.presentacion}
                        </p>
                        <p className="text-xs text-ink-2">
                          Dosis: {med.dosis} · Frecuencia: {med.frecuencia} · Duración:{" "}
                          {med.duracion}
                        </p>
                        <p className="text-xs text-ink-2">
                          Cantidad total: {med.cantidad_total}
                        </p>
                        {med.instrucciones && (
                          <p className="text-xs text-ink-3 italic">{med.instrucciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Indicaciones generales */}
            {prescripcion.tipo === "indicacion_general" &&
              prescripcion.indicaciones_generales && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">
                    Indicaciones generales
                  </p>
                  <p className="text-sm text-ink-1 whitespace-pre-wrap">
                    {prescripcion.indicaciones_generales}
                  </p>
                </div>
              )}

            {/* Profesional */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1">
                Profesional
              </p>
              <div className="text-sm text-ink-1 space-y-0.5">
                <p>{prescripcion.prof_nombre_snapshot ?? "—"}</p>
                {prescripcion.prof_registro_snapshot && (
                  <p className="text-xs text-ink-2">
                    {prescripcion.prof_tipo_registro_snapshot ?? "Reg."}:{" "}
                    {prescripcion.prof_registro_snapshot}
                  </p>
                )}
                {prescripcion.prof_especialidad_snapshot && (
                  <p className="text-xs text-ink-2">
                    {prescripcion.prof_especialidad_snapshot}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "acciones" && (
          <div className="flex-1 overflow-auto p-5 space-y-4">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Datos sensibles.</strong> Verifica el destinatario antes de enviar
              — esta receta contiene información de salud privada.
            </div>

            {/* Share buttons */}
            <div className="space-y-2">
              <a
                href={buildMailtoLink(prescripcion, paciente, clinica.nombreDisplay)}
                className="flex items-center gap-2 px-4 py-2.5 border border-kp-border rounded-lg text-sm text-ink-2 hover:bg-surface-0 transition-colors"
                onClick={() =>
                  logPrescripcionShare(prescripcion.id, "email").catch(() => {})
                }
              >
                <Mail className="w-4 h-4" />
                Compartir por email
              </a>
              <a
                href={buildWhatsappLink(
                  prescripcion,
                  clinica.nombreDisplay,
                  paciente.telefono ?? undefined
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 border border-kp-border rounded-lg text-sm text-ink-2 hover:bg-surface-0 transition-colors"
                onClick={() =>
                  logPrescripcionShare(prescripcion.id, "whatsapp").catch(() => {})
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
