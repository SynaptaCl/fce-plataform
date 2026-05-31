"use client";

import { useState, useEffect } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { getPlanIntervencionDetalle } from "@/app/actions/clinico/plan-intervencion";
import { getPatientById } from "@/app/actions/patients";
import type { PlanIntervencionDetalle } from "@/types/plan-intervencion";
import type { Patient } from "@/types/patient";

// ── Props ──────────────────────────────────────────────────────────────────

interface PlanIntervencionPdfViewProps {
  planId: string;
  patientId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nombreCompleto(paciente: Patient): string {
  return [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
    .filter(Boolean)
    .join(" ");
}

function formatFechaLarga(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFechaCorta(iso: string): string {
  // "YYYY-MM-DD" o ISO datetime → DD/MM/YYYY
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL");
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    en_revision: "En revisión",
    cerrado: "Cerrado",
  };
  return map[estado] ?? estado;
}

// ── Builder HTML del PDF (hex hardcoded — html2pdf.js no resuelve CSS vars) ──

function buildPdfHtml(plan: PlanIntervencionDetalle, paciente: Patient): string {
  const nombre = nombreCompleto(paciente);
  const rut = paciente.rut ?? "—";
  const fechaInicio = formatFechaCorta(plan.fecha_inicio);
  const fechaRevision = plan.fecha_revision ? formatFechaCorta(plan.fecha_revision) : "Sin fecha de revisión";
  const estado = estadoLabel(plan.estado);
  const firmadoHtml = plan.firmado && plan.firmado_at
    ? `<p style="margin:2px 0;"><strong>Firmado el:</strong> ${formatFechaLarga(plan.firmado_at)}</p>`
    : "";
  const diagnosticoHtml = plan.diagnostico
    ? `<p style="margin:2px 0;"><strong>Diagnóstico:</strong> ${escapeHtml(plan.diagnostico)}</p>`
    : "";
  const fechaGeneracion = formatFechaLarga(new Date().toISOString());

  // Agrupar objetivos por dominio_label
  const dominios = Array.from(new Set(plan.objetivos.map((o) => o.dominio_label)));

  const objetivosHtml = dominios
    .map((dominio) => {
      const objsDominio = plan.objetivos.filter((o) => o.dominio_label === dominio);
      const itemsHtml = objsDominio
        .map((obj) => {
          const gasHtml = obj.gas_0
            ? `<p style="margin:2px 0;font-size:11px;color:#475569;">Objetivo esperado (0): ${escapeHtml(obj.gas_0)}</p>`
            : "";
          return `
            <div style="margin-bottom:12px;padding:8px;background:#F1F5F9;border-radius:4px;">
              <p style="font-weight:bold;margin:0 0 4px 0;font-size:13px;">${escapeHtml(obj.dominio_label)}</p>
              <p style="margin:2px 0;font-size:13px;">${escapeHtml(obj.descripcion)}</p>
              <p style="margin:2px 0;font-size:11px;color:#475569;">Nivel actual: ${escapeHtml(obj.nivel_actual)} | Prioridad: ${escapeHtml(obj.prioridad)}</p>
              ${gasHtml}
            </div>`;
        })
        .join("");
      return itemsHtml;
    })
    .join("");

  return `
<div style="font-family:Arial,sans-serif;padding:20px;color:#1E293B;max-width:800px;">
  <!-- Header -->
  <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #006B6B;padding-bottom:10px;">
    <h2 style="color:#006B6B;margin:0;font-size:20px;">PLAN DE INTERVENCIÓN</h2>
    <p style="margin:4px 0;font-size:12px;color:#475569;">Plan de Neurodesarrollo</p>
  </div>

  <!-- Datos del paciente -->
  <div style="margin-bottom:16px;">
    <p style="margin:2px 0;"><strong>Paciente:</strong> ${escapeHtml(nombre)}</p>
    <p style="margin:2px 0;"><strong>RUT:</strong> ${escapeHtml(rut)}</p>
    <p style="margin:2px 0;"><strong>Fecha inicio:</strong> ${fechaInicio}</p>
    <p style="margin:2px 0;"><strong>Fecha revisión:</strong> ${fechaRevision}</p>
    <p style="margin:2px 0;"><strong>Estado:</strong> ${escapeHtml(estado)}</p>
    ${firmadoHtml}
  </div>

  <!-- Diagnóstico -->
  ${diagnosticoHtml}

  <!-- Objetivos -->
  <h3 style="color:#006B6B;border-bottom:1px solid #E2E8F0;padding-bottom:4px;font-size:15px;margin-top:20px;">
    Objetivos de Intervención
  </h3>
  ${objetivosHtml.trim() || '<p style="color:#94A3B8;font-size:13px;">Sin objetivos registrados.</p>'}

  <!-- Footer -->
  <div style="margin-top:24px;font-size:10px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:8px;">
    Documento generado el ${fechaGeneracion} | Este plan es un documento vivo y puede ser actualizado
  </div>
</div>`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function PlanIntervencionPdfView({ planId, patientId }: PlanIntervencionPdfViewProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanIntervencionDetalle | null>(null);
  const [paciente, setPaciente] = useState<Patient | null>(null);

  // Carga inicial: plan + paciente en paralelo
  useEffect(() => {
    Promise.all([
      getPlanIntervencionDetalle(planId),
      getPatientById(patientId),
    ])
      .then(([planResult, pacienteResult]) => {
        if (!planResult.success) {
          setError(planResult.error);
          return;
        }
        if (!pacienteResult.success) {
          setError(pacienteResult.error);
          return;
        }
        setPlan(planResult.data);
        setPaciente(pacienteResult.data);
      })
      .catch(() => setError("Error al cargar los datos del plan."))
      .finally(() => setLoading(false));
  }, [planId, patientId]);

  // ── Download handler ───────────────────────────────────────────────────────

  async function handleDownload() {
    if (!plan || !paciente) return;
    setDownloading(true);
    try {
      const apellido = (paciente.apellido_paterno ?? "paciente").toLowerCase();
      const fecha = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
      const filename = `plan-intervencion-${apellido}-${fecha}.pdf`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import("html2pdf.js")).default as any;

      const htmlContent = buildPdfHtml(plan, paciente);

      // Crear contenedor temporal fuera del viewport
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm";
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(container).save();

      document.body.removeChild(container);
    } catch {
      setError("Error al generar el PDF.");
    } finally {
      setDownloading(false);
    }
  }

  // ── Estados de carga / error ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-surface-1 border border-kp-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-ink-3 text-sm">
          <div className="w-4 h-4 border-2 border-kp-accent border-t-transparent rounded-full animate-spin" />
          Cargando plan de intervención…
        </div>
      </div>
    );
  }

  if (error || !plan || !paciente) {
    return (
      <AlertBanner variant="danger" title="Error al cargar plan">
        {error ?? "No se pudo cargar el plan de intervención."}
      </AlertBanner>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface-1 border border-kp-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: "var(--color-kp-accent-xs)" }}>
          <FileDown
            className="w-5 h-5"
            style={{ color: "var(--color-kp-accent)" }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1">Plan de Intervención</p>
          <p className="text-xs text-ink-3">
            {estadoLabel(plan.estado)} · {formatFechaCorta(plan.fecha_inicio)}
          </p>
        </div>
      </div>

      {/* Error inline */}
      {error && (
        <AlertBanner variant="danger">
          {error}
        </AlertBanner>
      )}

      {/* Acción */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleDownload}
        disabled={downloading}
      >
        <FileDown className="w-4 h-4 mr-1.5" />
        {downloading ? "Generando…" : "Descargar PDF"}
      </Button>
    </div>
  );
}
