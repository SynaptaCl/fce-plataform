export interface NotaAdministrativa {
  id: string;
  id_clinica: string;
  id_paciente: string;
  autor_admin_user_id: string;
  contenido: string;
  created_at: string;
  autor?: { nombre: string | null } | null;
}
