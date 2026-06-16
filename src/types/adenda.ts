export type TipoDocumentoFirmable =
  | "soap" | "nota_clinica" | "periograma"
  | "egreso" | "prescripcion" | "orden_examen" | "consentimiento";

export type TipoAdenda = "adenda" | "errata" | "anulacion";

export interface FCEAdenda {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  tipo_documento: TipoDocumentoFirmable;
  id_documento: string;
  tipo_adenda: TipoAdenda;
  motivo: string;
  contenido: string;
  override_director: boolean;
  override_motivo: string | null;
  override_por: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdendaConAutor extends FCEAdenda {
  autorNombre: string;
}

export interface AdendaTarget {
  tipoDocumento: TipoDocumentoFirmable;
  idDocumento: string;
  firmadoAt: string;
  createdBy: string;
  idEncuentro: string | null;
}
