// Re-exportar tipos del módulo ICD (los componentes no importan directamente de lib/icd)
export type {
  ICDSearchResult,
  ICDEntity,
  ICDCodeSnap,
  DiagnosticoGuardado,
} from "@/lib/icd/types";

import type { ICDCodeSnap } from "@/lib/icd/types";

/**
 * Tipo de props del componente DiagnosticoSearch (para reutilización)
 */
export interface DiagnosticoSearchProps {
  value: ICDCodeSnap[];
  onChange: (codes: ICDCodeSnap[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}
