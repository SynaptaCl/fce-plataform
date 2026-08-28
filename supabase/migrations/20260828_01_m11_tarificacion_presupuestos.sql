-- Sprint PRE-1 — F4: tarificación en fce_presupuestos / fce_presupuesto_items
-- Generada 2026-08-28. Depende de F1 (synapta/supabase/migrations/20260828_01_prestaciones_catalogo_tarificacion.sql, aplicada).
-- Referencia: docs/plan-redisenio/sprints/PRE-1-tarificacion-presupuestos.md §3.2, §3.3, §6, §9 (F4)
--
-- Verificado contra prod (vigyhfpwyxihrjiygfsa) 2026-08-28:
-- - fce_presupuestos / fce_presupuesto_items: 0 filas, sin riesgo de backfill.
-- - Hoy solo hay bloqueo de firma vía RLS parcial (presupuesto_items_delete respeta firmado=false;
--   presupuestos_update y presupuesto_items_update NO tienen guard de firmado en RLS) —
--   el bloqueo real depende solo de application-layer (actions/presupuestos.ts). Este archivo
--   agrega el trigger BEFORE UPDATE que falta, igual al patrón de fce_notas_soap/fce_egresos/etc.
-- - fce_adendas_tipo_documento_check no incluye 'presupuesto' — se amplía aquí.

-- ============================================================================
-- 1. Cabecera: totales persistidos + snapshot del modelo de tarificación
-- ============================================================================

ALTER TABLE fce_presupuestos
  ADD COLUMN subtotal_clp        integer NOT NULL DEFAULT 0,
  ADD COLUMN descuento_clp       integer NOT NULL DEFAULT 0,
  ADD COLUMN neto_clp            integer NOT NULL DEFAULT 0,
  ADD COLUMN iva_clp             integer NOT NULL DEFAULT 0,
  ADD COLUMN total_clp           integer NOT NULL DEFAULT 0,
  ADD COLUMN modelo_precio       text,
  ADD COLUMN id_plan_tratamiento uuid REFERENCES fce_plan_tratamiento(id),
  ADD COLUMN created_by          uuid,
  ADD COLUMN validez_dias        integer;

COMMENT ON COLUMN fce_presupuestos.modelo_precio IS
  'Snapshot de clinicas_pagos_config.modelo_precio vigente al firmar. No se recalcula tras firmar.';
COMMENT ON COLUMN fce_presupuestos.total_clp IS
  'CLP entero, calculado server-side (lib/tarificacion/calcular.ts). Nunca confiar en total enviado por el cliente.';

-- Estados: agrega aceptado/rechazado/anulado, imprescindibles para cobrar (deuda §6 del sprint doc).
ALTER TABLE fce_presupuestos DROP CONSTRAINT fce_presupuestos_estado_check;
ALTER TABLE fce_presupuestos ADD CONSTRAINT fce_presupuestos_estado_check
  CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado', 'anulado'));

-- ============================================================================
-- 2. Ítems: FK al catálogo synapta (solo-read) + snapshot completo de tarificación
-- ============================================================================

ALTER TABLE fce_presupuesto_items
  ADD COLUMN id_prestacion   uuid REFERENCES prestaciones_catalogo(id),
  ADD COLUMN codigo          text,
  ADD COLUMN id_profesional  uuid REFERENCES profesionales(id),
  ADD COLUMN pieza           integer CHECK (pieza BETWEEN 11 AND 48),
  ADD COLUMN superficie      text,
  ADD COLUMN precio_base     integer NOT NULL DEFAULT 0,
  ADD COLUMN recargo_pct     numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN descuento_pct   numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN descuento_clp   integer NOT NULL DEFAULT 0,
  ADD COLUMN afecta_iva      boolean NOT NULL DEFAULT false,
  ADD COLUMN total_linea_clp integer NOT NULL DEFAULT 0,
  -- CAPA B — snapshot de liquidación interna. Nunca se selecciona en el path del PDF
  -- ni en ningún action de lectura accesible al paciente (ver sprint doc §2, §11 riesgo).
  ADD COLUMN honorario_tipo  text CHECK (honorario_tipo IN ('sueldo', 'porcentaje', 'monto_fijo', 'arriendo')),
  ADD COLUMN honorario_valor numeric(12,2),
  ADD COLUMN honorario_clp   integer;

COMMENT ON COLUMN fce_presupuesto_items.honorario_clp IS
  'CAPA B — reparto interno del profesional. Nunca renderizar en PresupuestoPdfView ni en actions de lectura del paciente.';

-- ============================================================================
-- 3. Inmutabilidad post-firma — hoy solo application-layer, se agrega el trigger que falta
-- ============================================================================

CREATE OR REPLACE FUNCTION block_update_signed_presupuesto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.titulo IS DISTINCT FROM OLD.titulo OR
    NEW.notas IS DISTINCT FROM OLD.notas OR
    NEW.id_paciente IS DISTINCT FROM OLD.id_paciente OR
    NEW.id_profesional IS DISTINCT FROM OLD.id_profesional OR
    NEW.id_encuentro IS DISTINCT FROM OLD.id_encuentro OR
    NEW.id_plan_tratamiento IS DISTINCT FROM OLD.id_plan_tratamiento OR
    NEW.modelo_precio IS DISTINCT FROM OLD.modelo_precio OR
    NEW.subtotal_clp IS DISTINCT FROM OLD.subtotal_clp OR
    NEW.descuento_clp IS DISTINCT FROM OLD.descuento_clp OR
    NEW.neto_clp IS DISTINCT FROM OLD.neto_clp OR
    NEW.iva_clp IS DISTINCT FROM OLD.iva_clp OR
    NEW.total_clp IS DISTINCT FROM OLD.total_clp
  ) THEN
    RAISE EXCEPTION 'No se puede modificar un presupuesto firmado';
  END IF;
  -- estado SÍ puede cambiar tras firmar (enviado -> aceptado/rechazado/anulado, sprint doc §6):
  -- firmarPresupuesto() setea firmado=true y estado='enviado' en el mismo UPDATE; los
  -- estados siguientes son el ciclo de vida post-firma, no una corrección de contenido.
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION block_update_signed_presupuesto() IS
  'Bloquea UPDATE de campos de contenido/tarificación en presupuestos firmados. estado queda libre para el ciclo de vida post-firma (enviado->aceptado/rechazado/anulado). Corrección real = adenda tipo_documento=presupuesto, nunca UPDATE.';

CREATE TRIGGER trg_block_update_signed_presupuesto
  BEFORE UPDATE ON fce_presupuestos
  FOR EACH ROW EXECUTE FUNCTION block_update_signed_presupuesto();

-- Ítems: snapshot completo, sin excepciones — un presupuesto firmado no admite tocar
-- sus líneas (ni insertar, ni editar, ni borrar). RLS ya bloqueaba DELETE parcialmente
-- (presupuesto_items_delete respeta firmado=false); este trigger cubre INSERT/UPDATE/DELETE
-- a nivel DB, incluyendo escrituras via service_role que RLS no alcanza.
CREATE OR REPLACE FUNCTION block_write_items_signed_presupuesto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_firmado boolean;
BEGIN
  SELECT firmado INTO v_firmado
  FROM fce_presupuestos
  WHERE id = COALESCE(NEW.id_presupuesto, OLD.id_presupuesto);

  IF v_firmado THEN
    RAISE EXCEPTION 'No se pueden modificar los ítems de un presupuesto firmado';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_block_write_items_signed_presupuesto
  BEFORE INSERT OR UPDATE OR DELETE ON fce_presupuesto_items
  FOR EACH ROW EXECUTE FUNCTION block_write_items_signed_presupuesto();

-- ============================================================================
-- 4. Adendas: el presupuesto pasa a ser documento corregible por el mecanismo existente
-- ============================================================================

ALTER TABLE fce_adendas DROP CONSTRAINT fce_adendas_tipo_documento_check;
ALTER TABLE fce_adendas ADD CONSTRAINT fce_adendas_tipo_documento_check
  CHECK (tipo_documento IN (
    'soap', 'nota_clinica', 'periograma', 'egreso',
    'prescripcion', 'orden_examen', 'consentimiento', 'presupuesto'
  ));
