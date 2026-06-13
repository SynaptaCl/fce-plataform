"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { exportarFichaCompletaPdf } from "@/app/actions/exportar-pdf";
import { renderFichaCompletaPdf } from "@/lib/ficha-clinica/pdf-renderer";

// ── Props ──────────────────────────────────────────────────────────────────────

interface FichaCompletaExportProps {
  patientId: string;
}

// Secciones incluidas en la ficha completa — preview informativa para el usuario
const SECCIONES_INCLUIDAS = [
  "Identificación del paciente (M1)",
  "Anamnesis y red flags (M2)",
  "Registro de encuentros",
  "Signos vitales (historial completo)",
  "Evoluciones SOAP firmadas",
  "Notas clínicas firmadas",
  "Evaluaciones por especialidad",
  "Instrumentos aplicados",
  "Consentimientos firmados",
  "Prescripciones firmadas",
  "Órdenes de examen firmadas",
  "Plan de intervención (M10)",
  "Egreso / Epicrisis",
];

type Status = "idle" | "loading" | "rendering" | "done" | "error";

// ── Component ──────────────────────────────────────────────────────────────────

export function FichaCompletaExport({ patientId }: FichaCompletaExportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [filename, setFilename] = useState("ficha-clinica.pdf");

  // La descarga ocurre SOLO al hacer clic — nunca automáticamente al montar
  async function handleDownload() {
    setStatus("loading");
    setError(null);
    try {
      const result = await exportarFichaCompletaPdf(patientId);
      if (!result.success) {
        setError(result.error);
        setStatus("error");
        return;
      }
      const fecha = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
      const rut = result.data.paciente.rut?.replace(/\./g, "") ?? patientId;
      setFilename(`ficha-clinica-${rut}-${fecha}.pdf`);
      setPdfHtml(renderFichaCompletaPdf(result.data));
      setStatus("rendering");
    } catch {
      setError("Error al compilar la ficha clínica. Intenta de nuevo.");
      setStatus("error");
    }
  }

  // Cuando el HTML está montado en el contenedor oculto, generar el PDF.
  // rAF + setTimeout garantizan que el navegador pintó el contenedor antes de
  // que html2canvas lo capture (sin esto, captura un frame vacío).
  useEffect(() => {
    if (status !== "rendering" || !pdfHtml || !containerRef.current) return;
    const element = containerRef.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const rafId = requestAnimationFrame(() => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const html2pdf = (await import("html2pdf.js")).default;
          await html2pdf()
            .set({
              margin: [12, 10, 14, 10],
              filename,
              image: { type: "jpeg", quality: 0.97 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
              pagebreak: { mode: ["avoid-all", "css", "legacy"] },
            })
            .from(element)
            .save();
          if (!cancelled) setStatus("done");
        } catch {
          if (!cancelled) {
            setError("Error al generar el PDF. Intenta de nuevo.");
            setStatus("error");
          }
        } finally {
          if (!cancelled) setPdfHtml(null);
        }
      }, 300);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pdfHtml]);

  const busy = status === "loading" || status === "rendering";

  return (
    <>
      {/* Contenedor para html2pdf.js. html2pdf CLONA el elemento pasado a .from()
          con sus estilos inline y lo captura en un contenedor propio — por eso los
          estilos de ocultamiento van en este wrapper externo y el elemento interno
          (el que se clona) queda limpio. Nunca ocultar el elemento interno. */}
      {pdfHtml && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            opacity: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <div
            ref={containerRef}
            style={{ width: "210mm", background: "#FFFFFF" }}
            dangerouslySetInnerHTML={{ __html: pdfHtml }}
          />
        </div>
      )}

      <div className="bg-surface-1 border border-kp-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: "var(--color-kp-accent-xs)" }}
          >
            <FileText className="w-5 h-5" style={{ color: "var(--color-kp-accent)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-1">Ficha clínica completa</p>
            <p className="text-xs text-ink-3">
              Exportación del registro clínico íntegro — Decreto 41 MINSAL · Ley 20.584
            </p>
          </div>
        </div>

        {/* Preview de secciones incluidas */}
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--color-kp-border)", background: "var(--color-surface-0)" }}
        >
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">
            Secciones incluidas
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {SECCIONES_INCLUIDAS.map((s) => (
              <li key={s} className="text-xs text-ink-2 flex items-start gap-1.5">
                <span style={{ color: "var(--color-kp-accent)" }}>•</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-3 mt-3">
            Solo se incluyen las secciones que tienen registros. Los documentos firmados se
            exportan en orden cronológico.
          </p>
        </div>

        {error && <AlertBanner variant="danger">{error}</AlertBanner>}
        {status === "done" && (
          <p className="text-sm font-medium" style={{ color: "var(--color-kp-success)" }}>
            ✓ PDF descargado correctamente
          </p>
        )}

        <Button variant="primary" onClick={handleDownload} disabled={busy}>
          <FileDown className="w-4 h-4 mr-1.5" />
          {status === "loading"
            ? "Compilando ficha…"
            : status === "rendering"
              ? "Generando PDF…"
              : "Descargar ficha completa (PDF)"}
        </Button>
      </div>
    </>
  );
}
