import type { Prescripcion } from "@/types/prescripcion";
import type { Patient } from "@/types/patient";

export function buildShareMessage(prescripcion: Prescripcion, clinicaNombre: string): string {
  return `Hola, te comparto tu receta médica emitida hoy en ${clinicaNombre}.\n\nFolio: ${prescripcion.folio_display}\nProfesional: ${prescripcion.prof_nombre_snapshot ?? "Profesional"}\n\nAdjunta encontrarás el PDF de la receta. Cualquier duda no dudes en consultarnos.`;
}

export function buildMailtoLink(
  prescripcion: Prescripcion,
  paciente: Patient,
  clinicaNombre: string
): string {
  const subject = encodeURIComponent(`Receta médica ${prescripcion.folio_display}`);
  const body = encodeURIComponent(buildShareMessage(prescripcion, clinicaNombre));
  // paciente param kept for future use (e.g. pre-filling recipient email)
  void paciente;
  return `mailto:?subject=${subject}&body=${body}`;
}

export function buildWhatsappLink(
  prescripcion: Prescripcion,
  clinicaNombre: string,
  telefono?: string
): string {
  const text = encodeURIComponent(buildShareMessage(prescripcion, clinicaNombre));
  const phone = telefono?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${phone}?text=${text}`;
}
