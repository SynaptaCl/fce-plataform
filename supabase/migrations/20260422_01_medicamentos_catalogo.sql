-- Migration: 20260422_01_medicamentos_catalogo
-- Sprint: R9
-- Descripción: Catálogo universal de medicamentos para autocompletado en prescripciones
-- Impacto: Tabla nueva, sin afectar existentes
-- Rollback: DROP TABLE IF EXISTS medicamentos_catalogo CASCADE;

CREATE TABLE medicamentos_catalogo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  principio_activo    text NOT NULL,        -- "Paracetamol", "Amoxicilina", "Ibuprofeno"
  nombre_comercial    text,                  -- "Tapsin", "Amoxil" — opcional, puede ser genérico
  presentacion        text NOT NULL,        -- "Comprimidos 500 mg", "Suspensión 250 mg/5 ml"
  forma_farmaceutica  text NOT NULL,        -- "comprimido", "suspension", "ampolla", "crema", etc.
  concentracion       text,                  -- "500 mg", "250 mg/5 ml" — extraíble de presentacion pero útil para filtros

  -- Vía de administración
  via_administracion  text NOT NULL,        -- "oral", "topica", "intramuscular", "endovenosa", "subcutanea", "rectal", "oftalmica", "otica", "nasal", "vaginal", "inhalatoria"

  -- Posología sugerida (referencial, el profesional puede modificar)
  dosis_adulto_sugerida    text,            -- "500-1000 mg cada 6-8 horas"
  dosis_pediatrica_sugerida text,           -- "10-15 mg/kg cada 6-8 horas" o null si no aplica

  -- Información clínica
  indicaciones_comunes      text[],         -- ["Dolor leve a moderado", "Fiebre"]
  contraindicaciones_clave  text[],         -- ["Insuficiencia hepática severa", "Alergia conocida"]

  -- Clasificación
  grupo_terapeutico   text,                  -- "Analgésico", "Antibiótico betalactámico", "AINE"
  codigo_atc          text,                  -- Código ATC OMS si se conoce, ej: "N02BE01" para paracetamol
  es_controlado       boolean NOT NULL DEFAULT false,  -- Receta retenida (no MVP, solo flag informativo)
  requiere_receta     boolean NOT NULL DEFAULT true,   -- false para venta libre

  -- Especialidades sugeridas (filtro opcional en UI)
  especialidades_comunes text[],            -- ["Medicina General", "Odontología"] — quién típicamente prescribe esto

  -- Metadatos
  origen              text NOT NULL DEFAULT 'seed',  -- 'seed' | 'clinica' | 'admin'
  id_clinica          uuid REFERENCES clinicas(id), -- nullable: si lo creó una clínica para su uso
  activo              boolean NOT NULL DEFAULT true,
  notas               text,                  -- observaciones internas, no se muestran al paciente

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_medic_principio_activo ON medicamentos_catalogo(lower(principio_activo));
CREATE INDEX idx_medic_nombre_comercial ON medicamentos_catalogo(lower(nombre_comercial));
CREATE INDEX idx_medic_grupo            ON medicamentos_catalogo(grupo_terapeutico);
CREATE INDEX idx_medic_activo           ON medicamentos_catalogo(activo);
CREATE INDEX idx_medic_clinica          ON medicamentos_catalogo(id_clinica) WHERE id_clinica IS NOT NULL;

-- Búsqueda full-text en español (principio activo + nombre comercial + presentación)
CREATE INDEX idx_medic_search ON medicamentos_catalogo
  USING gin(to_tsvector('spanish',
    coalesce(principio_activo, '') || ' ' ||
    coalesce(nombre_comercial, '') || ' ' ||
    coalesce(presentacion, '')
  ));

ALTER TABLE medicamentos_catalogo ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede consultar el catálogo global + el de su clínica
CREATE POLICY "select_catalogo"
  ON medicamentos_catalogo FOR SELECT
  TO authenticated
  USING (
    id_clinica IS NULL  -- catálogo global
    OR id_clinica IN (
      SELECT id_clinica FROM admin_users
      WHERE auth_id = auth.uid() AND activo = true
    )
  );

-- INSERT/UPDATE/DELETE del catálogo global: solo superadmin
CREATE POLICY "manage_catalogo_global"
  ON medicamentos_catalogo FOR ALL
  TO authenticated
  USING (
    id_clinica IS NULL AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_id = auth.uid() AND rol = 'superadmin' AND activo = true
    )
  );

-- INSERT/UPDATE/DELETE del catálogo de clínica: admin/director/superadmin de esa clínica
CREATE POLICY "manage_catalogo_clinica"
  ON medicamentos_catalogo FOR ALL
  TO authenticated
  USING (
    id_clinica IS NOT NULL AND id_clinica IN (
      SELECT id_clinica FROM admin_users
      WHERE auth_id = auth.uid()
        AND rol IN ('admin', 'director', 'superadmin')
        AND activo = true
    )
  );

COMMENT ON TABLE medicamentos_catalogo IS
  'Catálogo de medicamentos para autocompletado en prescripciones.
   Incluye catálogo global (id_clinica=null, mantenido por Synapta) y
   catálogos privados por clínica (id_clinica=X, mantenidos por admin de la clínica).';
