import { z } from "zod";

export const MedicamentoPrescritoSchema = z.object({
  id_medicamento_catalogo: z.string().uuid().nullable(),
  principio_activo: z.string().min(2, "Principio activo requerido"),
  nombre_comercial: z.string().nullable(),
  presentacion: z.string().min(2, "Presentación requerida"),
  via: z.enum([
    "oral", "topica", "intramuscular", "endovenosa", "subcutanea",
    "rectal", "oftalmica", "otica", "nasal", "vaginal", "inhalatoria",
    "sublingual", "transdermica", "otra"
  ]),
  dosis: z.string().min(1, "Dosis requerida"),
  frecuencia: z.string().min(1, "Frecuencia requerida"),
  duracion: z.string().min(1, "Duración requerida"),
  cantidad_total: z.string().min(1, "Cantidad total requerida"),
  instrucciones: z.string().nullable(),
});

export const PrescripcionInputSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("farmacologica"),
    medicamentos: z.array(MedicamentoPrescritoSchema).min(1, "Al menos un medicamento"),
    indicacionesGenerales: z.string().nullable(),
    diagnosticoAsociado: z.string().nullable(),
    modoFirma: z.enum(["impresa", "canvas"]),
    firmaCanvas: z.string().nullable(),
    patientId: z.string().uuid(),
    encuentroId: z.string().uuid().nullable(),
  }),
  z.object({
    tipo: z.literal("indicacion_general"),
    medicamentos: z.null().or(z.undefined()),
    indicacionesGenerales: z.string().min(10, "Indicaciones muy cortas"),
    diagnosticoAsociado: z.string().nullable(),
    modoFirma: z.enum(["impresa", "canvas"]),
    firmaCanvas: z.string().nullable(),
    patientId: z.string().uuid(),
    encuentroId: z.string().uuid().nullable(),
  }),
]).refine(
  (data) => {
    if (data.modoFirma === "canvas") {
      return data.firmaCanvas?.startsWith("data:image/");
    }
    return true;
  },
  { message: "Firma digital inválida cuando modo=canvas" }
);
