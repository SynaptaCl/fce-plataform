export interface ServicioContexto {
  instrumentosSugeridos: string[];
  nota?: string;
}

/**
 * Mapeo por keywords. Se evalúa el nombre del servicio en minúsculas.
 * El primer match gana. Si no hay match, se usan los de la especialidad.
 */
const SERVICIO_KEYWORDS: Array<{ keywords: string[]; contexto: ServicioContexto }> = [
  {
    keywords: ["autismo", "tea", "ados", "adi-r"],
    contexto: {
      instrumentosSugeridos: ["ados2", "adir", "cars2"],
      nota: "Evaluación integral de autismo: aplicar ADOS-2 y ADI-R.",
    },
  },
  {
    keywords: ["tdah", "déficit atencional", "deficit atencional"],
    contexto: {
      instrumentosSugeridos: ["conners3", "brief2"],
      nota: "Evaluación de TDAH: Conners-3 y BRIEF-2 recomendados.",
    },
  },
  {
    keywords: ["wisc"],
    contexto: { instrumentosSugeridos: ["wisc5"], nota: "Psicometría WISC-V (niños)." },
  },
  {
    keywords: ["wais"],
    contexto: { instrumentosSugeridos: ["wppsi"], nota: "Psicometría WAIS-IV (adultos). Registrar resultado." },
  },
  {
    keywords: ["nutricional", "nutrición", "nutricion"],
    contexto: { instrumentosSugeridos: ["eva"], nota: "Valoración nutricional. (MNA/SGA pendientes en catálogo.)" },
  },
  {
    keywords: ["kinesiológic", "kinesiologic", "kinesiología"],
    contexto: { instrumentosSugeridos: ["eva", "barthel"] },
  },
  {
    keywords: ["plantillas ortopédicas", "plantillas ortopedicas"],
    contexto: { instrumentosSugeridos: ["eva"], nota: "Confección de plantillas: registrar evaluación de la marcha." },
  },
  {
    keywords: ["terapia de pareja", "familiar"],
    contexto: { instrumentosSugeridos: [], nota: "Terapia de pareja/familiar: nota libre, sin instrumentos por defecto." },
  },
];

/**
 * Devuelve el contexto sugerido por el nombre del servicio.
 * null si no hay match (el caller usa los instrumentos de la especialidad).
 */
export function getServicioContexto(nombreServicio: string | null): ServicioContexto | null {
  if (!nombreServicio) return null;
  const n = nombreServicio.toLowerCase();
  for (const entry of SERVICIO_KEYWORDS) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry.contexto;
  }
  return null;
}
