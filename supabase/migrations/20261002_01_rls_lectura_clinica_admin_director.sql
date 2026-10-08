-- ============================================================================
-- Decisión 2026-10-02: admin / director / superadmin LEEN el contenido clínico
-- (SOAP, anamnesis, notas, evaluaciones, recetas, órdenes, etc.) pero NO escriben:
-- la atención clínica sigue siendo exclusiva de `profesional`.
--
-- Revierte SOLO la parte de LECTURA de 20260929_01 (que dejó el contenido clínico
-- leíble únicamente por es_profesional_clinico). La ESCRITURA no cambia.
--
-- Modelo resultante:
--   SELECT  → tiene_acceso_clinico(id_clinica)   (admin/director/superadmin O profesional)
--   INSERT/UPDATE/DELETE → es_profesional_clinico(id_clinica)   (solo rol 'profesional')
--
-- APLICADA en prod (verificado vía MCP 2026-10-08: 8 policies clinico_select, 0 acceso_clinico_all).
-- Aplicada fuera de apply_migration, por eso no figura en el historial de migrations de Supabase.
-- Ya no se limita a documentos firmados: el director ve también borradores.
-- ROLLBACK: reemplazar tiene_acceso_clinico( por es_profesional_clinico( en los
-- SELECT de este archivo (y restaurar `firmado = true AND` en documentos del Grupo D).
-- ============================================================================

BEGIN;

-- ── 1. Tablas con policy ALL → se parte en SELECT + escritura ───────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('fce_antropometria',        'acceso_clinico_all'),
    ('fce_notas_clinicas',       'acceso_clinico_all'),
    ('fce_odontograma',          'acceso_clinico_all'),
    ('fce_odontograma_historial','acceso_clinico_all'),
    ('fce_periograma',           'acceso_clinico_all'),
    ('fce_fichas_esteticas',     'acceso_clinico_all'),
    ('fce_ficha_estetica_fotos', 'acceso_clinico_fotos'),
    ('instrumentos_aplicados',   'acceso_clinico_all')
  ) AS v(tabla, politica) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.politica, r.tabla);
    EXECUTE format('CREATE POLICY clinico_select ON public.%I FOR SELECT USING (tiene_acceso_clinico(id_clinica))', r.tabla);
    EXECUTE format('CREATE POLICY clinico_write_ins ON public.%I FOR INSERT WITH CHECK (es_profesional_clinico(id_clinica))', r.tabla);
    EXECUTE format('CREATE POLICY clinico_write_upd ON public.%I FOR UPDATE USING (es_profesional_clinico(id_clinica)) WITH CHECK (es_profesional_clinico(id_clinica))', r.tabla);
    EXECUTE format('CREATE POLICY clinico_write_del ON public.%I FOR DELETE USING (es_profesional_clinico(id_clinica))', r.tabla);
  END LOOP;
END $$;

-- Zonas de ficha estética: acceso vía join a la cabecera
DROP POLICY IF EXISTS acceso_clinico_zonas ON public.fce_ficha_estetica_zonas;
CREATE POLICY zonas_select ON public.fce_ficha_estetica_zonas FOR SELECT
  USING (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                 WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                   AND tiene_acceso_clinico(f.id_clinica)));
CREATE POLICY zonas_write_ins ON public.fce_ficha_estetica_zonas FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                      WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                        AND es_profesional_clinico(f.id_clinica)));
CREATE POLICY zonas_write_upd ON public.fce_ficha_estetica_zonas FOR UPDATE
  USING (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                 WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                   AND es_profesional_clinico(f.id_clinica)))
  WITH CHECK (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                      WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                        AND es_profesional_clinico(f.id_clinica)));
CREATE POLICY zonas_write_del ON public.fce_ficha_estetica_zonas FOR DELETE
  USING (EXISTS (SELECT 1 FROM fce_fichas_esteticas f
                 WHERE f.id = fce_ficha_estetica_zonas.id_ficha_estetica
                   AND es_profesional_clinico(f.id_clinica)));

-- ── 2. Policies SELECT separadas: solo se reabre la lectura ─────────────────
ALTER POLICY fce_anamnesis_select      ON public.fce_anamnesis      USING (tiene_acceso_clinico(id_clinica));
ALTER POLICY fce_evaluaciones_select   ON public.fce_evaluaciones   USING (tiene_acceso_clinico(id_clinica));
ALTER POLICY fce_signos_vitales_select ON public.fce_signos_vitales USING (tiene_acceso_clinico(id_clinica));
ALTER POLICY fce_soap_select           ON public.fce_notas_soap     USING (tiene_acceso_clinico(id_clinica));
ALTER POLICY resumenes_ia_select       ON public.fce_resumenes_ia   USING (tiene_acceso_clinico(id_clinica));

-- ── 3. Documentos de salida: lectura sin restricción de `firmado` ───────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fce_egresos','fce_prescripciones','fce_ordenes_examen'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS doc_select ON public.%I', t);
    EXECUTE format('CREATE POLICY doc_select ON public.%I FOR SELECT USING (tiene_acceso_clinico(id_clinica))', t);
  END LOOP;
END $$;

ALTER POLICY fce_consentimientos_select ON public.fce_consentimientos USING (tiene_acceso_clinico(id_clinica));
ALTER POLICY informes_select            ON public.fce_informes        USING (tiene_acceso_clinico(id_clinica));

COMMIT;

-- ── Verificación post-aplicar (simular director en transacción revertida) ────
-- Esperado: director lee filas de SOAP/anamnesis/notas/recetas; INSERT/UPDATE en
-- cualquier tabla fce_* clínica falla por RLS; profesional sigue leyendo y escribiendo.
-- Actualizar test: npm run test:roles-admin-solo-lectura (hoy asume lectura = 0 filas).
