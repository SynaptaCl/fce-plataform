-- ============================================================================
-- Separa acceso administrativo (lectura de documentos de salida) del acceso
-- clínico (contenido + escritura). PENDIENTE APLICAR — requiere aprobación humana
-- (regla 15 CLAUDE.md). Ver docs/superpowers/specs/2026-09-29-roles-admin-director-solo-lectura.md
--
-- Modelo:
--   es_profesional_clinico(clinica)  → tiene perfil profesional vinculado
--                                       (admin_user_profesionales). Lee TODO y escribe.
--   tiene_acceso_clinico(clinica)    → sin cambios. admin/director/superadmin O profesional.
--                                       Ahora solo se usa para LEER documentos de salida.
--
-- Grupo C (contenido clínico)  : solo es_profesional_clinico (lectura y escritura).
-- Grupo D (documentos de salida): lectura tiene_acceso_clinico (firmados para admin),
--                                  escritura es_profesional_clinico.
--
-- VERIFICAR antes de aplicar:
--   * columna `firmado` existe en fce_egresos, fce_prescripciones, fce_ordenes_examen,
--     fce_consentimientos, fce_informes (los triggers de inmutabilidad la usan).
--   * el rol 'profesional' de cada clínica activa tiene fila en admin_user_profesionales
--     (si no, quedará sin acceso tras aplicar). Query de chequeo al final.
--   * ROLLBACK: cada ALTER/CREATE tiene su inverso en el bloque comentado final.
-- ============================================================================

BEGIN;

-- ── 1. Función nueva ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_profesional_clinico(p_id_clinica uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN admin_user_profesionales aup ON aup.id_admin_user = au.id
    WHERE au.auth_id = (SELECT auth.uid())
      AND au.id_clinica = p_id_clinica
      AND au.activo = true
      -- Decisión 2026-09-29: el director/admin NO escribe aunque tenga perfil
      -- profesional vinculado. Solo admin_users.rol = 'profesional' es clínico.
      AND au.rol = 'profesional'
  );
$$;

-- ── 2. Grupo C — contenido clínico: solo profesional ────────────────────────
-- Policies "acceso_clinico_all" (ALL)
ALTER POLICY acceso_clinico_all ON public.fce_antropometria
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_all ON public.fce_notas_clinicas
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_all ON public.fce_odontograma
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_all ON public.fce_odontograma_historial
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_all ON public.fce_periograma
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_all ON public.fce_fichas_esteticas
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_fotos ON public.fce_ficha_estetica_fotos
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY acceso_clinico_zonas ON public.fce_ficha_estetica_zonas
  USING (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                 WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                   AND es_profesional_clinico(f.id_clinica)))
  WITH CHECK (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                      WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                        AND es_profesional_clinico(f.id_clinica)));
ALTER POLICY acceso_clinico_all ON public.instrumentos_aplicados
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));

-- Policies separadas por comando
ALTER POLICY fce_anamnesis_select ON public.fce_anamnesis USING (es_profesional_clinico(id_clinica));
ALTER POLICY fce_anamnesis_insert ON public.fce_anamnesis WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY fce_anamnesis_update ON public.fce_anamnesis
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));

ALTER POLICY fce_evaluaciones_select ON public.fce_evaluaciones USING (es_profesional_clinico(id_clinica));
ALTER POLICY fce_evaluaciones_insert ON public.fce_evaluaciones WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY fce_evaluaciones_update ON public.fce_evaluaciones
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));

ALTER POLICY fce_signos_vitales_select ON public.fce_signos_vitales USING (es_profesional_clinico(id_clinica));
ALTER POLICY fce_signos_vitales_insert ON public.fce_signos_vitales WITH CHECK (es_profesional_clinico(id_clinica));

ALTER POLICY fce_soap_select ON public.fce_notas_soap USING (es_profesional_clinico(id_clinica));
ALTER POLICY fce_soap_insert ON public.fce_notas_soap WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY fce_soap_update ON public.fce_notas_soap
  USING ((firmado = false) AND es_profesional_clinico(id_clinica))
  WITH CHECK (es_profesional_clinico(id_clinica));

ALTER POLICY resumenes_ia_select ON public.fce_resumenes_ia USING (es_profesional_clinico(id_clinica));

-- ── 3. Grupo D — documentos de salida ───────────────────────────────────────
-- 3a. Tablas con policy ALL: se reemplaza por SELECT + escritura separadas.
--     Planes (documentos vivos sin firma): admin lee todo.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fce_planes_intervencion','fce_plan_objetivos','fce_plan_progreso',
    'fce_plan_tratamiento','fce_plan_tratamiento_items'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS acceso_clinico_all ON public.%I', t);
    EXECUTE format('CREATE POLICY doc_select ON public.%I FOR SELECT USING (tiene_acceso_clinico(id_clinica))', t);
    EXECUTE format('CREATE POLICY doc_write_ins ON public.%I FOR INSERT WITH CHECK (es_profesional_clinico(id_clinica))', t);
    EXECUTE format('CREATE POLICY doc_write_upd ON public.%I FOR UPDATE USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica))', t);
    EXECUTE format('CREATE POLICY doc_write_del ON public.%I FOR DELETE USING (es_profesional_clinico(id_clinica))', t);
  END LOOP;
END $$;

--     Documentos firmables: admin solo lee FIRMADOS; profesional lee todo.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fce_egresos','fce_prescripciones','fce_ordenes_examen'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS acceso_clinico_all ON public.%I', t);
    EXECUTE format('CREATE POLICY doc_select ON public.%I FOR SELECT USING (es_profesional_clinico(id_clinica) OR (firmado = true AND tiene_acceso_clinico(id_clinica)))', t);
    EXECUTE format('CREATE POLICY doc_write_ins ON public.%I FOR INSERT WITH CHECK (es_profesional_clinico(id_clinica))', t);
    EXECUTE format('CREATE POLICY doc_write_upd ON public.%I FOR UPDATE USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica))', t);
    EXECUTE format('CREATE POLICY doc_write_del ON public.%I FOR DELETE USING (es_profesional_clinico(id_clinica))', t);
  END LOOP;
END $$;

-- 3b. Tablas con policies por comando
ALTER POLICY fce_consentimientos_select ON public.fce_consentimientos
  USING (es_profesional_clinico(id_clinica) OR (firmado = true AND tiene_acceso_clinico(id_clinica)));
ALTER POLICY fce_consentimientos_insert ON public.fce_consentimientos WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY fce_consentimientos_update ON public.fce_consentimientos
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));

ALTER POLICY informes_select ON public.fce_informes
  USING (es_profesional_clinico(id_clinica) OR (firmado = true AND tiene_acceso_clinico(id_clinica)));
ALTER POLICY informes_insert ON public.fce_informes WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY informes_update ON public.fce_informes
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY informes_delete ON public.fce_informes
  USING (es_profesional_clinico(id_clinica) AND firmado = false);

-- Encuentros: solo metadatos (sin texto clínico) → admin puede leer para auditoría operacional
ALTER POLICY fce_encuentros_insert ON public.fce_encuentros WITH CHECK (es_profesional_clinico(id_clinica));
ALTER POLICY fce_encuentros_update ON public.fce_encuentros
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
-- fce_encuentros_select queda en tiene_acceso_clinico (sin cambio)

-- Adendas: todos con acceso leen; solo profesional inserta. Autoría de errata/anulación
-- se valida en application layer (actions/adendas.ts) — ver spec §5.
DROP POLICY IF EXISTS acceso_clinico_all ON public.fce_adendas;
CREATE POLICY adendas_select ON public.fce_adendas FOR SELECT USING (tiene_acceso_clinico(id_clinica));
CREATE POLICY adendas_insert ON public.fce_adendas FOR INSERT WITH CHECK (es_profesional_clinico(id_clinica));
CREATE POLICY adendas_update ON public.fce_adendas FOR UPDATE
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));

-- ── 4. Presupuestos (M11) ───────────────────────────────────────────────────
-- Antes: get_clinica_ids_for_user() en todo → cualquier usuario de la clínica
-- (incluida recepcionista) leía y escribía. Ahora: lectura admin/director/profesional,
-- escritura solo profesional. Conserva las condiciones firmado=false en DELETE.
DROP POLICY IF EXISTS presupuestos_select ON public.fce_presupuestos;
DROP POLICY IF EXISTS presupuestos_insert ON public.fce_presupuestos;
DROP POLICY IF EXISTS presupuestos_update ON public.fce_presupuestos;
DROP POLICY IF EXISTS presupuestos_delete ON public.fce_presupuestos;
CREATE POLICY presupuestos_select ON public.fce_presupuestos FOR SELECT
  USING (tiene_acceso_clinico(id_clinica));
CREATE POLICY presupuestos_insert ON public.fce_presupuestos FOR INSERT
  WITH CHECK (es_profesional_clinico(id_clinica));
CREATE POLICY presupuestos_update ON public.fce_presupuestos FOR UPDATE
  USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica));
CREATE POLICY presupuestos_delete ON public.fce_presupuestos FOR DELETE
  USING (es_profesional_clinico(id_clinica) AND firmado = false);

DROP POLICY IF EXISTS presupuesto_items_select ON public.fce_presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_insert ON public.fce_presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_update ON public.fce_presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_delete ON public.fce_presupuesto_items;
CREATE POLICY presupuesto_items_select ON public.fce_presupuesto_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM fce_presupuestos p
                 WHERE p.id = fce_presupuesto_items.id_presupuesto
                   AND tiene_acceso_clinico(p.id_clinica)));
CREATE POLICY presupuesto_items_insert ON public.fce_presupuesto_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM fce_presupuestos p
                      WHERE p.id = fce_presupuesto_items.id_presupuesto
                        AND es_profesional_clinico(p.id_clinica)));
CREATE POLICY presupuesto_items_update ON public.fce_presupuesto_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM fce_presupuestos p
                 WHERE p.id = fce_presupuesto_items.id_presupuesto
                   AND es_profesional_clinico(p.id_clinica)))
  WITH CHECK (EXISTS (SELECT 1 FROM fce_presupuestos p
                      WHERE p.id = fce_presupuesto_items.id_presupuesto
                        AND es_profesional_clinico(p.id_clinica)));
CREATE POLICY presupuesto_items_delete ON public.fce_presupuesto_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM fce_presupuestos p
                 WHERE p.id = fce_presupuesto_items.id_presupuesto
                   AND es_profesional_clinico(p.id_clinica)
                   AND p.firmado = false));

-- ── 5. Pacientes ────────────────────────────────────────────────────────────
-- pacientes = registro demográfico compartido con synapta (agenda/admin). No es
-- contenido clínico, así que SELECT/INSERT/UPDATE conservan el predicado vigente
-- (usuarios activos de la clínica). Lo que cambia: se elimina el DELETE — antes
-- la policy ALL permitía a cualquier usuario de la clínica borrar pacientes.
-- Baja lógica / depuración solo por service_role.
DROP POLICY IF EXISTS pacientes_by_clinica ON public.pacientes;
CREATE POLICY pacientes_select ON public.pacientes FOR SELECT
  USING (id_clinica IN (SELECT get_clinica_ids_for_user((SELECT auth.uid()))));
CREATE POLICY pacientes_insert ON public.pacientes FOR INSERT
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user((SELECT auth.uid()))));
CREATE POLICY pacientes_update ON public.pacientes FOR UPDATE
  USING (id_clinica IN (SELECT get_clinica_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (id_clinica IN (SELECT get_clinica_ids_for_user((SELECT auth.uid()))));
-- (sin policy DELETE a propósito; service_all sigue vigente)

COMMIT;

-- ── Chequeo previo (correr ANTES de aplicar) ────────────────────────────────
-- Profesionales activos SIN vínculo en admin_user_profesionales (quedarían sin acceso):
--   SELECT au.id, au.id_clinica, au.rol
--   FROM admin_users au
--   LEFT JOIN admin_user_profesionales aup ON aup.id_admin_user = au.id
--   WHERE au.activo AND au.rol = 'profesional' AND aup.id IS NULL;
-- Directores/admins con perfil profesional vinculado (perderán escritura, intencional):
--   SELECT au.id, au.id_clinica, au.rol
--   FROM admin_users au JOIN admin_user_profesionales aup ON aup.id_admin_user = au.id
--   WHERE au.activo AND au.rol <> 'profesional';
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Reemplazar es_profesional_clinico( por tiene_acceso_clinico( en cada policy
-- (restaurar el modelo previo) y recrear acceso_clinico_all en las tablas del
-- Grupo D. El estado previo completo quedó registrado en la consulta pg_policies
-- del 2026-09-29 (ver spec §7).
