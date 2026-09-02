/**
 * presupuestoHtml — builder PURO del HTML del PDF de presupuesto (sprint PRE-1, F6).
 *
 * - Función pura, sin DOM ni browser APIs: testeable en Node (caso 12 del §10:
 *   ningún campo honorario_* puede aparecer en el HTML de salida — capa B jamás
 *   se renderiza al paciente).
 * - Todo texto de usuario pasa por esc() (XSS-safe).
 * - Desglose completo: subtotal / descuento / neto / IVA (D-1: precio con IVA
 *   incluido, el IVA se desagrega) / total. Totales leídos del presupuesto
 *   persistidos server-side; nada se recalcula en el cliente.
 */

import type { Presupuesto, PresupuestoEstado, PresupuestoItem } from "@/types/presupuesto";

export type PresupuestoParaPdf = Pick<
  Presupuesto,
  | "id"
  | "titulo"
  | "estado"
  | "notas"
  | "firmado_at"
  | "created_at"
  | "subtotal_clp"
  | "descuento_clp"
  | "neto_clp"
  | "iva_clp"
  | "total_clp"
> & {
  items?: Array<
    Pick<
      PresupuestoItem,
      | "descripcion"
      | "cantidad"
      | "precio_unitario"
      | "descuento_clp"
      | "total_linea_clp"
      | "pieza"
      | "superficie"
    >
  >;
  profesional?: { nombre: string; especialidad: string } | null;
};

const ESTADOS: Record<PresupuestoEstado, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

export function presupuestoHtml(
  presupuesto: PresupuestoParaPdf,
  clinicaNombre = ""
): string {
  const items = presupuesto.items ?? [];
  const subtotal = presupuesto.subtotal_clp ?? 0;
  const descuento = presupuesto.descuento_clp ?? 0;
  const neto = presupuesto.neto_clp ?? 0;
  const iva = presupuesto.iva_clp ?? 0;
  const total = presupuesto.total_clp ?? 0;
  const estado = ESTADOS[presupuesto.estado] ?? String(presupuesto.estado);

  const filas = items
    .map((it) => {
      const detalle =
        it.pieza != null
          ? ` <span style="color:#64748B">(pieza ${it.pieza}${it.superficie ? ` · ${esc(it.superficie)}` : ""})</span>`
          : it.superficie
            ? ` <span style="color:#64748B">(${esc(it.superficie)})</span>`
            : "";
      return `<tr>
<td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:10pt;color:#1E293B">${esc(it.descripcion)}${detalle}</td>
<td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:10pt;text-align:center;color:#475569">${it.cantidad}</td>
<td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:10pt;text-align:right;color:#475569">${formatCLP(it.precio_unitario)}</td>
<td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:10pt;text-align:right;color:#475569">${it.descuento_clp > 0 ? `−${formatCLP(it.descuento_clp)}` : "—"}</td>
<td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:10pt;text-align:right;font-weight:600;color:#1E293B">${formatCLP(it.total_linea_clp)}</td>
</tr>`;
    })
    .join("\n");

  const filasTotales = [
    `<tr><td colspan="4" style="padding:6px 8px;text-align:right;font-size:9pt;color:#64748B">Subtotal</td><td style="padding:6px 8px;text-align:right;font-size:9pt;color:#475569">${formatCLP(subtotal)}</td></tr>`,
    descuento > 0
      ? `<tr><td colspan="4" style="padding:2px 8px;text-align:right;font-size:9pt;color:#64748B">Descuento</td><td style="padding:2px 8px;text-align:right;font-size:9pt;color:#475569">−${formatCLP(descuento)}</td></tr>`
      : "",
    iva > 0
      ? `<tr><td colspan="4" style="padding:2px 8px;text-align:right;font-size:9pt;color:#64748B">Neto (sin IVA)</td><td style="padding:2px 8px;text-align:right;font-size:9pt;color:#475569">${formatCLP(neto)}</td></tr>
<tr><td colspan="4" style="padding:2px 8px;text-align:right;font-size:9pt;color:#64748B">IVA (19%)</td><td style="padding:2px 8px;text-align:right;font-size:9pt;color:#475569">${formatCLP(iva)}</td></tr>`
      : "",
    `<tr style="background:#F1F5F9"><td colspan="4" style="padding:10px 8px;text-align:right;font-size:11pt;font-weight:bold;color:#1E293B">Total</td><td style="padding:10px 8px;text-align:right;font-size:13pt;font-weight:bold;color:#1E293B">${formatCLP(total)}</td></tr>`,
  ]
    .filter(Boolean)
    .join("\n");

  return `<div style="width:215.9mm;min-height:279.4mm;padding:20mm;font-family:Arial,sans-serif;font-size:11pt;color:#1E293B;background-color:#ffffff;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #E2E8F0">
<div style="font-size:14pt;font-weight:bold;color:#1E293B">${esc(clinicaNombre)}</div>
<div style="font-size:13pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#1E293B">Presupuesto Clínico</div>
</div>
<div style="margin-bottom:16px">
<div style="font-size:12pt;font-weight:bold;color:#1E293B">${esc(presupuesto.titulo)}</div>
<div style="font-size:9pt;color:#64748B;margin-top:2px">Fecha: ${formatFecha(presupuesto.firmado_at ?? presupuesto.created_at)} · Estado: ${esc(estado)}</div>
</div>
${
  presupuesto.notas
    ? `<div style="margin-bottom:16px"><div style="font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:4px">Notas</div><div style="font-size:10pt;color:#475569;white-space:pre-wrap">${esc(presupuesto.notas)}</div></div>`
    : ""
}
<div style="margin-bottom:20px">
${
  items.length > 0
    ? `<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#F8FAFC">
<th style="padding:8px;text-align:left;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;border-bottom:2px solid #E2E8F0">Descripción</th>
<th style="padding:8px;text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;border-bottom:2px solid #E2E8F0">Cant.</th>
<th style="padding:8px;text-align:right;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;border-bottom:2px solid #E2E8F0">Precio Unit.</th>
<th style="padding:8px;text-align:right;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;border-bottom:2px solid #E2E8F0">Dcto.</th>
<th style="padding:8px;text-align:right;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;border-bottom:2px solid #E2E8F0">Total</th>
</tr></thead>
<tbody>${filas}</tbody>
<tfoot>${filasTotales}</tfoot>
</table>`
    : `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:10pt">Sin ítems registrados.</div>`
}
</div>
${
  presupuesto.profesional
    ? `<div style="margin-top:30px;display:flex;flex-direction:column;align-items:center"><div style="width:250px;border-top:1px solid #1E293B;padding-top:8px;text-align:center"><div style="font-size:11pt;font-weight:600;color:#1E293B">${esc(presupuesto.profesional.nombre)}</div><div style="font-size:9pt;color:#64748B">${esc(presupuesto.profesional.especialidad)}</div></div></div>`
    : ""
}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:7pt;color:#94A3B8;text-align:center">Presupuesto clínico informativo. Los precios indicados están sujetos a confirmación. Documento generado por FCE Synapta.</div>
</div>`;
}
