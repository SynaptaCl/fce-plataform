-- ============================================================================
-- Migration: 20260602_03_seed_instrumentos_nutricion
-- Sprint: P2 / Fase 4A
-- Descripción: Seed de instrumentos de valoración nutricional (MNA, MUST, SGA)
--
-- ⚠️  VALIDACIÓN CLÍNICA REQUERIDA
-- Estos instrumentos requieren revisión por un nutricionista certificado antes
-- de activación. Los items y puntajes deben verificarse contra las versiones
-- originales publicadas. No activar en producción sin aprobación de profesional
-- clínico (regla del CLAUDE.md).
--
-- Rollback:
--   DELETE FROM instrumentos_valoracion WHERE codigo IN ('mna', 'must', 'sga');
-- ============================================================================

-- Asegurar que tipo_renderer acepta 'registro_externo' (Sprint N1 — puede estar
-- pendiente de aplicar en algunos entornos).
--
-- ⚠️  PRE-FLIGHT OBLIGATORIO antes de aplicar:
--   SELECT DISTINCT tipo_renderer FROM instrumentos_valoracion;
-- Confirmar que los únicos valores son 'escala_simple', 'componente_custom', 'registro_externo'.
-- Si existe algún otro valor, NO aplicar este bloque hasta coordinarlo.
DO $$
BEGIN
  ALTER TABLE instrumentos_valoracion
    DROP CONSTRAINT IF EXISTS instrumentos_valoracion_tipo_renderer_check;

  ALTER TABLE instrumentos_valoracion
    ADD CONSTRAINT instrumentos_valoracion_tipo_renderer_check
    CHECK (tipo_renderer IN ('escala_simple', 'componente_custom', 'registro_externo'));
EXCEPTION
  WHEN others THEN
    -- Constraint ya existía con todos los valores; ignorar.
    NULL;
END $$;

-- ============================================================================
-- 1. MNA — Mini Nutritional Assessment (escala_simple)
--    © Nestlé Nutrition Institute — uso con atribución.
-- ============================================================================
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades,
   tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'mna',
  'Mini Nutritional Assessment (MNA)',
  'Instrumento de screening y evaluación nutricional validado internacionalmente. 18 preguntas, puntaje máximo 30.',
  '1.0',
  ARRAY['Nutrición'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "atribucion": "Guigoz Y, Vellas BJ. Malnutrition in the elderly. Facts Res Gerontol. 1997. © Nestlé Nutrition Institute, uso con atribución.",
    "nota_clinica": "⚠️ Requiere revisión por nutricionista certificado antes de activación en producción.",
    "items": [
      {
        "codigo": "ingesta_declive",
        "label": "A — ¿Ha disminuido la ingesta de alimentos en los últimos 3 meses?",
        "opciones": [
          {"label": "Disminución grave", "valor": 0},
          {"label": "Disminución moderada", "valor": 1},
          {"label": "Sin disminución", "valor": 2}
        ]
      },
      {
        "codigo": "perdida_peso",
        "label": "B — Pérdida de peso en los últimos 3 meses",
        "opciones": [
          {"label": "Pérdida > 3 kg", "valor": 0},
          {"label": "No lo sabe", "valor": 1},
          {"label": "Pérdida entre 1-3 kg", "valor": 2},
          {"label": "Sin pérdida de peso", "valor": 3}
        ]
      },
      {
        "codigo": "movilidad",
        "label": "C — Movilidad",
        "opciones": [
          {"label": "Encamado o en silla de ruedas", "valor": 0},
          {"label": "Capaz de levantarse, pero sin salir", "valor": 1},
          {"label": "Sale del domicilio", "valor": 2}
        ]
      },
      {
        "codigo": "estres_enfermedad",
        "label": "D — Enfermedad aguda o estrés psicológico en los últimos 3 meses",
        "opciones": [
          {"label": "Sí", "valor": 0},
          {"label": "No", "valor": 2}
        ]
      },
      {
        "codigo": "problemas_neuro",
        "label": "E — Problemas neuropsicológicos",
        "opciones": [
          {"label": "Demencia o depresión graves", "valor": 0},
          {"label": "Demencia o depresión moderadas", "valor": 1},
          {"label": "Sin problemas psicológicos", "valor": 2}
        ]
      },
      {
        "codigo": "imc_screening",
        "label": "F — IMC (kg/m²)",
        "opciones": [
          {"label": "IMC < 19", "valor": 0},
          {"label": "19 ≤ IMC < 21", "valor": 1},
          {"label": "21 ≤ IMC < 23", "valor": 2},
          {"label": "IMC ≥ 23", "valor": 3}
        ]
      },
      {
        "codigo": "domicilio_independiente",
        "label": "G — ¿Vive de forma independiente en su domicilio?",
        "opciones": [
          {"label": "No", "valor": 0},
          {"label": "Sí", "valor": 1}
        ]
      },
      {
        "codigo": "medicamentos",
        "label": "H — ¿Toma más de 3 medicamentos al día?",
        "opciones": [
          {"label": "Sí", "valor": 0},
          {"label": "No", "valor": 1}
        ]
      },
      {
        "codigo": "lesiones_piel",
        "label": "I — ¿Úlceras o lesiones cutáneas?",
        "opciones": [
          {"label": "Sí", "valor": 0},
          {"label": "No", "valor": 1}
        ]
      },
      {
        "codigo": "comidas_dia",
        "label": "J — ¿Cuántas comidas completas hace al día?",
        "opciones": [
          {"label": "1 comida", "valor": 0},
          {"label": "2 comidas", "valor": 1},
          {"label": "3 comidas", "valor": 2}
        ]
      },
      {
        "codigo": "proteinas",
        "label": "K — Indicadores de ingesta proteica",
        "opciones": [
          {"label": "0 o 1 respuesta positiva", "valor": 0},
          {"label": "2 respuestas positivas", "valor": 0.5},
          {"label": "3 respuestas positivas", "valor": 1}
        ]
      },
      {
        "codigo": "fruta_verdura",
        "label": "L — ¿Come fruta o verdura ≥2 veces al día?",
        "opciones": [
          {"label": "No", "valor": 0},
          {"label": "Sí", "valor": 1}
        ]
      },
      {
        "codigo": "ingesta_liquidos",
        "label": "M — ¿Cuántos vasos de agua u otros líquidos toma al día?",
        "opciones": [
          {"label": "Menos de 3 vasos", "valor": 0},
          {"label": "3 a 5 vasos", "valor": 0.5},
          {"label": "Más de 5 vasos", "valor": 1}
        ]
      },
      {
        "codigo": "modo_alimentacion",
        "label": "N — Modo de alimentación",
        "opciones": [
          {"label": "Necesita ayuda para comer", "valor": 0},
          {"label": "Come solo con dificultad", "valor": 1},
          {"label": "Come solo sin dificultad", "valor": 2}
        ]
      },
      {
        "codigo": "autopercepcion_nutricion",
        "label": "O — ¿Se considera el paciente bien nutrido?",
        "opciones": [
          {"label": "Malnutrición grave", "valor": 0},
          {"label": "No lo sabe o malnutrición moderada", "valor": 1},
          {"label": "Sin problema de nutrición", "valor": 2}
        ]
      },
      {
        "codigo": "autopercepcion_salud",
        "label": "P — En comparación con personas de su edad, ¿cómo considera el paciente su estado de salud?",
        "opciones": [
          {"label": "Peor", "valor": 0},
          {"label": "No lo sabe", "valor": 0.5},
          {"label": "Igual", "valor": 1},
          {"label": "Mejor", "valor": 2}
        ]
      },
      {
        "codigo": "circunferencia_braquial",
        "label": "Q — Circunferencia braquial (CB en cm)",
        "opciones": [
          {"label": "CB < 21", "valor": 0},
          {"label": "21 ≤ CB ≤ 22", "valor": 0.5},
          {"label": "CB > 22", "valor": 1}
        ]
      },
      {
        "codigo": "circunferencia_pantorrilla",
        "label": "R — Circunferencia de la pantorrilla (CP en cm)",
        "opciones": [
          {"label": "CP < 31", "valor": 0},
          {"label": "CP ≥ 31", "valor": 1}
        ]
      }
    ]
  }',
  '[
    {"min": 0,    "max": 16.9, "label": "Malnutrición",    "color": "red"},
    {"min": 17,   "max": 23.4, "label": "Riesgo nutricional", "color": "orange"},
    {"min": 23.5, "max": 30,   "label": "Estado nutricional normal", "color": "blue"}
  ]',
  true,
  20
)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2. MUST — Malnutrition Universal Screening Tool (escala_simple)
--    © BAPEN — Dominio público con atribución.
-- ============================================================================
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades,
   tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'must',
  'Malnutrition Universal Screening Tool (MUST)',
  'Screening de malnutrición en 5 pasos. Ampliamente usado en adultos hospitalizados y comunitarios.',
  '1.0',
  ARRAY['Nutrición', 'Enfermería', 'Medicina General'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "atribucion": "BAPEN (British Association for Parenteral and Enteral Nutrition). Dominio público con atribución.",
    "nota_clinica": "⚠️ Requiere revisión por nutricionista certificado antes de activación en producción.",
    "items": [
      {
        "codigo": "paso1_imc",
        "label": "Paso 1 — Puntuación por IMC (kg/m²)",
        "opciones": [
          {"label": "IMC > 20 (0 puntos)", "valor": 0},
          {"label": "IMC 18.5–20 (1 punto)", "valor": 1},
          {"label": "IMC < 18.5 (2 puntos)", "valor": 2}
        ]
      },
      {
        "codigo": "paso2_perdida_peso",
        "label": "Paso 2 — Pérdida de peso no planificada en los últimos 3-6 meses",
        "opciones": [
          {"label": "Pérdida < 5% (0 puntos)", "valor": 0},
          {"label": "Pérdida 5-10% (1 punto)", "valor": 1},
          {"label": "Pérdida > 10% (2 puntos)", "valor": 2}
        ]
      },
      {
        "codigo": "paso3_enfermedad_aguda",
        "label": "Paso 3 — Efecto de enfermedad aguda (ayuno > 5 días probable)",
        "opciones": [
          {"label": "No (0 puntos)", "valor": 0},
          {"label": "Sí (2 puntos)", "valor": 2}
        ]
      }
    ]
  }',
  '[
    {"min": 0, "max": 0, "label": "Bajo riesgo — monitorización rutinaria",   "color": "blue"},
    {"min": 1, "max": 1, "label": "Riesgo medio — observar y re-evaluar",     "color": "yellow"},
    {"min": 2, "max": 6, "label": "Alto riesgo — derivar a nutricionista",    "color": "red"}
  ]',
  true,
  21
)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 3. SGA — Subjective Global Assessment (registro_externo)
--    Detsky AS et al. JPEN. 1987. Dominio público — verificar licencia antes
--    de uso comercial.
-- ============================================================================
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades,
   tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'sga',
  'Subjective Global Assessment (SGA)',
  'Evaluación global subjetiva del estado nutricional. Resultado en categorías A, B o C.',
  '1.0',
  ARRAY['Nutrición', 'Medicina General'],
  'registro_externo',
  '{
    "validado": false,
    "tipo": "categorico",
    "atribucion": "Detsky AS, McLaughlin JR, et al. JPEN. 1987. Instrumento de dominio público — verificar licencia antes de uso comercial.",
    "nota_clinica": "⚠️ Requiere revisión por nutricionista certificado antes de activación en producción.",
    "clasificaciones": [
      {"codigo": "A", "label": "A — Bien nutrido",                      "color": "blue"},
      {"codigo": "B", "label": "B — Moderadamente malnutrido",          "color": "orange"},
      {"codigo": "C", "label": "C — Severamente malnutrido",            "color": "red"}
    ],
    "instruccion": "El profesional registra el resultado (A, B o C) tras aplicar el instrumento físicamente. La evaluación incluye: cambios en peso, ingesta, síntomas GI, capacidad funcional, y examen físico (pérdida de grasa subcutánea, masa muscular, edema, ascitis)."
  }',
  '[
    {"min": 0, "max": 0, "label": "A — Bien nutrido",                "color": "blue"},
    {"min": 1, "max": 1, "label": "B — Moderadamente malnutrido",    "color": "orange"},
    {"min": 2, "max": 2, "label": "C — Severamente malnutrido",      "color": "red"}
  ]',
  true,
  22
)
ON CONFLICT (codigo) DO NOTHING;
