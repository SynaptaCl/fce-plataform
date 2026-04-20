import type { EspecialidadCodigo, Rol } from "@/lib/modules/registry";

export interface Practitioner {
  id: string;
  rut: string;
  nombre: string;
  apellidos: string;
  especialidad: EspecialidadCodigo;
  rol: Rol;
  registro_superintendencia?: string;
  activo: boolean;
  created_at: string;
}
