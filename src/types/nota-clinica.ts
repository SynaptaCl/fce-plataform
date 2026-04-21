export interface NotaClinica {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string;

  motivo_consulta: string | null;
  contenido: string;

  diagnostico: string | null;
  cie10_codigos: string[] | null;

  plan: string | null;
  proxima_sesion: string | null;

  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}
