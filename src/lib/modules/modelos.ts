import { ESPECIALIDADES_REGISTRY, type ModeloClinico } from "./registry";

/**
 * Devuelve el modelo clínico que aplica a una especialidad.
 * Retorna 'ninguno' si la especialidad no existe en el registry.
 */
export function getModeloDeEspecialidad(especialidad: string): ModeloClinico {
  return ESPECIALIDADES_REGISTRY[especialidad]?.modelo ?? "ninguno";
}

/**
 * Devuelve los módulos que se ofrecen en un encuentro de cierto modelo.
 */
export function getModulosDelModelo(modelo: ModeloClinico): string[] {
  switch (modelo) {
    case "rehabilitacion":  return ["M3_evaluacion", "M4_soap"];
    case "clinico_general": return ["M3b_instrumentos", "M4b_nota_clinica"];
    case "ninguno":         return [];
  }
}

/**
 * Construye la URL del espacio de trabajo de un encuentro según su modelo.
 */
export function getRutaEncuentro(
  modelo: ModeloClinico,
  patientId: string,
  encuentroId: string
): string {
  const base = `/dashboard/pacientes/${patientId}/encuentro/${encuentroId}`;
  switch (modelo) {
    case "rehabilitacion":  return `${base}/rehab`;
    case "clinico_general": return `${base}/clinico`;
    case "ninguno":         return base;
  }
}

/**
 * Filtra especialidades activas de la clínica para mostrar en filtros del Timeline.
 * Excluye las que no generan actividad clínica registrable.
 */
export function getEspecialidadesParaTimeline(especialidadesActivas: string[]): string[] {
  return especialidadesActivas.filter(
    (esp) => getModeloDeEspecialidad(esp) !== "ninguno"
  );
}
