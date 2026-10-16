-- Migration: 20261016_01_fce_resumenes_ia_versiones
-- Descripción: Historial versionado del Resumen IA (optimización de tokens).
--   Cada fila es una versión VÁLIDA generada del resumen de un paciente:
--   'completa' (ficha entera) o 'incremental' (resumen previo + evoluciones nuevas).
--   Solo se insertan versiones que se generaron y parsearon bien: un fallo nunca deja fila,
--   así que la última versión siempre es la última válida.
--   `fce_resumenes_ia` se mantiene como puntero a la versión vigente (1 fila por paciente×clínica).
-- Impacto: tabla nueva. No modifica tablas existentes. `synapta` no lee esta tabla.
-- Escritura: solo service_role (Server Actions / after()). Lectura: tiene_acceso_clinico().
-- Rollback: DROP TABLE IF EXISTS fce_resumenes_ia_versiones;
-- Aplicada en prod (DB producto) el 2026-10-16.

CREATE TABLE fce_resumenes_ia_versiones (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_clinica                 uuid NOT NULL REFERENCES clinicas(id),
  id_paciente                uuid NOT NULL REFERENCES pacientes(id),

  -- Versión correlativa por paciente×clínica (1, 2, 3…).
  version                    integer NOT NULL CHECK (version >= 1),
  tipo                       text NOT NULL CHECK (tipo IN ('completa', 'incremental')),
  -- Por qué se generó así: sin_version_previa | limite_incrementales | cambio_plan | alta |
  -- edicion_evolucion | adenda | cambio_contexto_base | exceso_nuevas | manual | incremental
  motivo                     text NOT NULL,
  modelo                     text NOT NULL,

  reporte                    jsonb NOT NULL,

  -- Cobertura: IDs de evoluciones firmadas (fce_notas_soap + fce_notas_clinicas) y adendas
  -- firmadas (fce_adendas) que esta versión incorpora.
  ids_evoluciones_cubiertas  uuid[] NOT NULL DEFAULT '{}',
  ids_adendas_cubiertas      uuid[] NOT NULL DEFAULT '{}',

  -- Hash de las secciones NO evolutivas (demográfico, anamnesis, medicación, exámenes,
  -- instrumentos, alertas). Si cambia, el siguiente resumen es completo.
  hash_contexto_base         text NOT NULL,
  -- Hash del contexto completo (mismo valor que va al puntero fce_resumenes_ia.contexto_hash).
  contexto_hash              text NOT NULL,

  -- Cuántas incrementales van desde la última completa (0 en una completa). Tope: 5.
  incrementales_desde_completa integer NOT NULL DEFAULT 0 CHECK (incrementales_desde_completa >= 0),

  -- Medición de ahorro. Sin contenido ni PII.
  tokens_input               integer,
  tokens_output              integer,
  tokens_cache_read          integer,
  tokens_cache_creation      integer,

  generado_por               uuid NOT NULL,  -- auth.users.id de quien disparó el evento
  generado_en                timestamptz NOT NULL DEFAULT now(),

  -- Si dos firmas simultáneas intentan la misma versión, gana una y la otra falla limpio.
  CONSTRAINT fce_resumenes_ia_versiones_uq UNIQUE (id_paciente, id_clinica, version),
  -- Una completa siempre reinicia el contador.
  CONSTRAINT fce_resumenes_ia_versiones_completa_chk
    CHECK (tipo <> 'completa' OR incrementales_desde_completa = 0)
);

CREATE INDEX idx_resumenes_versiones_vigente
  ON fce_resumenes_ia_versiones (id_paciente, id_clinica, version DESC);

CREATE INDEX idx_resumenes_versiones_clinica
  ON fce_resumenes_ia_versiones (id_clinica, generado_en DESC);

ALTER TABLE fce_resumenes_ia_versiones ENABLE ROW LEVEL SECURITY;

-- Lectura: mismo criterio que fce_resumenes_ia (resumenes_ia_select).
CREATE POLICY resumenes_versiones_select ON fce_resumenes_ia_versiones
  FOR SELECT TO authenticated
  USING (tiene_acceso_clinico(id_clinica));

-- Sin policies de INSERT/UPDATE/DELETE: solo service_role (bypasea RLS).
-- El historial es append-only: ningún rol de aplicación modifica ni borra versiones.

COMMENT ON TABLE fce_resumenes_ia_versiones IS
  'Historial versionado del Resumen IA. Append-only. Solo versiones válidas (un fallo no deja fila). INSERT solo service_role. fce_resumenes_ia es el puntero a la vigente.';
