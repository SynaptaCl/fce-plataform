-- Migration: 20260422_04_seed_modulo_m7
-- Sprint: R9
-- Descripción: Habilita módulo M7_prescripciones en clínicas existentes que lo requieran
-- Impacto: UPDATE en clinicas_fce_config (no destructivo)
-- Rollback:
--   UPDATE clinicas_fce_config
--   SET modulos_activos = array_remove(modulos_activos, 'M7_prescripciones')
--   WHERE 'M7_prescripciones' = ANY(modulos_activos);

-- Nota: NO activamos M7 automáticamente en todas las clínicas.
-- Solo activamos en clínicas donde tiene sentido (medicina, odonto, enfermería).
-- El admin de cada clínica puede activarlo después desde synapta-admin.

-- Activar M7 en Renata (medicina general) si existe
UPDATE clinicas_fce_config
SET modulos_activos = array_append(modulos_activos, 'M7_prescripciones'),
    config_modulos = jsonb_set(
      coalesce(config_modulos, '{}'::jsonb),
      '{M7_prescripciones}',
      '{
        "modo_firma_default": "canvas",
        "requiere_diagnostico": false,
        "header_pdf": {
          "incluir_logo": true,
          "incluir_direccion": true,
          "texto_pie_legal": "Receta médica simple. No válida para psicotrópicos ni estupefacientes."
        }
      }'::jsonb
    )
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'renata')
  AND NOT ('M7_prescripciones' = ANY(modulos_activos));

-- Activar M7 en Nuvident (odontología) si existe
UPDATE clinicas_fce_config
SET modulos_activos = array_append(modulos_activos, 'M7_prescripciones'),
    config_modulos = jsonb_set(
      coalesce(config_modulos, '{}'::jsonb),
      '{M7_prescripciones}',
      '{
        "modo_firma_default": "impresa",
        "requiere_diagnostico": false,
        "header_pdf": {
          "incluir_logo": true,
          "incluir_direccion": true,
          "texto_pie_legal": "Receta odontológica simple. No válida para psicotrópicos ni estupefacientes."
        }
      }'::jsonb
    )
WHERE id_clinica = (SELECT id FROM clinicas WHERE slug = 'nuvident')
  AND NOT ('M7_prescripciones' = ANY(modulos_activos));

-- Korporis (rehabilitación) NO se activa por defecto.
-- Si Korporis quiere usar M7 para indicaciones generales (no farmacológicas),
-- se activa manualmente desde synapta-admin.
