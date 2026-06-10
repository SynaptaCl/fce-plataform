export interface Presupuesto {
  id: string;
  id_clinica: string;
  id_paciente: string;
  id_encuentro: string | null;
  id_profesional: string;
  titulo: string;
  estado: 'borrador' | 'enviado';
  notas: string | null;
  firmado: boolean;
  firmado_at: string | null;
  created_at: string;
  updated_at: string;
  items?: PresupuestoItem[];
  profesional?: { nombre: string; especialidad: string };
}

export interface PresupuestoItem {
  id: string;
  id_presupuesto: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number; // CLP enteros
  orden: number;
}

export type PresupuestoFormData = {
  titulo: string;
  notas?: string;
  items: Omit<PresupuestoItem, 'id' | 'id_presupuesto'>[];
};
