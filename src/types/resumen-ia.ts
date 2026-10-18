export interface ReporteIA {
  alertas_prioritarias: string[]
  resumen_narrativo: string
  evolucion_clinica: string
  estado_actual: string
  informacion_faltante: string[]
  generado_en: string
  desde_cache: boolean
  /** Metadatos de la versión guardada (ausentes en un resumen no persistido). */
  version?: number
  tipo_version?: 'completa' | 'incremental'
  modelo?: string
  /** true si hay evoluciones/adendas firmadas que esta versión aún no cubre (p. ej. falló la generación). */
  desactualizado?: boolean
}
