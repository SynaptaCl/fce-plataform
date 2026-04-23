-- Migration: 20260422_03_fce_prescripciones
-- Sprint: R9
-- Descripción: Tabla principal de prescripciones e indicaciones (módulo M7)
-- Impacto: Tabla nueva + triggers para folio correlativo e inmutabilidad
-- Rollback:
--   DROP TABLE IF EXISTS fce_prescripciones CASCADE;

CREATE TABLE fce_prescripciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica      uuid NOT NULL REFERENCES clinicas(id),
  id_paciente     uuid NOT NULL REFERENCES pacientes(id),
  id_encuentro    uuid REFERENCES fce_encuentros(id),  -- nullable: permite prescripción fuera de encuentro (futuro)

  -- Folio correlativo por clínica
  folio_numero    int NOT NULL,                          -- secuencia incremental por clínica
  folio_anio      int NOT NULL,                          -- año de emisión, para reseteo lógico anual
  folio_display   text GENERATED ALWAYS AS (
    'RX-' || folio_anio::text || '-' || lpad(folio_numero::text, 5, '0')
  ) STORED,

  -- Tipo de prescripción
  tipo            text NOT NULL CHECK (tipo IN ('farmacologica', 'indicacion_general')),

  -- Contenido farmacológico (solo si tipo='farmacologica')
  -- Estructura por medicamento:
  -- {
  --   "id_medicamento_catalogo": uuid | null,    -- null si fue ingresado manualmente
  --   "principio_activo": "Paracetamol",
  --   "nombre_comercial": "Tapsin" | null,
  --   "presentacion": "Comprimidos 500 mg",
  --   "via": "oral",
  --   "dosis": "1 comprimido",
  --   "frecuencia": "cada 8 horas",
  --   "duracion": "5 días",
  --   "cantidad_total": "15 comprimidos",
  --   "instrucciones": "Tomar después de las comidas" | null
  -- }
  medicamentos    jsonb,

  -- Contenido común
  indicaciones_generales text,                  -- texto libre adicional o cuerpo principal si tipo='indicacion_general'
  diagnostico_asociado   text,                  -- opcional: "Cefalea tensional", "Faringitis aguda", etc.

  -- Firma
  modo_firma      text NOT NULL CHECK (modo_firma IN ('impresa', 'canvas')),
  firma_canvas    text,                          -- data URL si modo='canvas', null si 'impresa'
  firmado         boolean NOT NULL DEFAULT false,
  firmado_at      timestamptz,
  firmado_por     uuid,                          -- profesionales.id

  -- Snapshot de datos del profesional al momento de firma
  -- Garantiza integridad histórica si el profesional cambia sus datos después
  prof_nombre_snapshot       text,
  prof_rut_snapshot          text,
  prof_registro_snapshot     text,               -- número de registro
  prof_tipo_registro_snapshot text,              -- 'SIS', 'Colegio Odontológico', etc.
  prof_especialidad_snapshot text,

  -- Metadatos
  created_by      uuid NOT NULL,                 -- profesionales.id
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Coherencia: folio único por clínica+año
  CONSTRAINT uq_folio_clinica_anio UNIQUE (id_clinica, folio_anio, folio_numero)
);

-- Índices para queries frecuentes
CREATE INDEX idx_presc_paciente    ON fce_prescripciones(id_paciente, created_at DESC);
CREATE INDEX idx_presc_clinica     ON fce_prescripciones(id_clinica);
CREATE INDEX idx_presc_encuentro   ON fce_prescripciones(id_encuentro) WHERE id_encuentro IS NOT NULL;
CREATE INDEX idx_presc_firmado_por ON fce_prescripciones(firmado_por) WHERE firmado_por IS NOT NULL;
CREATE INDEX idx_presc_folio_display ON fce_prescripciones(folio_display);

-- Trigger de inmutabilidad post-firma (mismo patrón que fce_notas_clinicas)
CREATE OR REPLACE FUNCTION block_update_signed_prescripcion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.firmado = true AND (
    NEW.medicamentos IS DISTINCT FROM OLD.medicamentos OR
    NEW.indicaciones_generales IS DISTINCT FROM OLD.indicaciones_generales OR
    NEW.diagnostico_asociado IS DISTINCT FROM OLD.diagnostico_asociado OR
    NEW.tipo IS DISTINCT FROM OLD.tipo OR
    NEW.firma_canvas IS DISTINCT FROM OLD.firma_canvas OR
    NEW.modo_firma IS DISTINCT FROM OLD.modo_firma
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una prescripción firmada (id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_update_signed_presc
  BEFORE UPDATE ON fce_prescripciones
  FOR EACH ROW
  EXECUTE FUNCTION block_update_signed_prescripcion();

-- Función para asignar folio correlativo por clínica+año al INSERT
CREATE OR REPLACE FUNCTION assign_folio_prescripcion()
RETURNS TRIGGER AS $$
DECLARE
  next_num int;
BEGIN
  -- Asigna año actual si no viene
  IF NEW.folio_anio IS NULL OR NEW.folio_anio = 0 THEN
    NEW.folio_anio := EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Santiago')::int;
  END IF;

  -- Calcula siguiente folio para esta clínica + año
  -- Lock advisory para evitar race conditions
  PERFORM pg_advisory_xact_lock(hashtext(NEW.id_clinica::text || NEW.folio_anio::text));

  SELECT COALESCE(MAX(folio_numero), 0) + 1
  INTO next_num
  FROM fce_prescripciones
  WHERE id_clinica = NEW.id_clinica
    AND folio_anio = NEW.folio_anio;

  NEW.folio_numero := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_folio_presc
  BEFORE INSERT ON fce_prescripciones
  FOR EACH ROW
  EXECUTE FUNCTION assign_folio_prescripcion();

-- RLS
ALTER TABLE fce_prescripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_presc"
  ON fce_prescripciones FOR ALL
  TO authenticated
  USING (id_clinica IN (
    SELECT id_clinica FROM admin_users
    WHERE auth_id = auth.uid() AND activo = true
  ));

COMMENT ON TABLE fce_prescripciones IS
  'Prescripciones e indicaciones emitidas por profesionales (módulo M7).
   Soporta receta farmacológica simple (no controlados) e indicaciones generales.
   Folio correlativo por clínica+año. Inmutable post-firma.';
