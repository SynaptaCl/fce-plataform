/**
 * ADJ-1 — Adjuntos clínicos: tipos compartidos.
 * Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
 */

export type CategoriaAdjunto = "imagen_clinica" | "resultado_examen" | "documento";
export type EstadoValidacionAdjunto = "pendiente" | "validado";
export type MimeAdjunto = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export const CATEGORIA_ADJUNTO_LABELS: Record<CategoriaAdjunto, string> = {
  imagen_clinica: "Imagen clínica",
  resultado_examen: "Resultado de examen",
  documento: "Documento",
};

export const MIMES_ADJUNTO: MimeAdjunto[] = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export interface Adjunto {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_orden_examen: string | null;
  categoria: CategoriaAdjunto;
  descripcion: string | null;
  nombre_archivo_original: string;
  mime_type: MimeAdjunto;
  storage_path: string;
  tamano_bytes: number;
  fecha_documento: string;
  estado_validacion: EstadoValidacionAdjunto;
  validado_por: string | null;
  validado_at: string | null;
  anulado: boolean;
  anulado_motivo: string | null;
  anulado_por: string | null;
  anulado_at: string | null;
  /** ⚠ auth.users.id del uploader (desviación D2 — NO profesionales.id) */
  created_by: string;
  created_by_rol: string;
  created_at: string;
  updated_at: string;
}

export interface AdjuntoConUrl extends Adjunto {
  /** URL firmada de corta vida (TTL_URL_FIRMADA_SEG). Null si falló la firma. */
  signedUrl: string | null;
}
