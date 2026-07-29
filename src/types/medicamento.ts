export interface Medicamento {
  id: string;
  principio_activo: string;
  forma_farmaceutica: string | null;
  concentracion: string | null;
  via_administracion: string | null;
  dosis_adulto_sugerida: string | null;
  dosis_pediatrica_sugerida: string | null;
  indicaciones_comunes: string[] | null;
  contraindicaciones_clave: string[] | null;
  advertencias_importantes: string[] | null;
  grupo_terapeutico: string | null;
  codigo_atc: string | null;
  es_controlado: boolean;
  requiere_receta: boolean;
  especialidades_comunes: string[] | null;
  perfiles_autorizados: string[];
  origen: string | null;
  id_clinica: string | null;
  activo: boolean;
  /** false = contenido sin revisión médica/QF formal — mostrar aviso no bloqueante en UI */
  validado_clinicamente: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoComercialPresentacion =
  | "referente"
  | "bioequivalente_marca"
  | "bioequivalente_generico";

export interface MedicamentoPresentacion {
  id: string;
  id_medicamento: string;
  nombre_comercial: string;
  laboratorio: string | null;
  presentacion: string | null;
  es_generico: boolean;
  /** null = no aplica (ej. tópico/inhalatorio) o sin dato verificado — NUNCA tratar como "no bioequivalente" */
  bioequivalente: boolean | null;
  tipo_comercial: TipoComercialPresentacion | null;
  registro_isp: string | null;
  fuente_url: string | null;
  estado: "vigente" | "descontinuado";
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicamentoConPresentaciones extends Medicamento {
  medicamentos_presentaciones: MedicamentoPresentacion[];
}
