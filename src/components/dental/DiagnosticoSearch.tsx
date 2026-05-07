'use client';

import { DiagnosticoSearch as DiagnosticoSearchBase } from '@/components/clinico/DiagnosticoSearch';
import type { DiagnosticoSearchProps } from '@/types/diagnostico';

const DENTAL_PLACEHOLDER = 'Busca diagnóstico dental (ej: caries, periodontitis, DA01)';

export function DiagnosticoSearch(props: DiagnosticoSearchProps) {
  return (
    <DiagnosticoSearchBase
      {...props}
      placeholder={props.placeholder ?? DENTAL_PLACEHOLDER}
    />
  );
}
