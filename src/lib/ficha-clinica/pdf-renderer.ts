/**
 * Renderer HTML de la Ficha Clínica Electrónica completa (Decreto 41 / Ley 20.584).
 * Patrón: lib/prescripciones/pdf-renderer.ts y lib/egresos/pdf-renderer.ts.
 * html2pdf.js no resuelve CSS variables — hex hardcoded obligatorio.
 * escapeHtml() obligatorio en todo campo de texto.
 */

import type { Patient } from "@/types/patient";
import type { CifAssessment, CifItem } from "@/types/cif";
import type { Intervention } from "@/types/soap";
import type { MedicamentoPrescrito } from "@/types/prescripcion";
import type { ExamenIndicado } from "@/types/orden-examen";
import type { ICDCodeSnap } from "@/lib/icd/types";
import type { NivelGAS, EstadoPlanIntervencion } from "@/types/plan-intervencion";
import type { TipoEgreso } from "@/types/egreso";
import { TIPOS_EGRESO } from "@/types/egreso";
import { calculateAge } from "@/lib/utils";
import { isRichTextHtml } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";

// ── Tipos de data compilada ───────────────────────────────────────────────────

export interface AdendaPdfRow {
  tipo_adenda: string;
  motivo: string;
  contenido: string;
  override_director: boolean;
  override_motivo: string | null;
  created_at: string;
  autorNombre: string;
}

export interface FichaClinicaData {
  generadoEl: string; // string ya formateado es-CL
  clinica: {
    nombre: string;
    logo_url: string | null;
    iniciales: string | null;
    direccion: string | null;
  };
  paciente: Patient;
  anamnesis: {
    motivo_consulta: string | null;
    antecedentes_medicos: unknown;
    antecedentes_quirurgicos: unknown;
    farmacologia: unknown;
    alergias: unknown;
    red_flags: Record<string, boolean> | null;
    habitos: unknown;
  } | null;
  encuentros: Array<{
    id: string;
    especialidad: string | null;
    status: string | null;
    started_at: string | null;
    profesional: { nombre: string | null } | null;
  }>;
  signosVitales: Array<{
    recorded_at: string;
    presion_arterial: string | null;
    frecuencia_cardiaca: number | null;
    spo2: number | null;
    temperatura: number | null;
    frecuencia_respiratoria: number | null;
  }>;
  notasSoap: Array<{
    id: string;
    subjetivo: string | null;
    objetivo: string | null;
    analisis_cif: unknown;
    plan: string | null;
    intervenciones: unknown;
    tareas_domiciliarias: string | null;
    firmado_at: string | null;
    created_at: string;
    encuentro: { especialidad: string | null; started_at: string | null } | null;
  }>;
  notasClinicas: Array<{
    id: string;
    motivo_consulta: string | null;
    contenido: string;
    diagnostico: string | null;
    icd_codigos: unknown;
    icd_version: string | null;
    plan: string | null;
    secciones_estructuradas: unknown;
    firmado_at: string | null;
    created_at: string;
    encuentro: { especialidad: string | null; started_at: string | null } | null;
  }>;
  evaluaciones: Array<{
    id: string;
    especialidad: string | null;
    sub_area: string | null;
    data: unknown;
    created_at: string;
  }>;
  instrumentos: Array<{
    id: string;
    puntaje_total: number | null;
    interpretacion: string | null;
    notas: string | null;
    aplicado_at: string;
    instrumento: { nombre: string | null } | null;
  }>;
  consentimientos: Array<{
    id: string;
    tipo: string;
    firmado_at: string | null;
  }>;
  prescripciones: Array<{
    id: string;
    folio_display: string;
    tipo: string;
    medicamentos: unknown;
    indicaciones_generales: string | null;
    diagnostico_asociado: string | null;
    firmado_at: string | null;
    prof_nombre_snapshot: string | null;
  }>;
  ordenesExamen: Array<{
    id: string;
    folio_display: string;
    examenes: unknown;
    diagnostico_presuntivo: string | null;
    prioridad: string | null;
    firmado_at: string | null;
    prof_nombre_snapshot: string | null;
  }>;
  planesIntervencion: Array<{
    id: string;
    titulo: string;
    diagnostico: string | null;
    estado: EstadoPlanIntervencion | string;
    objetivos: Array<{
      dominio_label: string | null;
      descripcion: string | null;
      criterio_logro: string | null;
      nivel_actual: NivelGAS | number | null;
    }>;
  }>;
  egreso: {
    tipo_egreso: TipoEgreso | string;
    diagnostico_egreso: string | null;
    resumen_tratamiento: string | null;
    estado_al_egreso: string | null;
    indicaciones_post_egreso: string | null;
    derivacion_a: string | null;
    firmado_at: string | null;
  } | null;
  /** Adendas por id_documento — clave = UUID del documento original */
  adendas: Record<string, AdendaPdfRow[]>;
}

// ── Constantes de presentación ────────────────────────────────────────────────

const INK = "#1E293B";
const INK_2 = "#475569";
const INK_3 = "#94A3B8";
const TEAL = "#0D9488";
const TEAL_DK = "#006B6B";
const BG_SOFT = "#F8FAFC";
const BG_HEAD = "#F1F5F9";
const BORDER = "#E2E8F0";

const RED_FLAG_LABELS: Record<string, string> = {
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  tvp: "TVP",
  oncologico: "Oncológico activo",
  fiebre: "Fiebre",
  alergias_severas: "Alergias severas",
  infeccion_cutanea: "Infección cutánea",
  fragilidad_capilar: "Fragilidad capilar",
};

const GAS_LABELS: Record<string, string> = {
  "-2": "-2 · Mucho peor que lo esperado",
  "-1": "-1 · Algo peor que lo esperado",
  "0": "0 · Resultado esperado",
  "1": "+1 · Algo mejor que lo esperado",
  "2": "+2 · Mucho mejor que lo esperado",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const esc = escapeHtml;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function humanize(s: string | null | undefined): string {
  if (!s) return "—";
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function asArray<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function str(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function sectionTitle(title: string): string {
  return `
    <div style="border-left:3px solid ${TEAL}; padding-left:10px; margin:18px 0 8px;">
      <div style="font-size:11px; font-weight:700; color:${TEAL_DK}; text-transform:uppercase; letter-spacing:1px;">${esc(title)}</div>
    </div>`;
}

function field(label: string, value: string): string {
  if (!value || value === "—") return "";
  return `
    <div style="margin-bottom:4px;">
      <span style="font-size:9px; color:${INK_3}; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(label)}: </span>
      <span style="font-size:11px; color:${INK}; white-space:pre-wrap;">${esc(value)}</span>
    </div>`;
}

/**
 * Campo de texto clínico potencialmente rich-text.
 * - HTML rich-text: insertar directo (ya sanitizado server-side al guardar — NO re-escapar).
 * - Texto plano legacy: delegar a field() que escapa y preserva saltos.
 */
function richField(label: string, value: string | null | undefined): string {
  if (!value) return "";
  if (isRichTextHtml(value)) {
    // Backstop de render: re-sanitiza SIEMPRE. Cubre filas legacy que se guardaron antes
    // del sanitize en el write-path (no hay migration de limpieza de datos históricos).
    return `
    <div style="margin-bottom:4px;">
      <span style="font-size:9px; color:${INK_3}; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(label)}: </span>
      <div class="rte-pdf" style="font-size:11px; color:${INK}; margin-top:2px;">${sanitizeRichText(value)}</div>
    </div>`;
  }
  return field(label, value);
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const head = headers
    .map(
      (h) =>
        `<th style="text-align:left; padding:4px 8px; font-size:8px; font-weight:700; color:${TEAL_DK}; text-transform:uppercase; letter-spacing:0.5px;">${esc(h)}</th>`
    )
    .join("");
  const body = rows
    .map(
      (cells, i) =>
        `<tr style="background:${i % 2 === 0 ? "#FFFFFF" : BG_SOFT};">${cells
          .map((c) => `<td style="padding:4px 8px; font-size:10px; color:${INK}; vertical-align:top;">${c}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `
    <table style="width:100%; border-collapse:collapse; margin-bottom:10px; border:1px solid ${BORDER};">
      <thead><tr style="background:${BG_HEAD};">${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function entryCard(headerLeft: string, headerRight: string, body: string): string {
  if (!body.trim()) return "";
  return `
    <div style="border:1px solid ${BORDER}; border-radius:6px; margin-bottom:10px; overflow:hidden; page-break-inside:avoid;">
      <table style="width:100%; border-collapse:collapse; background:${BG_HEAD};">
        <tr>
          <td style="padding:5px 10px; font-size:9px; font-weight:700; color:${INK_2};">${headerLeft}</td>
          <td style="padding:5px 10px; font-size:9px; font-weight:700; color:#16A34A; text-align:right;">${headerRight}</td>
        </tr>
      </table>
      <div style="padding:8px 10px;">${body}</div>
    </div>`;
}

/** Render genérico defensivo de un objeto jsonb plano (1 nivel de anidación). */
function renderJsonbFields(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  let out = "";
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v === null || v === undefined || v === "") continue;
    const label = humanize(k);
    if (Array.isArray(v)) {
      const items = v.map((x) => str(x)).filter(Boolean);
      if (items.length > 0) out += field(label, items.join(", "));
    } else if (typeof v === "object") {
      const nested = Object.entries(v as Record<string, unknown>)
        .map(([nk, nv]) => {
          const s = str(nv);
          return s ? `${humanize(nk)}: ${s}` : "";
        })
        .filter(Boolean)
        .join(" · ");
      if (nested) out += field(label, nested);
    } else {
      const s = str(v);
      if (s) out += richField(label, s);
    }
  }
  return out;
}

// ── Secciones ────────────────────────────────────────────────────────────────

function buildIdentificacion(p: Patient): string {
  const fullName =
    [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") || "Sin registro";
  const age = calculateAge(p.fecha_nacimiento);
  const prev = p.prevision
    ? [p.prevision.tipo, p.prevision.tramo ? `Tramo ${p.prevision.tramo}` : null, p.prevision.isapre]
        .filter(Boolean)
        .join(" · ")
    : "—";
  const dir = p.direccion
    ? [p.direccion.calle, p.direccion.numero, p.direccion.comuna, p.direccion.region]
        .filter(Boolean)
        .join(", ")
    : "—";
  const emergencia = p.contacto_emergencia
    ? [p.contacto_emergencia.nombre, p.contacto_emergencia.parentesco, p.contacto_emergencia.telefono]
        .filter(Boolean)
        .join(" · ")
    : "—";

  const rows: Array<[string, string]> = [
    ["Nombre completo", fullName],
    ["RUT", p.rut ?? "—"],
    ["Fecha de nacimiento", fmtDate(p.fecha_nacimiento)],
    ["Edad", age !== null ? `${age} años` : "—"],
    ["Sexo registral", p.sexo_registral ?? "—"],
    ["Identidad de género", p.identidad_genero ?? "—"],
    ["Nacionalidad", p.nacionalidad ?? "—"],
    ["Ocupación", p.ocupacion ?? "—"],
    ["Previsión", prev],
    ["Teléfono", p.telefono ?? "—"],
    ["Email", p.email ?? "—"],
    ["Dirección", dir],
    ["Contacto de emergencia", emergencia],
    ["Estado clínico", humanize(p.estado_clinico ?? null)],
  ];

  const half = Math.ceil(rows.length / 2);
  const col = (items: Array<[string, string]>) => items.map(([l, v]) => field(l, v)).join("");
  return (
    sectionTitle("1. Identificación del Paciente (M1)") +
    `<table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:50%; vertical-align:top; padding-right:12px;">${col(rows.slice(0, half))}</td>
        <td style="width:50%; vertical-align:top; padding-left:12px;">${col(rows.slice(half))}</td>
      </tr>
    </table>`
  );
}

function buildAnamnesis(a: FichaClinicaData["anamnesis"]): string {
  if (!a) return "";
  let body = "";

  body += field("Motivo de consulta", a.motivo_consulta ?? "");

  const redFlags = a.red_flags
    ? Object.entries(a.red_flags)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => RED_FLAG_LABELS[k] ?? humanize(k))
    : [];
  if (redFlags.length > 0) {
    body += `
      <div style="background:#FEE2E2; border:1px solid #FCA5A5; border-radius:4px; padding:6px 10px; margin:6px 0;">
        <span style="font-weight:700; color:#DC2626; font-size:9px; text-transform:uppercase;">⚠ Red flags activas: </span>
        <span style="color:#991B1B; font-size:10px;">${esc(redFlags.join(" · "))}</span>
      </div>`;
  }

  const medicos = asArray<{ patologia?: string; desde?: string; controlado?: boolean }>(
    a.antecedentes_medicos
  );
  if (medicos.length > 0) {
    body += table(
      ["Patología", "Desde", "Controlado"],
      medicos.map((m) => [esc(m.patologia ?? "—"), esc(m.desde ?? "—"), m.controlado ? "Sí" : "No"])
    );
  }

  const quirurgicos = asArray<{ tipo?: string; fecha?: string; hospital?: string }>(
    a.antecedentes_quirurgicos
  );
  if (quirurgicos.length > 0) {
    body += `<div style="font-size:9px; font-weight:700; color:${INK_3}; text-transform:uppercase; margin:6px 0 3px;">Antecedentes quirúrgicos</div>`;
    body += table(
      ["Tipo", "Fecha", "Hospital"],
      quirurgicos.map((q) => [esc(q.tipo ?? "—"), esc(q.fecha ?? "—"), esc(q.hospital ?? "—")])
    );
  }

  const farmacos = asArray<{ medicamento?: string; dosis?: string; frecuencia?: string }>(
    a.farmacologia
  );
  if (farmacos.length > 0) {
    body += `<div style="font-size:9px; font-weight:700; color:${INK_3}; text-transform:uppercase; margin:6px 0 3px;">Farmacología activa</div>`;
    body += table(
      ["Medicamento", "Dosis", "Frecuencia"],
      farmacos.map((f) => [esc(f.medicamento ?? "—"), esc(f.dosis ?? "—"), esc(f.frecuencia ?? "—")])
    );
  }

  const alergias = asArray<{ sustancia?: string; severidad?: string; reaccion?: string }>(a.alergias);
  if (alergias.length > 0) {
    body += `<div style="font-size:9px; font-weight:700; color:${INK_3}; text-transform:uppercase; margin:6px 0 3px;">Alergias</div>`;
    body += table(
      ["Sustancia", "Severidad", "Reacción"],
      alergias.map((al) => [esc(al.sustancia ?? "—"), humanize(al.severidad), esc(al.reaccion ?? "—")])
    );
  }

  const h = a.habitos as { tabaco?: string; alcohol?: string; ejercicio?: string; sueno_horas?: number } | null;
  if (h && typeof h === "object") {
    const habitos = [
      h.tabaco ? `Tabaco: ${humanize(h.tabaco)}` : null,
      h.alcohol ? `Alcohol: ${humanize(h.alcohol)}` : null,
      h.ejercicio ? `Ejercicio: ${humanize(h.ejercicio)}` : null,
      h.sueno_horas ? `Sueño: ${h.sueno_horas} h` : null,
    ].filter(Boolean);
    if (habitos.length > 0) body += field("Hábitos", habitos.join(" · "));
  }

  if (!body.trim()) return "";
  return sectionTitle("2. Anamnesis (M2)") + body;
}

function buildEncuentros(encuentros: FichaClinicaData["encuentros"]): string {
  if (encuentros.length === 0) return "";
  return (
    sectionTitle("3. Registro de Encuentros") +
    table(
      ["Fecha", "Especialidad", "Profesional", "Estado"],
      encuentros.map((e) => [
        fmtDate(e.started_at),
        esc(e.especialidad ?? "—"),
        esc(e.profesional?.nombre ?? "—"),
        humanize(e.status),
      ])
    )
  );
}

function buildSignosVitales(vitales: FichaClinicaData["signosVitales"]): string {
  if (vitales.length === 0) return "";
  return (
    sectionTitle("4. Signos Vitales") +
    table(
      ["Fecha", "PA", "FC", "SpO₂", "T°", "FR"],
      vitales.map((v) => [
        fmtDate(v.recorded_at),
        esc(v.presion_arterial ?? "—"),
        v.frecuencia_cardiaca != null ? `${v.frecuencia_cardiaca} bpm` : "—",
        v.spo2 != null ? `${v.spo2}%` : "—",
        v.temperatura != null ? `${v.temperatura} °C` : "—",
        v.frecuencia_respiratoria != null ? `${v.frecuencia_respiratoria} rpm` : "—",
      ])
    )
  );
}

function renderCif(raw: unknown): string {
  const cif = raw as CifAssessment | null;
  if (!cif || typeof cif !== "object") return "";
  const grupos: Array<[string, CifItem[]]> = [
    ["Funciones", asArray<CifItem>(cif.funciones)],
    ["Actividades", asArray<CifItem>(cif.actividades)],
    ["Participación", asArray<CifItem>(cif.participacion)],
    ["Contexto", asArray<CifItem>(cif.contexto)],
  ];
  const lineas = grupos
    .flatMap(([grupo, items]) =>
      items.map(
        (it) =>
          `${grupo} · ${esc(it.code ?? "")} ${esc(it.description ?? "")}${
            it.quantifier != null ? ` (calificador ${esc(it.quantifier)})` : ""
          }`
      )
    )
    .filter(Boolean);
  if (lineas.length === 0) return "";
  return `
    <div style="margin-bottom:4px;">
      <span style="font-size:9px; color:${INK_3}; font-weight:700; text-transform:uppercase;">A — Análisis CIF: </span>
      <div style="font-size:10px; color:${INK}; margin-top:2px;">${lineas.join("<br/>")}</div>
    </div>`;
}

// ── Adendas ───────────────────────────────────────────────────────────────────

const ADENDA_BORDER: Record<string, string> = {
  adenda: "#64748B",
  errata: "#D97706",
  anulacion: "#DC2626",
};
const ADENDA_BG_COLOR: Record<string, string> = {
  adenda: "#F8FAFC",
  errata: "#FEF3C7",
  anulacion: "#FEE2E2",
};
const ADENDA_LABEL: Record<string, string> = {
  adenda: "ADENDA",
  errata: "ERRATA / CORRECCIÓN",
  anulacion: "ANULACIÓN",
};

function buildAdendaBlocks(docId: string, adendasMap: Record<string, AdendaPdfRow[]>): string {
  const adendas = adendasMap[docId];
  if (!adendas || adendas.length === 0) return "";
  return adendas
    .map((a) => {
      const tipo = (a.tipo_adenda in ADENDA_BORDER) ? a.tipo_adenda : "adenda";
      const border = ADENDA_BORDER[tipo];
      const bg = ADENDA_BG_COLOR[tipo];
      const label = ADENDA_LABEL[tipo];
      let html = `
    <div style="border-left:3px solid ${border}; background:${bg}; padding:6px 10px 6px 12px; margin:4px 0 4px 16px; border-radius:0 4px 4px 0; page-break-inside:avoid;">
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;"><tr>
        <td style="font-size:8px; font-weight:700; color:${border}; text-transform:uppercase; letter-spacing:0.5px;">${esc(label)}</td>
        <td style="font-size:8px; color:${INK_3}; text-align:right;">${esc(a.autorNombre)} · ${fmtDate(a.created_at)}</td>
      </tr></table>`;
      if (a.motivo) html += `<div style="font-size:9px; color:${INK_2}; margin-bottom:2px;"><strong>Motivo:</strong> ${esc(a.motivo)}</div>`;
      if (a.contenido) html += `<div style="font-size:10px; color:${INK}; white-space:pre-wrap;">${esc(a.contenido)}</div>`;
      if (a.override_director && a.override_motivo) {
        html += `<div style="font-size:8px; color:#92400E; margin-top:4px; font-style:italic;">Autorizado por dirección: ${esc(a.override_motivo)}</div>`;
      }
      html += `</div>`;
      return html;
    })
    .join("");
}

function buildSoaps(soaps: FichaClinicaData["notasSoap"], adendasMap: Record<string, AdendaPdfRow[]>): string {
  if (soaps.length === 0) return "";
  const cards = soaps
    .map((s) => {
      const docAdendas = adendasMap[s.id] ?? [];
      const anulada = docAdendas.some((a) => a.tipo_adenda === "anulacion");
      let body = "";
      body += richField("S — Subjetivo", s.subjetivo);
      body += richField("O — Objetivo", s.objetivo);
      body += renderCif(s.analisis_cif);
      body += richField("P — Plan", s.plan);
      const intervenciones = asArray<Intervention>(s.intervenciones)
        .map((i) =>
          [i.tipo, i.descripcion, i.dosificacion].filter(Boolean).map(String).join(" — ")
        )
        .filter(Boolean);
      if (intervenciones.length > 0) body += field("Intervenciones", intervenciones.join("; "));
      body += richField("Tareas domiciliarias", s.tareas_domiciliarias);
      const fecha = fmtDate(s.encuentro?.started_at ?? s.created_at);
      const esp = s.encuentro?.especialidad ? ` · ${esc(s.encuentro.especialidad)}` : "";
      const headerRight = anulada
        ? `<span style="color:#DC2626; font-weight:700;">⚠ ANULADA</span>`
        : `✓ Firmada ${fmtDate(s.firmado_at)}`;
      return entryCard(`SOAP — ${fecha}${esp}`, headerRight, body) + buildAdendaBlocks(s.id, adendasMap);
    })
    .join("");
  if (!cards.trim()) return "";
  return sectionTitle("5. Evoluciones SOAP (firmadas)") + cards;
}

function buildNotasClinicas(notas: FichaClinicaData["notasClinicas"], adendasMap: Record<string, AdendaPdfRow[]>): string {
  if (notas.length === 0) return "";
  const cards = notas
    .map((n) => {
      let body = "";
      body += field("Motivo", n.motivo_consulta ?? "");
      body += richField("Contenido", n.contenido);
      body += field("Diagnóstico", n.diagnostico ?? "");
      const icd = asArray<ICDCodeSnap>(n.icd_codigos)
        .map((c) => `${c.code ?? ""} ${c.title ?? ""}`.trim())
        .filter(Boolean);
      if (icd.length > 0) {
        body += field(`Códigos ${n.icd_version ?? "ICD-11"}`, icd.join("; "));
      }
      body += richField("Plan", n.plan);
      // Secciones estructuradas: P2 anida { seccion: { campo: valor } };
      // los campos M10 (conductas_observadas, etc.) son strings planos en la raíz
      if (n.secciones_estructuradas && typeof n.secciones_estructuradas === "object") {
        for (const [seccion, campos] of Object.entries(
          n.secciones_estructuradas as Record<string, unknown>
        )) {
          if (typeof campos === "string") {
            if (campos.trim()) body += richField(humanize(seccion), campos);
            continue;
          }
          const rendered = renderJsonbFields(campos);
          if (rendered) {
            body += `<div style="font-size:9px; font-weight:700; color:${INK_3}; text-transform:uppercase; margin:6px 0 3px;">${esc(humanize(seccion))}</div>${rendered}`;
          }
        }
      }
      const docAdendas = adendasMap[n.id] ?? [];
      const anulada = docAdendas.some((a) => a.tipo_adenda === "anulacion");
      const fecha = fmtDate(n.encuentro?.started_at ?? n.created_at);
      const esp = n.encuentro?.especialidad ? ` · ${esc(n.encuentro.especialidad)}` : "";
      const headerRight = anulada
        ? `<span style="color:#DC2626; font-weight:700;">⚠ ANULADA</span>`
        : `✓ Firmada ${fmtDate(n.firmado_at)}`;
      return entryCard(`Nota clínica — ${fecha}${esp}`, headerRight, body) + buildAdendaBlocks(n.id, adendasMap);
    })
    .join("");
  if (!cards.trim()) return "";
  return sectionTitle("6. Notas Clínicas (firmadas)") + cards;
}

function buildEvaluaciones(evaluaciones: FichaClinicaData["evaluaciones"]): string {
  if (evaluaciones.length === 0) return "";
  const cards = evaluaciones
    .map((ev) => {
      const body = renderJsonbFields(ev.data);
      const subArea = ev.sub_area ? ` · ${esc(humanize(ev.sub_area))}` : "";
      return entryCard(
        `Evaluación — ${fmtDate(ev.created_at)} · ${esc(ev.especialidad ?? "—")}${subArea}`,
        "",
        body || field("Registro", "Evaluación registrada (ver sistema para detalle)")
      );
    })
    .join("");
  return sectionTitle("7. Evaluaciones por Especialidad") + cards;
}

function buildInstrumentos(instrumentos: FichaClinicaData["instrumentos"]): string {
  if (instrumentos.length === 0) return "";
  return (
    sectionTitle("8. Instrumentos Aplicados") +
    table(
      ["Fecha", "Instrumento", "Puntaje", "Interpretación", "Notas"],
      instrumentos.map((i) => [
        fmtDate(i.aplicado_at),
        esc(i.instrumento?.nombre ?? "—"),
        i.puntaje_total != null ? esc(i.puntaje_total) : "—",
        esc(i.interpretacion ?? "—"),
        esc(i.notas ?? "—"),
      ])
    )
  );
}

function buildConsentimientos(consentimientos: FichaClinicaData["consentimientos"]): string {
  if (consentimientos.length === 0) return "";
  return (
    sectionTitle("9. Consentimientos Informados (firmados)") +
    table(
      ["Tipo", "Fecha de firma"],
      consentimientos.map((c) => [humanize(c.tipo), fmtDate(c.firmado_at)])
    )
  );
}

function buildPrescripciones(prescripciones: FichaClinicaData["prescripciones"]): string {
  if (prescripciones.length === 0) return "";
  const cards = prescripciones
    .map((p) => {
      let body = "";
      const meds = asArray<MedicamentoPrescrito>(p.medicamentos)
        .map((m) =>
          [
            m.principio_activo,
            m.presentacion,
            m.dosis,
            m.frecuencia,
            m.duracion ? `por ${m.duracion}` : null,
          ]
            .filter(Boolean)
            .map(String)
            .join(" · ")
        )
        .filter(Boolean);
      if (meds.length > 0) body += field("Medicamentos", meds.join("\n"));
      body += field("Indicaciones generales", p.indicaciones_generales ?? "");
      body += field("Diagnóstico asociado", p.diagnostico_asociado ?? "");
      body += field("Profesional", p.prof_nombre_snapshot ?? "");
      const tipo = p.tipo === "farmacologica" ? "Receta" : "Indicación general";
      return entryCard(
        `${tipo} ${esc(p.folio_display)} — ${fmtDate(p.firmado_at)}`,
        "✓ Firmada",
        body
      );
    })
    .join("");
  if (!cards.trim()) return "";
  return sectionTitle("10. Prescripciones (firmadas)") + cards;
}

function buildOrdenesExamen(ordenes: FichaClinicaData["ordenesExamen"]): string {
  if (ordenes.length === 0) return "";
  const cards = ordenes
    .map((o) => {
      let body = "";
      const examenes = asArray<ExamenIndicado>(o.examenes)
        .map((e) =>
          [e.nombre, e.categoria ? `(${humanize(e.categoria)})` : null, e.urgente ? "URGENTE" : null]
            .filter(Boolean)
            .map(String)
            .join(" ")
        )
        .filter(Boolean);
      if (examenes.length > 0) body += field("Exámenes", examenes.join("\n"));
      body += field("Diagnóstico presuntivo", o.diagnostico_presuntivo ?? "");
      body += field("Prioridad", humanize(o.prioridad));
      body += field("Profesional", o.prof_nombre_snapshot ?? "");
      return entryCard(
        `Orden de examen ${esc(o.folio_display)} — ${fmtDate(o.firmado_at)}`,
        "✓ Firmada",
        body
      );
    })
    .join("");
  if (!cards.trim()) return "";
  return sectionTitle("11. Órdenes de Examen (firmadas)") + cards;
}

function buildPlanesIntervencion(planes: FichaClinicaData["planesIntervencion"]): string {
  if (planes.length === 0) return "";
  const cards = planes
    .map((plan) => {
      let body = "";
      body += field("Diagnóstico", plan.diagnostico ?? "");
      body += field("Estado", humanize(plan.estado));
      if (plan.objetivos.length > 0) {
        body += table(
          ["Dominio", "Objetivo", "Criterio de logro", "Nivel GAS actual"],
          plan.objetivos.map((o) => [
            esc(o.dominio_label ?? "—"),
            esc(o.descripcion ?? "—"),
            esc(o.criterio_logro ?? "—"),
            o.nivel_actual != null ? esc(GAS_LABELS[String(o.nivel_actual)] ?? o.nivel_actual) : "—",
          ])
        );
      }
      return entryCard(`Plan de intervención — ${esc(plan.titulo)}`, "", body);
    })
    .join("");
  return sectionTitle("12. Plan de Intervención (M10)") + cards;
}

function buildEgreso(egreso: FichaClinicaData["egreso"]): string {
  if (!egreso) return "";
  const tipoLabel =
    TIPOS_EGRESO.find((t) => t.value === egreso.tipo_egreso)?.label ?? humanize(egreso.tipo_egreso);
  let body = "";
  body += field("Tipo de egreso", tipoLabel);
  body += field("Diagnóstico de egreso", egreso.diagnostico_egreso ?? "");
  body += field("Resumen del tratamiento", egreso.resumen_tratamiento ?? "");
  body += field("Estado al egreso", egreso.estado_al_egreso ?? "");
  body += field("Indicaciones post-egreso", egreso.indicaciones_post_egreso ?? "");
  body += field("Derivación a", egreso.derivacion_a ?? "");
  return (
    sectionTitle("13. Egreso / Epicrisis") +
    entryCard(`Egreso — ${fmtDate(egreso.firmado_at)}`, "✓ Firmado", body)
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderFichaCompletaPdf(data: FichaClinicaData): string {
  const { clinica, paciente, generadoEl } = data;

  const logoHtml = clinica.logo_url
    ? `<img src="${esc(clinica.logo_url)}" style="height:44px; object-fit:contain;" />`
    : `<div style="width:44px; height:44px; background:${TEAL}; border-radius:8px; text-align:center; line-height:44px; font-size:16px; font-weight:700; color:#FFFFFF;">${esc(clinica.iniciales ?? "FC")}</div>`;

  const direccionHtml = clinica.direccion
    ? `<div style="font-size:11px; color:${INK_2}; margin-top:2px;">${esc(clinica.direccion)}</div>`
    : "";

  const secciones = [
    buildIdentificacion(paciente),
    buildAnamnesis(data.anamnesis),
    buildEncuentros(data.encuentros),
    buildSignosVitales(data.signosVitales),
    buildSoaps(data.notasSoap, data.adendas),
    buildNotasClinicas(data.notasClinicas, data.adendas),
    buildEvaluaciones(data.evaluaciones),
    buildInstrumentos(data.instrumentos),
    buildConsentimientos(data.consentimientos),
    buildPrescripciones(data.prescripciones),
    buildOrdenesExamen(data.ordenesExamen),
    buildPlanesIntervencion(data.planesIntervencion),
    buildEgreso(data.egreso),
  ].join("");

  return `
<div style="font-family: Arial, sans-serif; max-width:800px; margin:0 auto; padding:28px 32px; background:#FFFFFF; color:${INK};">

  <style>
    .rte-pdf p { margin: 0 0 4px 0; }
    .rte-pdf h2 { font-size: 13pt; font-weight: 600; margin: 6px 0 3px; }
    .rte-pdf h3 { font-size: 12pt; font-weight: 600; margin: 5px 0 3px; }
    .rte-pdf ul, .rte-pdf ol { padding-left: 20px; margin: 4px 0; }
    .rte-pdf ul { list-style: disc; }
    .rte-pdf ol { list-style: decimal; }
    .rte-pdf li { margin: 2px 0; }
    .rte-pdf blockquote { border-left: 2px solid #006B6B; padding-left: 8px; color: #475569; margin: 4px 0; }
    .rte-pdf strong { font-weight: 600; }
    .rte-pdf u { text-decoration: underline; }
  </style>

  <!-- HEADER -->
  <table style="width:100%; border-collapse:collapse; border-bottom:2px solid ${TEAL}; margin-bottom:18px;">
    <tr>
      <td style="padding-bottom:14px; vertical-align:middle; width:58px;">${logoHtml}</td>
      <td style="padding-bottom:14px; vertical-align:middle; padding-left:14px;">
        <div style="font-size:18px; font-weight:700; color:#0F172A;">${esc(clinica.nombre)}</div>
        ${direccionHtml}
      </td>
      <td style="padding-bottom:14px; vertical-align:middle; text-align:right; font-size:9px; color:${INK_3};">
        <div>Generado: ${esc(generadoEl)}</div>
        <div style="margin-top:2px;">Decreto 41 MINSAL · Ley 20.584</div>
      </td>
    </tr>
  </table>

  <!-- TITLE -->
  <div style="text-align:center; margin-bottom:18px;">
    <h1 style="font-size:20px; font-weight:700; color:#0F172A; letter-spacing:3px; margin:0; text-transform:uppercase;">Ficha Clínica Electrónica</h1>
    <div style="font-size:10px; color:${INK_2}; margin-top:4px;">Registro clínico completo del paciente — generado el ${esc(generadoEl)}</div>
  </div>

  ${secciones}

  <!-- FOOTER -->
  <div style="border-top:1px solid ${BORDER}; padding-top:8px; margin-top:24px; text-align:center; font-size:9px; color:${INK_3};">
    Ficha Clínica Electrónica — ${esc(clinica.nombre)} — Generado el ${esc(generadoEl)}
  </div>

</div>
`.trim();
}
