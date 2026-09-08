export type TipoFicha = "facial" | "corporal" | "mixta";
export type RegionEstetica = "facial" | "corporal";

export type CategoriaProcedimiento =
  | "toxina_botulinica" | "relleno_ac_hialuronico" | "laser"
  | "peeling" | "radiofrecuencia" | "mesoterapia" | "otro";

export interface ProcedimientoEsteticoCatalogo {
  id: string;
  nombre: string;
  categoria: CategoriaProcedimiento;
  descripcion: string | null;
  contraindicaciones_clave: string[];
  requiere_consentimiento_especifico: boolean;
  id_clinica: string | null;
  activo: boolean;
}

export interface FichaEsteticaZona {
  id: string;
  id_ficha_estetica: string;
  region: RegionEstetica;
  zona_codigo: string;
  id_procedimiento: string | null;
  producto_comercial: string | null;
  lote: string | null;
  dosis: number | null;
  unidad_dosis: string | null;
  tecnica: string | null;
  observaciones: string | null;
}

export interface FichaEstetica {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string;
  created_by: string;
  tipo_ficha: TipoFicha;
  motivo: string | null;
  observaciones_generales: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface FichaEsteticaDetalle extends FichaEstetica {
  zonas: FichaEsteticaZona[];
}

export type TipoFoto = "antes" | "despues" | "evolucion";

export interface FichaEsteticaFoto {
  id: string;
  id_ficha_estetica: string | null;
  id_paciente: string;
  id_clinica: string;
  tipo: TipoFoto;
  storage_path: string;
  region: RegionEstetica | null;
  zona_codigo: string | null;
  tomada_at: string;
  created_by: string;
}

export interface FichaEsteticaFotoConUrl extends FichaEsteticaFoto {
  signedUrl: string;
}
