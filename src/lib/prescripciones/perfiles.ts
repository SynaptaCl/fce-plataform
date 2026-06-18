/**
 * Perfiles de prescripción por especialidad.
 * Determina qué medicamentos puede prescribir cada profesional.
 * El perfil se DERIVA de la especialidad — no se almacena en DB.
 */

export type PerfilPrescripcion = "medico" | "odontologo" | "matrona";

const PERFIL_POR_ESPECIALIDAD: Record<string, PerfilPrescripcion> = {
  "Medicina General":           "medico",
  "Ginecología y Obstetricia":  "medico",
  "Enfermería":                 "medico",
  "Psicología":                 "medico",
  "Nutrición":                  "medico",
  "Kinesiología":               "medico",
  "Fonoaudiología":             "medico",
  "Terapia Ocupacional":        "medico",
  "Podología":                  "medico",
  "Masoterapia":                "medico",
  "Odontología":                "odontologo",
  "Obstetricia y Puericultura": "matrona",
};

/**
 * Retorna el perfil de prescripción según la especialidad del profesional.
 * Si la especialidad no está mapeada, retorna 'medico' (más permisivo).
 * El guard `puede_prescribir` ya filtra quién llega a usar esto.
 */
export function getPerfilPrescripcion(especialidad: string): PerfilPrescripcion {
  return PERFIL_POR_ESPECIALIDAD[especialidad] ?? "medico";
}
