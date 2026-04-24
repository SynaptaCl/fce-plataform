export interface ExamenCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  descripcion: string | null;
  categoria: "laboratorio" | "imagenologia" | "procedimiento" | "otro";
  subcategoria: string | null;
  muestra_requerida: string | null;
  preparacion_paciente: string | null;
  indicaciones_comunes: string[] | null;
  valores_referencia: string | null;
  codigo_fonasa: string | null;
  nivel_fonasa: number | null;
  especialidades_comunes: string[] | null;
  requiere_preparacion: boolean;
  activo: boolean;
}

export interface ExamenIndicado {
  id_examen_catalogo: string | null;
  codigo: string;
  nombre: string;
  categoria: string;
  indicacion_clinica: string;
  urgente: boolean;
  instrucciones: string | null;
  preparacion_paciente: string | null;
}

export interface OrdenExamen {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  folio_numero: number;
  folio_anio: number;
  folio_display: string;
  examenes: ExamenIndicado[];
  diagnostico_presuntivo: string | null;
  observaciones: string | null;
  prioridad: "normal" | "urgente";
  modo_firma: "impresa" | "canvas";
  firma_canvas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  firmado_por: string | null;
  prof_nombre_snapshot: string | null;
  prof_rut_snapshot: string | null;
  prof_registro_snapshot: string | null;
  prof_tipo_registro_snapshot: string | null;
  prof_especialidad_snapshot: string | null;
  estado_resultados: "pendiente" | "parcial" | "completo";
  created_by: string;
  created_at: string;
}
