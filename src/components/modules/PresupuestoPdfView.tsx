"use client";

import type { Presupuesto } from "@/types/presupuesto";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── DOM builder ───────────────────────────────────────────────────────────────
// Builds the PDF content entirely via DOM APIs (createElement + textContent).
// No innerHTML, no string interpolation of user data — XSS-safe by construction.

function el(
  tag: string,
  style?: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElement {
  const node = document.createElement(tag);
  if (style) Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildPresupuestoDom(
  presupuesto: Presupuesto,
  clinicaNombre: string
): HTMLElement {
  const items = presupuesto.items ?? [];
  const total = items.reduce(
    (sum, it) => sum + it.cantidad * it.precio_unitario,
    0
  );

  // Root wrapper
  const root = el("div", {
    width: "215.9mm",
    minHeight: "279.4mm",
    padding: "20mm",
    fontFamily: "Arial, sans-serif",
    fontSize: "11pt",
    color: "#1E293B",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
  });

  // ── Header ──────────────────────────────────────────────────────────────
  const header = el("div", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "2px solid #E2E8F0",
  });
  header.appendChild(
    el("div", { fontSize: "14pt", fontWeight: "bold", color: "#1E293B" }, clinicaNombre)
  );
  header.appendChild(
    el(
      "div",
      {
        fontSize: "13pt",
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#1E293B",
      },
      "Presupuesto Clínico"
    )
  );
  root.appendChild(header);

  // ── Título y fecha ───────────────────────────────────────────────────────
  const titleBlock = el("div", { marginBottom: "16px" });
  titleBlock.appendChild(
    el("div", { fontSize: "12pt", fontWeight: "bold", color: "#1E293B" }, presupuesto.titulo)
  );
  const meta = el("div", { fontSize: "9pt", color: "#64748B", marginTop: "2px" });
  meta.textContent =
    `Fecha: ${formatFecha(presupuesto.firmado_at ?? presupuesto.created_at)}` +
    ` · Estado: ${presupuesto.estado === "enviado" ? "Enviado" : "Borrador"}`;
  titleBlock.appendChild(meta);
  root.appendChild(titleBlock);

  // ── Notas ────────────────────────────────────────────────────────────────
  if (presupuesto.notas) {
    const notasBlock = el("div", { marginBottom: "16px" });
    notasBlock.appendChild(
      el(
        "div",
        {
          fontSize: "9pt",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#64748B",
          marginBottom: "4px",
        },
        "Notas"
      )
    );
    notasBlock.appendChild(
      el(
        "div",
        { fontSize: "10pt", color: "#475569", whiteSpace: "pre-wrap" },
        presupuesto.notas
      )
    );
    root.appendChild(notasBlock);
  }

  // ── Tabla de ítems ───────────────────────────────────────────────────────
  const tableWrap = el("div", { marginBottom: "20px" });
  const table = document.createElement("table");
  Object.assign(table.style, { width: "100%", borderCollapse: "collapse" });

  // thead
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.background = "#F8FAFC";
  const cols: Array<{ label: string; align: string }> = [
    { label: "Descripción", align: "left" },
    { label: "Cant.", align: "center" },
    { label: "Precio Unit.", align: "right" },
    { label: "Subtotal", align: "right" },
  ];
  for (const col of cols) {
    const th = document.createElement("th");
    Object.assign(th.style, {
      padding: "8px",
      textAlign: col.align,
      fontSize: "9pt",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#64748B",
      borderBottom: "2px solid #E2E8F0",
    });
    th.textContent = col.label;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement("tbody");
  for (const it of items) {
    const tr = document.createElement("tr");
    const cells = [
      { text: it.descripcion, align: "left", color: "#1E293B", weight: "normal" },
      { text: String(it.cantidad), align: "center", color: "#475569", weight: "normal" },
      { text: formatCLP(it.precio_unitario), align: "right", color: "#475569", weight: "normal" },
      {
        text: formatCLP(it.cantidad * it.precio_unitario),
        align: "right",
        color: "#1E293B",
        weight: "600",
      },
    ];
    for (const cell of cells) {
      const td = document.createElement("td");
      Object.assign(td.style, {
        padding: "6px 8px",
        borderBottom: "1px solid #E2E8F0",
        fontSize: "10pt",
        textAlign: cell.align,
        color: cell.color,
        fontWeight: cell.weight,
      });
      td.textContent = cell.text;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  // tfoot — total row
  const tfoot = document.createElement("tfoot");
  const totalRow = document.createElement("tr");
  totalRow.style.background = "#F1F5F9";
  const tdLabel = document.createElement("td");
  tdLabel.colSpan = 3;
  Object.assign(tdLabel.style, {
    padding: "10px 8px",
    textAlign: "right",
    fontSize: "11pt",
    fontWeight: "bold",
    color: "#1E293B",
  });
  tdLabel.textContent = "Total";
  const tdTotal = document.createElement("td");
  Object.assign(tdTotal.style, {
    padding: "10px 8px",
    textAlign: "right",
    fontSize: "13pt",
    fontWeight: "bold",
    color: "#1E293B",
  });
  tdTotal.textContent = formatCLP(total);
  totalRow.appendChild(tdLabel);
  totalRow.appendChild(tdTotal);
  tfoot.appendChild(totalRow);
  table.appendChild(tfoot);

  if (items.length > 0) {
    tableWrap.appendChild(table);
  } else {
    tableWrap.appendChild(
      el(
        "div",
        { padding: "16px", textAlign: "center", color: "#94A3B8", fontSize: "10pt" },
        "Sin ítems registrados."
      )
    );
  }
  root.appendChild(tableWrap);

  // ── Profesional ──────────────────────────────────────────────────────────
  if (presupuesto.profesional) {
    const profSection = el("div", {
      marginTop: "30px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });
    const profBox = el("div", {
      width: "250px",
      borderTop: "1px solid #1E293B",
      paddingTop: "8px",
      textAlign: "center",
    });
    profBox.appendChild(
      el(
        "div",
        { fontSize: "11pt", fontWeight: "600", color: "#1E293B" },
        presupuesto.profesional.nombre
      )
    );
    profBox.appendChild(
      el(
        "div",
        { fontSize: "9pt", color: "#64748B" },
        presupuesto.profesional.especialidad
      )
    );
    profSection.appendChild(profBox);
    root.appendChild(profSection);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  root.appendChild(
    el(
      "div",
      {
        marginTop: "30px",
        paddingTop: "12px",
        borderTop: "1px solid #E2E8F0",
        fontSize: "7pt",
        color: "#94A3B8",
        textAlign: "center",
      },
      "Presupuesto clínico informativo. Los precios indicados están sujetos a confirmación. Documento generado por FCE Synapta."
    )
  );

  return root;
}

// ── Export utility ────────────────────────────────────────────────────────────
// Builds the PDF DOM via safe DOM APIs, feeds it to html2pdf.js,
// then removes the temporary node. No innerHTML used.

export async function exportPresupuestoPdf(
  presupuesto: Presupuesto,
  clinicaNombre: string
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;";
  container.appendChild(buildPresupuestoDom(presupuesto, clinicaNombre));
  document.body.appendChild(container);

  try {
    await html2pdf()
      .from(container)
      .set({
        margin: [10, 10, 10, 10],
        filename: `presupuesto-${presupuesto.id.slice(0, 8)}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

// ── React component — JSX-only, hex-hardcoded styles ─────────────────────────

interface Props {
  presupuesto: Presupuesto;
  clinicaNombre?: string;
}

export function PresupuestoPdfView({ presupuesto, clinicaNombre = "" }: Props) {
  const items = presupuesto.items ?? [];
  const total = items.reduce(
    (sum, it) => sum + it.cantidad * it.precio_unitario,
    0
  );

  return (
    <div
      id={`presupuesto-pdf-${presupuesto.id}`}
      style={{
        width: "215.9mm",
        minHeight: "279.4mm",
        padding: "20mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "11pt",
        color: "#1E293B",
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
        position: "absolute",
        left: "-9999px",
        top: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "2px solid #E2E8F0",
        }}
      >
        <div style={{ fontSize: "14pt", fontWeight: "bold", color: "#1E293B" }}>
          {clinicaNombre}
        </div>
        <div
          style={{
            fontSize: "13pt",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#1E293B",
          }}
        >
          Presupuesto Clínico
        </div>
      </div>

      {/* Título y fecha */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12pt", fontWeight: "bold", color: "#1E293B" }}>
          {presupuesto.titulo}
        </div>
        <div style={{ fontSize: "9pt", color: "#64748B", marginTop: "2px" }}>
          {"Fecha: "}
          {formatFecha(presupuesto.firmado_at ?? presupuesto.created_at)}
          {" · Estado: "}
          {presupuesto.estado === "enviado" ? "Enviado" : "Borrador"}
        </div>
      </div>

      {/* Notas */}
      {presupuesto.notas && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "9pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748B",
              marginBottom: "4px",
            }}
          >
            Notas
          </div>
          <div style={{ fontSize: "10pt", color: "#475569", whiteSpace: "pre-wrap" }}>
            {presupuesto.notas}
          </div>
        </div>
      )}

      {/* Tabla */}
      {items.length > 0 ? (
        <div style={{ marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {(
                  [
                    { label: "Descripción", align: "left" as const },
                    { label: "Cant.", align: "center" as const },
                    { label: "Precio Unit.", align: "right" as const },
                    { label: "Subtotal", align: "right" as const },
                  ] as const
                ).map(({ label, align }) => (
                  <th
                    key={label}
                    style={{
                      padding: "8px",
                      textAlign: align,
                      fontSize: "9pt",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#64748B",
                      borderBottom: "2px solid #E2E8F0",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0", fontSize: "10pt", color: "#1E293B" }}>
                    {it.descripcion}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0", fontSize: "10pt", textAlign: "center", color: "#475569" }}>
                    {it.cantidad}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0", fontSize: "10pt", textAlign: "right", color: "#475569" }}>
                    {formatCLP(it.precio_unitario)}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #E2E8F0", fontSize: "10pt", textAlign: "right", fontWeight: 600, color: "#1E293B" }}>
                    {formatCLP(it.cantidad * it.precio_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F1F5F9" }}>
                <td
                  colSpan={3}
                  style={{ padding: "10px 8px", textAlign: "right", fontSize: "11pt", fontWeight: "bold", color: "#1E293B" }}
                >
                  Total
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "13pt", fontWeight: "bold", color: "#1E293B" }}>
                  {formatCLP(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ padding: "16px", textAlign: "center", color: "#94A3B8", fontSize: "10pt" }}>
          Sin ítems registrados.
        </div>
      )}

      {/* Profesional */}
      {presupuesto.profesional && (
        <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "250px", borderTop: "1px solid #1E293B", paddingTop: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11pt", fontWeight: 600, color: "#1E293B" }}>
              {presupuesto.profesional.nombre}
            </div>
            <div style={{ fontSize: "9pt", color: "#64748B" }}>
              {presupuesto.profesional.especialidad}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "30px",
          paddingTop: "12px",
          borderTop: "1px solid #E2E8F0",
          fontSize: "7pt",
          color: "#94A3B8",
          textAlign: "center",
        }}
      >
        Presupuesto clínico informativo. Los precios indicados están sujetos a confirmación.
        Documento generado por FCE Synapta.
      </div>
    </div>
  );
}
