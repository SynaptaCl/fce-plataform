-- Migration: 20260618_01_fix_soap_update_withcheck_sign
-- Sprint: hotfix
-- Problema: firmar una nota SOAP falla con
--   "new row violates row-level security policy for table fce_notas_soap".
--
-- Causa raíz: la policy UPDATE `fce_soap_update` en producción define solo
--   USING (firmado = false AND id_clinica IN (...)) SIN un WITH CHECK explícito.
--   En Postgres, cuando una policy UPDATE no declara WITH CHECK, este se hereda
--   del USING. Resultado: la fila NUEVA también debe cumplir firmado = false.
--   Al firmar (SET firmado = true), la fila nueva tiene firmado = true → viola
--   el WITH CHECK heredado → "new row violates row-level security policy".
--   Firmar era imposible por diseño de la policy.
--
-- Fix: separar las dos cláusulas.
--   USING      → solo filas firmado=false de mi clínica son editables
--                 (mantiene inmutabilidad post-firma + tenant guard).
--   WITH CHECK → la fila resultante solo debe seguir en mi clínica; NO exige
--                 firmado=false → permite la transición firmado=true al firmar.
--
-- Nota: el repo estaba desincronizado con producción (la última migración en repo,
--   20260606_03, no incluía la cláusula firmado=false ni usaba IN (SELECT ...)).
--   Esta migración fija el contrato real y deja repo == prod.
--
-- Estado: PENDIENTE DE APLICAR — requiere aprobación humana (regla 15 CLAUDE.md).
--
-- Diagnóstico previo (ejecutar para confirmar el estado vivo antes de aplicar):
--   SELECT polname,
--          pg_get_expr(polqual, polrelid)      AS using_expr,
--          pg_get_expr(polwithcheck, polrelid) AS with_check_expr
--   FROM pg_policy
--   WHERE polrelid = 'fce_notas_soap'::regclass;
--   -- Se espera: fce_soap_update con with_check_expr = NULL (heredado del USING).

DROP POLICY IF EXISTS fce_soap_update ON fce_notas_soap;
CREATE POLICY fce_soap_update ON fce_notas_soap
  FOR UPDATE TO authenticated
  USING (
    firmado = false
    AND id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  )
  WITH CHECK (
    id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
  );

-- Rollback:
--   DROP POLICY IF EXISTS fce_soap_update ON fce_notas_soap;
--   CREATE POLICY fce_soap_update ON fce_notas_soap
--     FOR UPDATE TO authenticated
--     USING (id_clinica = ANY(get_clinica_ids_for_user(auth.uid())));
