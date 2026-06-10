export type TipoInforme = 'isapre' | 'colegio' | 'laboral' | 'judicial' | 'otro';

export interface InformeClinico {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_profesional: string;
  tipo: TipoInforme;
  destinatario: string | null;
  titulo: string;
  contenido: string;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  created_at: string;
  updated_at: string;
  profesional?: { nombre: string; especialidad: string };
}

export type InformeFormData = {
  tipo: TipoInforme;
  destinatario?: string;
  titulo: string;
  contenido: string;
};
