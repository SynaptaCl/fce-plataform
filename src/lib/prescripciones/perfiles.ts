export type PerfilPrescripcion = "medico" | "odontologo" | "matrona";

const PERFIL_POR_ESPECIALIDAD: Record<string, PerfilPrescripcion> = {
  "Medicina General":           "medico",
  "Ginecología y Obstetricia":  "medico",
  "Enfermería":                 "medico",
  "Nutrición":                  "medico",
  "Psicología":                 "medico",
  "Kinesiología":               "medico",
  "Fonoaudiología":             "medico",
  "Masoterapia":                "medico",
  "Terapia Ocupacional":        "medico",
  "Podología":                  "medico",
  "Odontología":                "odontologo",
  "Obstetricia y Puericultura": "matrona",
};

/**
 * Deriva el perfil de prescripción desde la especialidad del profesional.
 * Fallback: 'medico' (más permisivo). El guard puede_prescribir ya controla quién llega aquí.
 */
export function getPerfilPrescripcion(especialidad: string): PerfilPrescripcion {
  return PERFIL_POR_ESPECIALIDAD[especialidad] ?? "medico";
}
