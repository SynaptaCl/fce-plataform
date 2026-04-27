import type { Egreso } from "@/types/egreso";
import { TIPOS_EGRESO } from "@/types/egreso";

export interface EpicrisisRenderData {
  egreso: Egreso;
  paciente: {
    nombre: string | null;
    apellido_paterno: string | null;
    apellido_materno: string | null;
    rut: string | null;
    fecha_nacimiento: string | null;
    prevision: { tipo: string } | null;
  };
  profesional: {
    nombre: string | null;
    especialidad: string | null;
    numero_registro: string | null;
    tipo_registro: string | null;
  } | null;
  clinica: {
    nombre: string;
    direccion?: string | null;
    logo_url?: string | null;
  };
  fechaIngreso: string | null; // ISO string of first encounter
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function section(title: string, content: string): string {
  return `
    <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin-bottom:16px;">
      <div style="font-size:11px; font-weight:700; color:#0D9488; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">${title}</div>
      <div style="font-size:13px; color:#1E293B; white-space:pre-wrap; line-height:1.6;">${content}</div>
    </div>`;
}

function field(label: string, value: string): string {
  return `
      <div style="margin-bottom:8px;">
        <span style="font-size:11px; color:#475569; font-weight:600; text-transform:uppercase;">${label}: </span>
        <span style="font-size:13px; color:#1E293B;">${value}</span>
      </div>`;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderEpicrisisPdf(data: EpicrisisRenderData): string {
  const { egreso, paciente, profesional, clinica, fechaIngreso } = data;

  // Tipo de egreso label
  const tipoLabel = esc(
    TIPOS_EGRESO.find((t) => t.value === egreso.tipo_egreso)?.label ??
      egreso.tipo_egreso
  );

  // Nombre completo del paciente
  const nombreCompleto = esc(
    [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
      .filter(Boolean)
      .join(" ") || "Sin registro"
  );

  // Header: logo + clinic name
  const logoHtml = clinica.logo_url
    ? `<img src="${esc(clinica.logo_url)}" style="height:48px; object-fit:contain; margin-right:16px;" />`
    : "";

  const direccionHtml = clinica.direccion
    ? `<div style="font-size:12px; color:#475569; margin-top:2px;">${esc(clinica.direccion)}</div>`
    : "";

  // Patient data fields
  const pacienteFields = [
    field("Nombre", nombreCompleto),
    paciente.rut ? field("RUT", esc(paciente.rut)) : "",
    paciente.fecha_nacimiento
      ? field("Fecha de nacimiento", formatDate(paciente.fecha_nacimiento))
      : "",
    paciente.prevision?.tipo
      ? field("Previsión", esc(paciente.prevision.tipo))
      : "",
  ].join("");

  // Clinical sections (only rendered if content exists)
  const diagnosticoSection =
    egreso.diagnostico_egreso?.trim()
      ? section("Diagnóstico de Egreso", esc(egreso.diagnostico_egreso))
      : "";

  const resumenSection =
    egreso.resumen_tratamiento?.trim()
      ? section("Resumen del Tratamiento", esc(egreso.resumen_tratamiento))
      : "";

  const estadoSection =
    egreso.estado_al_egreso?.trim()
      ? section("Estado al Egreso", esc(egreso.estado_al_egreso))
      : "";

  const indicacionesSection =
    egreso.indicaciones_post_egreso?.trim()
      ? section(
          "Indicaciones Post-Egreso",
          esc(egreso.indicaciones_post_egreso)
        )
      : "";

  const derivacionSection =
    egreso.tipo_egreso === "derivacion" && egreso.derivacion_a?.trim()
      ? section("Derivación a", esc(egreso.derivacion_a))
      : "";

  const notasSection =
    egreso.notas?.trim()
      ? section("Notas Adicionales", esc(egreso.notas))
      : "";

  // Firma section
  const registroHtml =
    profesional?.numero_registro && profesional?.tipo_registro
      ? `<div style="font-size:10px; color:#475569; margin-top:2px;">${esc(profesional.tipo_registro)}: ${esc(profesional.numero_registro)}</div>`
      : "";

  return `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; background: #FFFFFF; color: #1E293B;">

  <!-- HEADER -->
  <div style="display: flex; align-items: center; padding-bottom: 16px; border-bottom: 2px solid #0D9488; margin-bottom: 24px;">
    ${logoHtml}
    <div>
      <div style="font-size:20px; font-weight:700; color:#0F172A;">${esc(clinica.nombre)}</div>
      ${direccionHtml}
    </div>
  </div>

  <!-- TITLE -->
  <div style="text-align:center; margin-bottom:24px;">
    <h1 style="font-size:22px; font-weight:700; color:#0F172A; letter-spacing:4px; margin:0; text-transform:uppercase;">EPICRISIS</h1>
    <div style="font-size:11px; color:#475569; margin-top:4px;">Resumen de Alta Clínica</div>
  </div>

  <!-- PATIENT DATA -->
  <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin-bottom:16px;">
    <div style="font-size:11px; font-weight:700; color:#0D9488; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Datos del Paciente</div>
    ${pacienteFields}
  </div>

  <!-- DATES -->
  <div style="display:flex; gap:16px; margin-bottom:16px;">
    <div style="flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px;">
      <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:4px;">Fecha de Ingreso</div>
      <div style="font-size:14px; color:#1E293B;">${formatDate(fechaIngreso)}</div>
    </div>
    <div style="flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px;">
      <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:4px;">Fecha de Egreso</div>
      <div style="font-size:14px; color:#1E293B;">${formatDate(egreso.firmado_at)}</div>
    </div>
    <div style="flex:1; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px;">
      <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:4px;">Tipo de Egreso</div>
      <div style="font-size:14px; font-weight:600; color:#1E293B;">${tipoLabel}</div>
    </div>
  </div>

  <!-- CLINICAL SECTIONS -->
  ${diagnosticoSection}
  ${resumenSection}
  ${estadoSection}
  ${indicacionesSection}
  ${derivacionSection}
  ${notasSection}

  <!-- FIRMA -->
  <div style="border-top:2px solid #E2E8F0; padding-top:16px; margin-top:24px; display:flex; justify-content:flex-end;">
    <div style="text-align:center; min-width:200px;">
      <div style="border-top:1px solid #1E293B; padding-top:8px; margin-top:32px;">
        <div style="font-size:13px; font-weight:700; color:#1E293B;">${esc(profesional?.nombre ?? "Profesional")}</div>
        <div style="font-size:11px; color:#475569; margin-top:2px;">${esc(profesional?.especialidad ?? "")}</div>
        ${registroHtml}
        <div style="font-size:10px; color:#475569; margin-top:2px;">Firmado: ${formatDate(egreso.firmado_at)}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #E2E8F0; padding-top:8px; margin-top:16px; text-align:center; font-size:10px; color:#94A3B8;">
    Documento generado desde FCE — ${esc(clinica.nombre)} — ${formatDate(new Date().toISOString())}
  </div>

</div>
`.trim();
}
