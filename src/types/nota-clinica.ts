import type { ICDCodeSnap } from '@/lib/icd/types';

export interface NotaClinica {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string;

  motivo_consulta: string | null;
  contenido: string;

  diagnostico: string | null;
  cie10_codigos: string[] | null;
  icd_codigos?: ICDCodeSnap[] | null;

  plan: string | null;
  proxima_sesion: string | null;

  secciones_estructuradas?: Record<string, unknown> | null;
  contenido_estructurado?: Record<string, Record<string, unknown>> | null;

  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}
