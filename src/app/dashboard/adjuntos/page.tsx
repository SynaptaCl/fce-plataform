import { CargaAdjuntosView } from "@/components/adjuntos/CargaAdjuntosView";

export const metadata = { title: "Carga de exámenes" };

/**
 * ADJ-1 — /dashboard/adjuntos
 * Única ruta del dashboard accesible para recepcionista (excepción del layout,
 * plan D6): búsqueda de paciente + subida de exámenes/imágenes (quedan
 * `pendientes` hasta validación profesional) + listado de envíos propios.
 */
export default function AdjuntosPage() {
  return <CargaAdjuntosView />;
}
