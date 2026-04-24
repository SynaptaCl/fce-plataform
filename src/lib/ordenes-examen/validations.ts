import { z } from "zod";

export const ExamenIndicadoSchema = z.object({
  id_examen_catalogo: z.string().uuid().nullable(),
  codigo: z.string().min(1, "Código requerido"),
  nombre: z.string().min(1, "Nombre del examen requerido"),
  categoria: z.string().min(1, "Categoría requerida"),
  indicacion_clinica: z.string().min(1, "Indicación clínica requerida"),
  urgente: z.boolean(),
  instrucciones: z.string().nullable(),
  preparacion_paciente: z.string().nullable(),
});

export const OrdenExamenInputSchema = z
  .object({
    patientId: z.string().uuid(),
    encuentroId: z.string().uuid().nullable(),
    examenes: z.array(ExamenIndicadoSchema).min(1, "Al menos un examen requerido"),
    diagnostico_presuntivo: z.string().nullable(),
    observaciones: z.string().nullable(),
    prioridad: z.enum(["normal", "urgente"]),
    modoFirma: z.enum(["impresa", "canvas"]),
    firmaCanvas: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (data.modoFirma === "canvas") {
        return data.firmaCanvas?.startsWith("data:image/");
      }
      return true;
    },
    { message: "Firma digital inválida cuando modo=canvas" }
  );
