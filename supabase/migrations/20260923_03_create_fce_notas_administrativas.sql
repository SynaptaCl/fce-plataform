-- Notas administrativas: correspondencia de gestión, NO documento clínico.
-- Append-only (sin policy UPDATE/DELETE), sin trigger de inmutabilidad porque
-- no es un acto clínico Ley 20.584. PENDIENTE APLICAR.
CREATE TABLE public.fce_notas_administrativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  id_paciente uuid NOT NULL REFERENCES public.pacientes(id),
  autor_admin_user_id uuid NOT NULL REFERENCES public.admin_users(id),
  contenido text NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fce_notas_administrativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_notas_administrativas ON public.fce_notas_administrativas
  FOR SELECT USING (public.puede_ver_plan_coordinador(id_clinica));

CREATE POLICY insert_notas_administrativas ON public.fce_notas_administrativas
  FOR INSERT WITH CHECK (
    public.puede_ver_plan_coordinador(id_clinica)
    -- Autoría real: autor_admin_user_id debe ser la propia fila admin_users
    -- del usuario autenticado en esa clínica (evita forjar autoría vía
    -- PostgREST directo con el id de otro admin_users).
    AND autor_admin_user_id IN (
      SELECT id FROM public.admin_users
      WHERE auth_id = auth.uid()
        AND id_clinica = fce_notas_administrativas.id_clinica
        AND activo = true
    )
    -- El paciente debe pertenecer a la misma clínica (pacientes.id no es
    -- suficiente por sí solo — es una FK global, no acotada por tenant).
    AND EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.id = fce_notas_administrativas.id_paciente
        AND p.id_clinica = fce_notas_administrativas.id_clinica
    )
  );
