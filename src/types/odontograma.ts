export type EstadoPieza =
  | 'sano'
  | 'caries'
  | 'obturado'
  | 'corona'
  | 'ausente'
  | 'ausente_no_erupcionado'
  | 'endodoncia'
  | 'implante'
  | 'protesis_fija'
  | 'protesis_removible'
  | 'fracturado'
  | 'extraccion_indicada'
  | 'sellante'
  | 'en_erupcion'
  | 'retenido'
  | 'supernumerario';

export type SuperficieDental = 'M' | 'D' | 'O' | 'I' | 'V' | 'L' | 'P';

export interface OdontogramaEntry {
  id: string;
  id_clinica: string;
  id_paciente: string;
  pieza: number;
  estado: EstadoPieza;
  superficies: Partial<Record<SuperficieDental, EstadoPieza | null>>;
  movilidad: number | null;
  notas: string | null;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

export interface OdontogramaHistorial {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string;
  id_odontograma: string;
  pieza: number;
  estado_anterior: EstadoPieza | null;
  estado_nuevo: EstadoPieza;
  superficies_anterior: Partial<Record<SuperficieDental, EstadoPieza | null>> | null;
  superficies_nuevo: Partial<Record<SuperficieDental, EstadoPieza | null>> | null;
  procedimiento: string | null;
  notas: string | null;
  registrado_por: string;
  registrado_at: string;
}
