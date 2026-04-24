"use client";

import html2pdf from "html2pdf.js";

export interface GenerarPdfOptions {
  filename?: string;
  download?: boolean;
  newWindow?: boolean;
  returnBlob?: boolean;
}

export async function generarRecetaPdf(
  elementId: string,
  options: GenerarPdfOptions = {}
): Promise<Blob | void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Elemento #${elementId} no encontrado`);

  const filename = options.filename ?? `receta-${Date.now()}.pdf`;

  const opt = {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: "mm",
      format: "letter",
      orientation: "portrait",
    },
  };

  if (options.returnBlob) {
    return await html2pdf().set(opt).from(element).output("blob") as Blob;
  }

  if (options.newWindow) {
    const blob = await html2pdf().set(opt).from(element).output("blob") as Blob;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return;
  }

  await html2pdf().set(opt).from(element).save();
}
