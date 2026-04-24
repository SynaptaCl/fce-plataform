import type { OrdenExamen } from "@/types/orden-examen";
import type { Patient } from "@/types/patient";

export function buildShareMessage(
  orden: OrdenExamen,
  clinicaNombre: string
): string {
  const fecha = orden.firmado_at
    ? new Date(orden.firmado_at).toLocaleDateString("es-CL")
    : "";
  const n = orden.examenes.length;
  return `Orden de exámenes ${orden.folio_display}.\n${n} examen${n !== 1 ? "es" : ""} solicitado${n !== 1 ? "s" : ""}.\nEmitida el ${fecha} en ${clinicaNombre}.`;
}

export function buildMailtoLink(
  orden: OrdenExamen,
  paciente: Patient,
  clinicaNombre: string
): string {
  // paciente param kept for API symmetry (may be used to pre-fill recipient email)
  void paciente;
  const subject = encodeURIComponent(
    `Orden de exámenes ${orden.folio_display} - ${clinicaNombre}`
  );
  const body = encodeURIComponent(buildShareMessage(orden, clinicaNombre));
  return `mailto:?subject=${subject}&body=${body}`;
}

export function buildWhatsappLink(
  orden: OrdenExamen,
  clinicaNombre: string,
  telefono?: string
): string {
  const text = encodeURIComponent(buildShareMessage(orden, clinicaNombre));
  const phone = telefono?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${phone}?text=${text}`;
}
