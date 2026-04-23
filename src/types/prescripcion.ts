export type ModoFirma = "impresa" | "canvas";
export type TipoPrescripcion = "farmacologica" | "indicacion_general";
export type ViaAdministracion =
  | "oral"
  | "topica"
  | "intramuscular"
  | "endovenosa"
  | "subcutanea"
  | "rectal"
  | "oftalmica"
  | "otica"
  | "nasal"
  | "vaginal"
  | "inhalatoria"
  | "sublingual"
  | "transdermica"
  | "otra";

export interface MedicamentoPrescrito {
  id_medicamento_catalogo: string | null;
  principio_activo: string;
  nombre_comercial: string | null;
  presentacion: string;
  via: ViaAdministracion;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad_total: string;
  instrucciones: string | null;
}

export interface Prescripcion {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  folio_numero: number;
  folio_anio: number;
  folio_display: string;
  tipo: TipoPrescripcion;
  medicamentos: MedicamentoPrescrito[] | null;
  indicaciones_generales: string | null;
  diagnostico_asociado: string | null;
  modo_firma: ModoFirma;
  firma_canvas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  prof_nombre_snapshot: string | null;
  prof_rut_snapshot: string | null;
  prof_registro_snapshot: string | null;
  prof_tipo_registro_snapshot: string | null;
  prof_especialidad_snapshot: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
