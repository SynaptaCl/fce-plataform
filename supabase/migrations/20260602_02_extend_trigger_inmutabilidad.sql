-- Migration: 20260602_02_extend_trigger_inmutabilidad
-- Sprint: P2 / Fase 2
-- Descripción: Extiende el trigger de inmutabilidad para incluir contenido_estructurado
-- Pre-requisito: Migration 20260602_01 aplicada. El trigger trg_block_update_signed_nota debe existir.
-- NOTA PARA EL OPERADOR: Verificar el nombre exacto de la función trigger en DB antes de aplicar.

CREATE OR REPLACE FUNCTION block_update_signed_nota()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.firmado = TRUE THEN
    RAISE EXCEPTION 'No se puede modificar una nota clínica firmada (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
-- El trigger trg_block_update_signed_nota ya debe existir enlazado a esta función.
-- Si no existe, crear:
-- CREATE TRIGGER trg_block_update_signed_nota
--   BEFORE UPDATE ON fce_notas_clinicas
--   FOR EACH ROW EXECUTE FUNCTION block_update_signed_nota();
