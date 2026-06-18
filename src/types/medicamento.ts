export interface MedicamentoCatalogo {
  id: string;
  principio_activo: string;
  nombre_comercial: string | null;
  presentacion: string;
  forma_farmaceutica: string;
  concentracion: string | null;
  via_administracion: string;
  dosis_adulto_sugerida: string | null;
  dosis_pediatrica_sugerida: string | null;
  bioequivalentes: string[] | null;
  laboratorio: string | null;
  indicaciones_comunes: string[];
  contraindicaciones_clave: string[];
  advertencias_importantes: string[] | null;
  grupo_terapeutico: string | null;
  codigo_atc: string | null;
  es_controlado: boolean;
  requiere_receta: boolean;
  especialidades_comunes: string[];
  origen: "seed" | "clinica" | "admin";
  id_clinica: string | null;
  perfiles_autorizados: string[];
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}
