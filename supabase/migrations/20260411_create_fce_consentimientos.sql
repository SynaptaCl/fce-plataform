-- Migration: 20260411_create_fce_consentimientos
-- Tabla de consentimientos informados (M5)
--
-- ⚠️ RECONSTRUIDA 2026-09-22 desde el schema REAL de producción (proyecto
-- vigyhfpwyxihrjiygfsa, verificada vía MCP Supabase con information_schema /
-- pg_constraint / pg_policies / pg_indexes). HISTÓRICA — ya aplicada y
-- evolucionada: NO EJECUTAR (mismo tratamiento que las reconstruidas de
-- §8/§10 CLAUDE.md: 20260415_01, 20260425_03, 20260427_02, 20260429_03,
-- 20260724_01).
--
-- Diferencias vs el archivo original (que quedó desactualizado y fue
-- reemplazado por esta reconstrucción):
--   1. id_clinica: NOT NULL con FK a clinicas(id) — en el archivo original era
--      nullable sin FK. En prod siempre fue obligatoria (verificado: el INSERT
--      sin id_clinica falla con not-null constraint).
--   2. FK id_paciente → pacientes(id) SIN "ON DELETE CASCADE" (NO ACTION en
--      prod — el original decía CASCADE). Un paciente con consentimientos no
--      se puede borrar por FK, decisión implícita de prod: los consentimientos
--      son registro legal.
--   3. CHECK de tipo incluye 6 valores: general, menores, teleconsulta,
--      uso_ia (2026-05-25), grabacion_ia (20260819_02, AMB-1) y
--      procedimiento_estetico (20260921_01, M13).
--   4. created_by es uuid simple SIN FK a auth.users (en prod no existe la FK).
--   5. updated_at (agregada por 20260614_01, sprint A0).
--   6. RLS con tiene_acceso_clinico(id_clinica) en SELECT/INSERT/UPDATE,
--      nombres de policy fce_consentimientos_{select,insert,update} — el
--      original tenía SELECT USING (true) (cross-tenant) y UPDATE restringida
--      a created_by. Migración de policies fuera del alcance de este archivo
--      (ver §9 CLAUDE.md "RLS — tiene_acceso_clinico()").
--   7. Sin policy DELETE (deliberado): los consentimientos no se borran; la
--      revocación es append-only (fila nueva, ver abajo).
--   8. Trigger de inmutabilidad: creado por 20260614_01 y endurecido por
--      20260921_02 (solo updated_at mutable post-firma) — se lista por
--      fidelidad del estado actual, no se crea acá.
--   9. Único índice en prod: el pkey (sin índice secundario por id_paciente —
--      deuda menor, no resuelta deliberadamente en esta reconstrucción).

CREATE TABLE IF NOT EXISTS fce_consentimientos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica         uuid NOT NULL REFERENCES clinicas(id),
  id_paciente        uuid NOT NULL REFERENCES pacientes(id),
  tipo               text NOT NULL CHECK (tipo IN ('general', 'menores', 'teleconsulta', 'uso_ia', 'grabacion_ia', 'procedimiento_estetico')),
  version            integer NOT NULL DEFAULT 1,
  contenido          text NOT NULL,
  firma_paciente     jsonb,
  firma_profesional  jsonb,
  firmado            boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  created_by         uuid,
  firmado_at         timestamptz,
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE fce_consentimientos ENABLE ROW LEVEL SECURITY;

-- Policies actuales de prod (renombradas y migradas a tiene_acceso_clinico
-- fuera de este archivo). Referencia del estado verificado 2026-09-22:
--   fce_consentimientos_select  → SELECT   USING (tiene_acceso_clinico(id_clinica))
--   fce_consentimientos_insert  → INSERT   WITH CHECK (tiene_acceso_clinico(id_clinica))
--   fce_consentimientos_update  → UPDATE   USING/WITH CHECK (tiene_acceso_clinico(id_clinica))
--   (sin policy DELETE — solo service role)

-- Trigger de inmutabilidad (estado actual, creado en 20260614_01, endurecido
-- en 20260921_02): si firmado = true, SOLO updated_at puede cambiar. La
-- revocación de consentimientos (AMB-1, tipo='grabacion_ia') se modela
-- append-only: INSERT de fila nueva con firmado=false, versión +1 — NUNCA un
-- UPDATE sobre la fila firmada. Ver block_update_signed_consentimiento() y
-- src/lib/ambient/consentimiento.ts.
