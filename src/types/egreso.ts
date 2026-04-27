export interface SnapshotEquipoTratante {
  profesionales: {
    nombre: string;
    especialidad: string;
    encuentros: number;
  }[];
  primer_encuentro: string | null;
  ultimo_encuentro: string | null;
  total_encuentros: number;
  firmado_por: {
    nombre: string;
    especialidad: string;
    numero_registro: string | null;
    tipo_registro: string | null;
  };
}

export interface Egreso {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  tipo_egreso: TipoEgreso;
  diagnostico_egreso: string;
  resumen_tratamiento: string;
  estado_al_egreso: string | null;
  indicaciones_post_egreso: string | null;
  derivacion_a: string | null;
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  snapshot_equipo_tratante: SnapshotEquipoTratante | null;
}

export type TipoEgreso = 'alta_clinica' | 'abandono' | 'derivacion' | 'fallecimiento' | 'otro';

export const TIPOS_EGRESO: { value: TipoEgreso; label: string }[] = [
  { value: 'alta_clinica', label: 'Alta clínica' },
  { value: 'abandono', label: 'Abandono de tratamiento' },
  { value: 'derivacion', label: 'Derivación' },
  { value: 'fallecimiento', label: 'Fallecimiento' },
  { value: 'otro', label: 'Otro' },
];
