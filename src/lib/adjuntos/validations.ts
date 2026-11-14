/**
 * ADJ-1 — Validaciones Zod para adjuntos clínicos.
 * Plan: docs/plan-redisenio/sprints/ADJ-1-adjuntos-clinicos.md
 */

import { z } from "zod";
import { esMimePermitido, hoySantiago, limiteParaMime } from "./archivo";

const FECHA_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Input de prepararSubidaAdjunto / registrarAdjunto (el mime real lo determina el servidor por magic bytes). */
export const AdjuntoInputSchema = z.object({
  patientId: z.string().uuid("Paciente inválido"),
  categoria: z.enum(["imagen_clinica", "resultado_examen", "documento"]),
  descripcion: z.string().trim().max(500, "La descripción no puede superar 500 caracteres").nullable(),
  nombreArchivoOriginal: z.string().min(1, "Nombre de archivo requerido").max(255),
  mimeDeclarado: z.string().refine(esMimePermitido, "Formato no soportado. Usa JPG, PNG, WEBP o PDF."),
  tamano: z
    .number({ message: "Tamaño de archivo requerido" })
    .int()
    .positive("El archivo está vacío")
    .max(15 * 1024 * 1024, "El archivo supera el máximo permitido (15MB)"),
  fechaDocumento: z
    .string()
    .regex(FECHA_ISO_RE, "Fecha inválida")
    .refine((f) => f <= hoySantiago(), "La fecha del documento no puede ser futura"),
  idOrdenExamen: z.string().uuid().nullable(),
  idEncuentro: z.string().uuid().nullable(),
});

/** El tamaño debe respetar el límite del MIME declarado (imágenes 8MB / PDF 15MB). */
export const AdjuntoInputConLimiteSchema = AdjuntoInputSchema.refine(
  (d) => {
    const limite = limiteParaMime(d.mimeDeclarado);
    return limite !== null && d.tamano <= limite;
  },
  { message: "La imagen supera el tamaño máximo permitido (8MB)" },
);

export const ValidarAdjuntoSchema = z.object({
  adjuntoId: z.string().uuid(),
  /** Solo aplica si el adjunto está vinculado a una orden M8. */
  estadoResultados: z.enum(["parcial", "completo"]).nullable(),
});

export const AnularAdjuntoSchema = z.object({
  adjuntoId: z.string().uuid(),
  motivo: z.string().trim().min(5, "El motivo es obligatorio (mínimo 5 caracteres)").max(500),
});

export const EliminarAdjuntoSchema = z.object({
  adjuntoId: z.string().uuid(),
});
