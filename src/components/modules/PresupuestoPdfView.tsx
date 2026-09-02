"use client";

import type { Presupuesto } from "@/types/presupuesto";
import { presupuestoHtml } from "@/lib/presupuestos/pdf-html";

// ── Export utility ────────────────────────────────────────────────────────────
// El HTML lo construye presupuestoHtml() (función pura, testeable — caso 12 del
// sprint PRE-1: sin honorario_*). Aquí solo se inyecta en un nodo fuera de
// pantalla y se entrega a html2pdf.js. Todo texto de usuario se escapa en el
// builder (esc()).

export async function exportPresupuestoPdf(
  presupuesto: Presupuesto,
  clinicaNombre: string
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;";
  container.innerHTML = presupuestoHtml(presupuesto, clinicaNombre);
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

// ── React component (vista previa en pantalla) ───────────────────────────────

interface Props {
  presupuesto: Presupuesto;
  clinicaNombre?: string;
}

export function PresupuestoPdfView({ presupuesto, clinicaNombre = "" }: Props) {
  return (
    <div
      id={`presupuesto-pdf-${presupuesto.id}`}
      style={{ width: "100%", overflowX: "auto" }}
      dangerouslySetInnerHTML={{
        __html: presupuestoHtml(presupuesto, clinicaNombre),
      }}
    />
  );
}
