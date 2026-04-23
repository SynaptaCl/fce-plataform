export interface PlantillaIndicacion {
  id: string;
  label: string;
  contenido: string;
}

export const PLANTILLAS_GENERALES: PlantillaIndicacion[] = [
  {
    id: "reposo_relativo",
    label: "Reposo relativo",
    contenido: "Reposo relativo en domicilio por 3 a 5 días. Evitar esfuerzo físico intenso y exposición al frío.",
  },
  {
    id: "hidratacion",
    label: "Hidratación",
    contenido: "Hidratación abundante: ingerir al menos 2 litros de agua al día. Aumentar consumo si hay fiebre o sudoración.",
  },
  {
    id: "dieta_blanda",
    label: "Dieta blanda",
    contenido: "Dieta blanda: evitar alimentos irritantes, condimentados, ácidos o muy calientes. Preferir comidas tibias y de fácil digestión.",
  },
  {
    id: "aplicar_frio",
    label: "Aplicar frío local",
    contenido: "Aplicar compresas frías o hielo envuelto en paño en la zona afectada por 15 a 20 minutos cada 2-3 horas durante las primeras 48 horas.",
  },
  {
    id: "aplicar_calor",
    label: "Aplicar calor local",
    contenido: "Aplicar calor local seco (bolsa de agua tibia o paño caliente) por 15 a 20 minutos cada 4-6 horas.",
  },
  {
    id: "control_evolucion",
    label: "Control de evolución",
    contenido: "Controlar evolución de los síntomas. Consultar antes si hay empeoramiento, aparición de nuevos síntomas o ausencia de mejoría en 48-72 horas.",
  },
  {
    id: "control_signos_alarma",
    label: "Signos de alarma",
    contenido: "Acudir a Servicio de Urgencia si presenta: fiebre persistente >38.5°C, dolor severo no controlado con analgesia, dificultad respiratoria, vómitos persistentes o cualquier síntoma que considere grave.",
  },
];
