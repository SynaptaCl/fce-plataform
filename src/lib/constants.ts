// ── Constantes universales de la plataforma FCE ──
// Datos específicos de clínica vienen de DB (clinicas_branding → lib/modules/branding.ts)
// Especialidades y roles vienen de registry.ts

export const PREVISIONES = [
  "FONASA A",
  "FONASA B",
  "FONASA C",
  "FONASA D",
  "Isapre",
  "Particular",
] as const;

export const REGIONES_CHILE = [
  "Región Metropolitana",
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;
