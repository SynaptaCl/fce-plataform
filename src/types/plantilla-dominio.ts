export interface Dominio {
  codigo: string;
  label: string;
  orden: number;
  descripcion: string | null;
}

export interface PlantillaDominio {
  id: string;
  condicion_codigo: string;
  condicion_label: string;
  descripcion: string | null;
  dominios: Dominio[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}
