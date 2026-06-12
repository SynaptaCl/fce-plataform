import type { SitioPliegue, FormulaId } from '@/lib/nutricion/pliegues';

export type ModoAntropometria = 'adulto' | 'pediatrico' | 'gestacional';

export type PlieguesDatos = Partial<Record<SitioPliegue, number>>;

export interface AntropometriaRecord {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro?: string | null;

  peso_kg: number;
  talla_cm: number;
  imc?: number | null;
  clasificacion?: string | null;
  modo: ModoAntropometria;

  circ_cintura_cm?: number | null;
  circ_cadera_cm?: number | null;
  riesgo_cintura?: string | null;

  pliegues?: PlieguesDatos | null;
  formula_grasa?: FormulaId | null;
  perc_grasa?: number | null;
  masa_magra_kg?: number | null;

  zscore_imc?: number | null;
  zscore_peso?: number | null;
  zscore_talla?: number | null;
  percentil_imc?: number | null;

  semana_gestacional?: number | null;
  imc_pregestacional?: number | null;
  rango_ganancia_min?: number | null;
  rango_ganancia_max?: number | null;

  observaciones?: string | null;
  registrado_por: string;
  registrado_at: string;
  created_at: string;
}

export interface AntropometriaInput {
  idPaciente: string;
  idClinica: string;
  idEncuentro?: string;
  modo: ModoAntropometria;

  peso_kg: number;
  talla_cm: number;
  circ_cintura_cm?: number;
  circ_cadera_cm?: number;

  pliegues?: PlieguesDatos;
  formula_grasa?: FormulaId;

  observaciones?: string;

  // sexo del paciente (para cálculo de pliegues, cintura y z-score pediátrico)
  sexoRegistral?: 'M' | 'F';
  edadAnios?: number;
  edadMeses?: number;   // requerido para z-score pediátrico

  // Gestacional (N2)
  fur?: string;                  // ISO date "YYYY-MM-DD"
  semanaGestacional?: number;    // calculada desde FUR o manual
  imcPregestacional?: number;    // IMC antes del embarazo
}
