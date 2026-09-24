-- Policies aditivas de solo-lectura para el rol coordinador sobre M10 y plan
-- de tratamiento dental. No modifican ni reemplazan policies existentes.
-- PENDIENTE APLICAR — confirmar contra prod los nombres de columna FK
-- (id_plan en fce_plan_objetivos, id_objetivo en fce_plan_progreso, id_plan
-- en fce_plan_tratamiento_items) antes de ejecutar.
CREATE POLICY coordinador_select_plan_intervencion ON public.fce_planes_intervencion
  FOR SELECT USING (public.puede_ver_plan_coordinador(id_clinica));

CREATE POLICY coordinador_select_plan_objetivos ON public.fce_plan_objetivos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fce_planes_intervencion p
      WHERE p.id = fce_plan_objetivos.id_plan
        AND public.puede_ver_plan_coordinador(p.id_clinica)
    )
  );

CREATE POLICY coordinador_select_plan_progreso ON public.fce_plan_progreso
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fce_plan_objetivos o
      JOIN public.fce_planes_intervencion p ON p.id = o.id_plan
      WHERE o.id = fce_plan_progreso.id_objetivo
        AND public.puede_ver_plan_coordinador(p.id_clinica)
    )
  );

CREATE POLICY coordinador_select_plan_tratamiento ON public.fce_plan_tratamiento
  FOR SELECT USING (public.puede_ver_plan_coordinador(id_clinica));

CREATE POLICY coordinador_select_plan_tratamiento_items ON public.fce_plan_tratamiento_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fce_plan_tratamiento t
      WHERE t.id = fce_plan_tratamiento_items.id_plan
        AND public.puede_ver_plan_coordinador(t.id_clinica)
    )
  );
