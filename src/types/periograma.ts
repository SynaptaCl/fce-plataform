export interface PeriogramaPiezaDatos {
  pieza: number;
  sondaje: {
    vestibular: [number, number, number];
    lingual: [number, number, number];
  };
  nivel_insercion: {
    vestibular: [number, number, number];
    lingual: [number, number, number];
  };
  sangrado: {
    vestibular: [boolean, boolean, boolean];
    lingual: [boolean, boolean, boolean];
  };
  supuracion: {
    vestibular: [boolean, boolean, boolean];
    lingual: [boolean, boolean, boolean];
  };
  margen_gingival: {
    vestibular: [number, number, number];
    lingual: [number, number, number];
  };
  furca: number | null;
  movilidad: number;
}

export interface Periograma {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string;
  datos: PeriogramaPiezaDatos[];
  indice_sangrado: number | null;
  profundidad_media: number | null;
  sitios_patologicos: number | null;
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  registrado_por: string;
  created_at: string;
  updated_at: string;
}
