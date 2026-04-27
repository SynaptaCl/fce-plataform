"use client";

import { useState, useEffect } from "react";
import { FileDown, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { getEgresoConContexto, registrarExportEpicrisis } from "@/app/actions/egresos";
import type { EgresoConContexto } from "@/app/actions/egresos";
import { renderEpicrisisPdf } from "@/lib/egresos/pdf-renderer";
import { TIPOS_EGRESO } from "@/types/egreso";

// ── Props ──────────────────────────────────────────────────────────────────────

interface EpicrisisPdfViewProps {
  egresoId: string;
  patientId: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EpicrisisPdfView({ egresoId, patientId }: EpicrisisPdfViewProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EgresoConContexto | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Detect share API on client only (avoid SSR mismatch)
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  // Fetch egreso data on mount
  useEffect(() => {
    getEgresoConContexto(egresoId)
      .then((result) => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .finally(() => setLoading(false));
  }, [egresoId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildFilename(apellido: string | null, firmadoAt: string | null): string {
    const apellidoNorm = (apellido ?? "paciente").toLowerCase();
    const fecha = new Date(firmadoAt ?? Date.now()).toLocaleDateString("sv-SE"); // YYYY-MM-DD
    return `epicrisis-${apellidoNorm}-${fecha}.pdf`;
  }

  // ── Download handler ───────────────────────────────────────────────────────

  async function handleDownload() {
    if (!data) return;
    setDownloading(true);
    try {
      const filename = buildFilename(
        data.paciente.apellido_paterno,
        data.egreso.firmado_at,
      );

      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(`epicrisis-pdf-${egresoId}`);
      if (!element) return;

      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
        })
        .from(element)
        .save();

      // Log audit (fire and forget)
      await registrarExportEpicrisis(egresoId, patientId);
    } finally {
      setDownloading(false);
    }
  }

  // ── Share handler ──────────────────────────────────────────────────────────

  async function handleShare() {
    if (!data) return;
    setSharing(true);
    try {
      const filename = buildFilename(
        data.paciente.apellido_paterno,
        data.egreso.firmado_at,
      );

      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(`epicrisis-pdf-${egresoId}`);
      if (!element) return;

      const blob = (await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
        })
        .from(element)
        .output("blob")) as Blob;

      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Epicrisis",
          text: `Epicrisis de ${data.clinica.nombre}`,
          files: [file],
        });
      } else {
        await navigator.share({
          title: "Epicrisis",
          text: `Epicrisis de ${data.clinica.nombre}`,
        });
      }

      await registrarExportEpicrisis(egresoId, patientId);
    } catch (e) {
      // User cancelled share — not an error
      if (e instanceof Error && e.name !== "AbortError") {
        setError("Error al compartir el documento.");
      }
    } finally {
      setSharing(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-surface-1 border border-kp-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-ink-3 text-sm">
          <div className="w-4 h-4 border-2 border-kp-accent border-t-transparent rounded-full animate-spin" />
          Cargando datos de epicrisis…
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <AlertBanner variant="danger" title="Error al cargar epicrisis">
        {error ?? "No se pudo cargar la epicrisis."}
      </AlertBanner>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const tipoLabel =
    TIPOS_EGRESO.find((t) => t.value === data.egreso.tipo_egreso)?.label ??
    data.egreso.tipo_egreso;

  const fechaFirma = data.egreso.firmado_at
    ? new Date(data.egreso.firmado_at).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Sin fecha";

  // Build HTML content for the hidden PDF container
  const htmlContent = renderEpicrisisPdf({
    egreso: data.egreso,
    paciente: data.paciente,
    profesional: data.profesional,
    clinica: data.clinica,
    fechaIngreso: data.fechaIngreso,
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden PDF container — read by html2pdf.js */}
      <div
        id={`epicrisis-pdf-${egresoId}`}
        style={{ position: "absolute", left: "-9999px", top: 0, width: "210mm" }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Visible UI card */}
      <div className="bg-surface-1 border border-kp-border rounded-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-kp-accent-xs">
            <FileText className="w-5 h-5 text-kp-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-1">Epicrisis</p>
            <p className="text-xs text-ink-3">
              {tipoLabel} · {fechaFirma}
            </p>
          </div>
        </div>

        {/* Inline error (e.g. share failed after initial load) */}
        {error && (
          <AlertBanner variant="danger">
            {error}
          </AlertBanner>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>

          {canShare && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              {sharing ? "Compartiendo..." : "Compartir"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
