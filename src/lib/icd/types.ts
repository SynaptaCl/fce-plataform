/**
 * ICDSearchResult: resultado de una búsqueda en la API ICD-11
 */
export interface ICDSearchResult {
  id: string;
  code?: string;
  title: string;
  score?: number;
  synonyms?: string[];
}

/**
 * ICDEntity: detalle completo de una entidad ICD-11
 */
export interface ICDEntity {
  id: string;
  code?: string;
  title: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  parent?: string;
  uri: string;
}

/**
 * ICDCodeSnap: snapshot inmutable que se guarda en la base de datos
 */
export interface ICDCodeSnap {
  code: string;
  title: string;
  uri: string;
  version: string;
  language: string;
  addedAt: string;
  addedBy: string;
}

/**
 * DiagnosticoGuardado: Array de ICDCodeSnap que se almacena en la DB
 */
export type DiagnosticoGuardado = ICDCodeSnap[];
