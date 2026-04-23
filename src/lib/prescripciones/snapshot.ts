import type { ProfesionalPerfil } from "@/lib/fce/profesional";

export interface ProfesionalSnapshot {
  prof_nombre_snapshot: string;
  prof_rut_snapshot: string | null;
  prof_registro_snapshot: string | null;
  prof_tipo_registro_snapshot: string | null;
  prof_especialidad_snapshot: string;
}

export function buildProfesionalSnapshot(profesional: ProfesionalPerfil): ProfesionalSnapshot {
  return {
    prof_nombre_snapshot: profesional.nombre,
    prof_rut_snapshot: profesional.rut ?? null,
    prof_registro_snapshot: profesional.numero_registro ?? null,
    prof_tipo_registro_snapshot: profesional.tipo_registro ?? null,
    prof_especialidad_snapshot: profesional.especialidad,
  };
}
