export interface InstrumentoSchema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  version: string;
  especialidades: string[];
  tipo_renderer: "escala_simple" | "componente_custom";
  schema_items?: SchemaItems;
  componente_id?: string;
  interpretacion?: InterpretacionRango[];
  activo: boolean;
}

export interface SchemaItems {
  items: SchemaItem[];
  calculo: "suma" | "promedio" | "max" | "min";
}

export interface SchemaItem {
  codigo: string;
  label: string;
  opciones: { label: string; valor: number }[];
}

export interface InterpretacionRango {
  min: number;
  max: number;
  label: string;
  color: "red" | "orange" | "yellow" | "green" | "blue";
}

export interface InstrumentoAplicado {
  id: string;
  id_instrumento: string;
  instrumento?: InstrumentoSchema;
  respuestas: Record<string, number>;
  puntaje_total: number | null;
  interpretacion: string | null;
  notas?: string;
  mostrar_en_timeline: boolean;
  aplicado_por: string;
  aplicado_at: string;
}

export interface InstrumentoCustomProps {
  schema: InstrumentoSchema;
  valor: Record<string, number>;
  onChange: (valor: Record<string, number>) => void;
  readOnly?: boolean;
}
