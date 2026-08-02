-- ============================================================================
-- Migration: 20260802_01_fix_trigger_periograma_columna_inexistente
-- Sprint: LEGAL1 (hallazgo de auditoría de cumplimiento, verificado vía MCP Supabase)
-- Descripción: block_update_signed_periograma() referencia OLD.firmado_en, columna
--   que NUNCA existió en fce_periograma (columnas reales: firmado boolean,
--   firmado_at timestamptz, firmado_por uuid — confirmado vía pg_attribute).
--   El trigger trg_block_update_signed_periograma es BEFORE UPDATE y se
--   ejecuta en TODO UPDATE a la tabla, firmada o no. Efecto: cualquier UPDATE
--   a fce_periograma (guardar avances sin firmar, o firmar) falla hoy en
--   producción con el error "record \"old\" has no field \"firmado_en\"".
--   src/app/actions/dental/periograma.ts (savePeriograma, signPeriograma)
--   hace UPDATE en ambos flujos — ambos están rotos hasta aplicar este fix.
-- Impacto: CREATE OR REPLACE de una función existente. No toca datos, no
--   requiere backfill. El trigger ya apunta a esta función.
-- Rollback: revertir a la definición con `OLD.firmado_en IS NOT NULL`
--   (no recomendado — esa versión es la que está rota).
-- Aprobación humana pendiente — NO aplicar sin revisión (CLAUDE.md regla 15).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.block_update_signed_periograma()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado = true AND (
    NEW.datos IS DISTINCT FROM OLD.datos OR
    NEW.diagnostico_icd IS DISTINCT FROM OLD.diagnostico_icd
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un periograma firmado';
  END IF;
  RETURN NEW;
END;
$function$;
