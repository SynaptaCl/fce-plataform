-- ============================================================================
-- Sprint PRE-1 (fce-plataform) — F8: plan dental sobre prestaciones_catalogo
--
-- ⚠️ NO APLICAR sin confirmación explícita del fundador (regla 15 CLAUDE.md).
--    DB compartida con synapta (proyecto vigyhfpwyxihrjiygfsa).
--
-- fce_plan_tratamiento(_items) tiene 0 filas en producción (verificado
-- 2026-08-28): DROP sin backfill. fce_presupuestos.id_plan_tratamiento ya
-- existe desde F4.
--
-- El ítem dental referencia el catálogo de prestaciones; el precio deja de
-- vivir en el plan: M11 (presupuesto) es la única fuente de presupuesto
-- (decisión 8 del fundador). `procedimiento` se conserva SOLO como etiqueta
-- snapshot del nombre para display; presupuesto_total/monto_pagado del plan
-- dejan de escribirse (pasan a derivados de M11 en código).
-- ============================================================================

ALTER TABLE public.fce_plan_tratamiento_items
  ADD COLUMN id_prestacion uuid REFERENCES public.prestaciones_catalogo(id);

ALTER TABLE public.fce_plan_tratamiento_items
  DROP COLUMN valor_unitario;

CREATE INDEX idx_plan_items_prestacion
  ON public.fce_plan_tratamiento_items (id_prestacion)
  WHERE id_prestacion IS NOT NULL;
