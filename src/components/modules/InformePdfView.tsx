"use client";

import type { InformeClinico, TipoInforme } from "@/types/informe";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoInforme, string> = {
  isapre: "Isapre",
  colegio: "Colegio",
  laboral: "Laboral",
  judicial: "Judicial",
  otro: "Otro",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function buildInformeDom(
  informe: InformeClinico,
  clinicaNombre: string
): HTMLElement {
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
      "Informe Clínico"
    )
  );
  root.appendChild(header);

  // ── Tipo + Destinatario ──────────────────────────────────────────────────
  const metaRow = el("div", {
    display: "flex",
    gap: "16px",
    marginBottom: "12px",
    fontSize: "10pt",
    color: "#475569",
  });
  const tipoEl = el("div");
  const tipoLabel = el("span", { fontWeight: "bold", color: "#1E293B" }, "Tipo: ");
  const tipoValue = el("span", {}, TIPO_LABELS[informe.tipo]);
  tipoEl.appendChild(tipoLabel);
  tipoEl.appendChild(tipoValue);
  metaRow.appendChild(tipoEl);

  if (informe.destinatario) {
    const destEl = el("div");
    const destLabel = el("span", { fontWeight: "bold", color: "#1E293B" }, "Destinatario: ");
    const destValue = el("span", {}, informe.destinatario);
    destEl.appendChild(destLabel);
    destEl.appendChild(destValue);
    metaRow.appendChild(destEl);
  }
  root.appendChild(metaRow);

  // ── Título ───────────────────────────────────────────────────────────────
  root.appendChild(
    el(
      "h1",
      {
        fontSize: "16pt",
        fontWeight: "bold",
        color: "#1E293B",
        marginBottom: "16px",
        marginTop: "0",
      },
      informe.titulo
    )
  );

  // ── Contenido ────────────────────────────────────────────────────────────
  const contenidoBlock = el("div", {
    fontSize: "11pt",
    color: "#1E293B",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "1px solid #E2E8F0",
  });
  contenidoBlock.textContent = informe.contenido;
  root.appendChild(contenidoBlock);

  // ── Firma profesional ────────────────────────────────────────────────────
  if (informe.profesional) {
    const firmaSection = el("div", {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: "10px",
    });
    const firmaBox = el("div", {
      width: "280px",
      borderTop: "1px solid #1E293B",
      paddingTop: "8px",
      textAlign: "center",
    });
    firmaBox.appendChild(
      el(
        "div",
        { fontSize: "11pt", fontWeight: "600", color: "#1E293B" },
        informe.profesional.nombre
      )
    );
    firmaBox.appendChild(
      el(
        "div",
        { fontSize: "9pt", color: "#64748B" },
        informe.profesional.especialidad
      )
    );
    if (informe.firmado_at) {
      firmaBox.appendChild(
        el(
          "div",
          { fontSize: "9pt", color: "#64748B", marginTop: "4px" },
          `Firmado el ${formatFecha(informe.firmado_at)}`
        )
      );
    }
    firmaSection.appendChild(firmaBox);
    root.appendChild(firmaSection);
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
      "Documento generado por FCE Synapta. Este informe tiene validez clínica sólo con la firma del profesional responsable."
    )
  );

  return root;
}

// ── Export utility ────────────────────────────────────────────────────────────
// Builds the PDF DOM via safe DOM APIs, feeds it to html2pdf.js,
// then removes the temporary node. No innerHTML used.

export async function exportInformePdf(
  informe: InformeClinico,
  clinicaNombre: string
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;";
  container.appendChild(buildInformeDom(informe, clinicaNombre));
  document.body.appendChild(container);

  try {
    await html2pdf()
      .from(container)
      .set({
        margin: [10, 10, 10, 10],
        filename: `informe-${informe.id.slice(0, 8)}.pdf`,
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
  informe: InformeClinico;
  clinicaNombre?: string;
}

export function InformePdfView({ informe, clinicaNombre = "" }: Props) {
  return (
    <div
      id={`informe-pdf-${informe.id}`}
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
          Informe Clínico
        </div>
      </div>

      {/* Tipo + Destinatario */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "10pt", color: "#475569" }}>
        <div>
          <span style={{ fontWeight: "bold", color: "#1E293B" }}>Tipo: </span>
          {TIPO_LABELS[informe.tipo]}
        </div>
        {informe.destinatario && (
          <div>
            <span style={{ fontWeight: "bold", color: "#1E293B" }}>Destinatario: </span>
            {informe.destinatario}
          </div>
        )}
      </div>

      {/* Título */}
      <h1
        style={{
          fontSize: "16pt",
          fontWeight: "bold",
          color: "#1E293B",
          marginBottom: "16px",
          marginTop: 0,
        }}
      >
        {informe.titulo}
      </h1>

      {/* Contenido */}
      <div
        style={{
          fontSize: "11pt",
          color: "#1E293B",
          lineHeight: "1.7",
          whiteSpace: "pre-wrap",
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        {informe.contenido}
      </div>

      {/* Firma profesional */}
      {informe.profesional && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              width: "280px",
              borderTop: "1px solid #1E293B",
              paddingTop: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11pt", fontWeight: 600, color: "#1E293B" }}>
              {informe.profesional.nombre}
            </div>
            <div style={{ fontSize: "9pt", color: "#64748B" }}>
              {informe.profesional.especialidad}
            </div>
            {informe.firmado_at && (
              <div style={{ fontSize: "9pt", color: "#64748B", marginTop: "4px" }}>
                Firmado el {formatFecha(informe.firmado_at)}
              </div>
            )}
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
        Documento generado por FCE Synapta. Este informe tiene validez clínica sólo con la firma del profesional responsable.
      </div>
    </div>
  );
}
