-- Migration: 20260614_04_truncate_clinical_test_data
-- Sprint: A0
-- Descripción: Limpia data clínica de prueba. NO toca catálogos, config, ni admin.
-- Impacto: DELETE de filas de prueba.
-- Rollback: No aplica (data de prueba).
-- ⚠️ EJECUTAR ÚLTIMA — después de migration 03 (fce_adendas existe).

-- Orden por dependencias FK (hijos primero)
TRUNCATE TABLE fce_adendas CASCADE;
TRUNCATE TABLE instrumentos_aplicados CASCADE;
TRUNCATE TABLE fce_notas_clinicas CASCADE;
TRUNCATE TABLE fce_notas_soap CASCADE;
TRUNCATE TABLE fce_evaluaciones CASCADE;
TRUNCATE TABLE fce_periograma CASCADE;
TRUNCATE TABLE fce_prescripciones CASCADE;
TRUNCATE TABLE fce_ordenes_examen CASCADE;
TRUNCATE TABLE fce_consentimientos CASCADE;
TRUNCATE TABLE fce_egresos CASCADE;
TRUNCATE TABLE fce_signos_vitales CASCADE;
TRUNCATE TABLE fce_encuentros CASCADE;
TRUNCATE TABLE fce_anamnesis CASCADE;
TRUNCATE TABLE fce_odontograma_historial CASCADE;
TRUNCATE TABLE fce_odontograma CASCADE;
TRUNCATE TABLE fce_plan_tratamiento_items CASCADE;
TRUNCATE TABLE fce_plan_tratamiento CASCADE;
TRUNCATE TABLE logs_auditoria CASCADE;

-- NO tocar: pacientes, profesionales, admin_users, clinicas, clinicas_fce_config,
-- especialidades_catalogo, instrumentos_valoracion, medicamentos_catalogo,
-- examenes_catalogo, procedimientos_catalogo, fce_planes_intervencion
