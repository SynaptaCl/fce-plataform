-- Migration: 20260602_02_extend_trigger_inmutabilidad
-- Sprint: P2 / Fase 2
-- Descripción: Extiende el trigger de inmutabilidad para proteger contenido_estructurado
-- Pre-requisito: Migration 20260602_01 aplicada (columna contenido_estructurado existe).
-- El trigger trg_block_update_signed_nota ya debe existir en la DB enlazado a block_update_signed_nota_clinica().
-- Esta migration reemplaza la función para incluir las nuevas columnas en el bloqueo.

CREATE OR REPLACE FUNCTION block_update_signed_nota_clinica()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.contenido IS DISTINCT FROM OLD.contenido OR
    NEW.motivo_consulta IS DISTINCT FROM OLD.motivo_consulta OR
    NEW.diagnostico IS DISTINCT FROM OLD.diagnostico OR
    NEW.plan IS DISTINCT FROM OLD.plan OR
    NEW.contenido_estructurado IS DISTINCT FROM OLD.contenido_estructurado OR
    NEW.secciones_estructuradas IS DISTINCT FROM OLD.secciones_estructuradas
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una nota clínica firmada (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nota: El trigger trg_block_update_signed_nota ya está enlazado a esta función.
-- No recrear el trigger para evitar duplicados.
