-- ============================================================================
-- Migration: 20260617_01_seed_instrumentos_obstetricia
-- Sprint: OB-1 (Instrumentos Obstetricia y Ginecología)
-- Descripción: Agrega instrumentos clínicos para especialidades obstétricas.
--   Parte A: UPDATEs en apgar, eva, phq9 (agregar nuevas especialidades)
--   Parte B: 7 INSERTs tipo escala_simple (epds, bishop, epsa, vif, mrs, audit_c, lactancia_obs)
--   Parte C: 4 INSERTs tipo componente_custom (atalah, alarcon_pinares, eedp, graffar)
--   Parte D: 2 INSERTs en especialidades_catalogo
-- Impacto: Solo INSERT/UPDATE en instrumentos_valoracion y especialidades_catalogo.
--          Sin cambios de schema, RLS ni funciones.
-- Idempotente: sí — UPDATEs con WHERE NOT IN, INSERTs con ON CONFLICT DO NOTHING.
-- Rollback:
--   DELETE FROM instrumentos_valoracion
--     WHERE codigo IN ('epds','bishop','epsa','vif','mrs','audit_c','lactancia_obs',
--                      'atalah','alarcon_pinares','eedp','graffar');
--   UPDATE instrumentos_valoracion
--     SET especialidades = array_remove(
--           array_remove(especialidades, 'Obstetricia y Puericultura'),
--           'Ginecología y Obstetricia')
--     WHERE codigo IN ('apgar','eva','phq9');
--   DELETE FROM especialidades_catalogo
--     WHERE codigo IN ('Obstetricia y Puericultura','Ginecología y Obstetricia');
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE A — UPDATEs: agregar especialidades obstétricas a instrumentos existentes
-- ────────────────────────────────────────────────────────────────────────────

UPDATE instrumentos_valoracion
SET especialidades = array_cat(especialidades, ARRAY['Obstetricia y Puericultura']::text[])
WHERE codigo = 'apgar'
  AND NOT ('Obstetricia y Puericultura' = ANY(especialidades));

UPDATE instrumentos_valoracion
SET especialidades = array_cat(especialidades, ARRAY['Obstetricia y Puericultura', 'Ginecología y Obstetricia']::text[])
WHERE codigo = 'eva'
  AND NOT ('Obstetricia y Puericultura' = ANY(especialidades));

UPDATE instrumentos_valoracion
SET especialidades = array_cat(especialidades, ARRAY['Obstetricia y Puericultura']::text[])
WHERE codigo = 'phq9'
  AND NOT ('Obstetricia y Puericultura' = ANY(especialidades));

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE B — INSERTs: instrumentos tipo escala_simple
-- ────────────────────────────────────────────────────────────────────────────

-- 1. EPDS — Escala de Depresión Postnatal de Edimburgo (10 ítems, 0-30)
--    Ítems 1-2: opciones 0,1,2,3 (más positivo = 0)
--    Ítems 3-10: opciones 3,2,1,0 (más negativo = 3, presentadas primero)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'epds',
  'Escala de Depresión Postnatal de Edimburgo (EPDS)',
  'Detección de depresión perinatal. 10 ítems, puntuación 0-30. Punto de corte ≥10 para probable depresión.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Ginecología y Obstetricia', 'Medicina General', 'Psicología'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Por favor marque la respuesta que más se acerca a cómo se ha sentido en los ÚLTIMOS 7 DÍAS, no solamente cómo se siente hoy.",
    "items": [
      {
        "codigo": "reir",
        "label": "He sido capaz de reírme y ver el lado bueno de las cosas",
        "opciones": [
          {"label": "Tanto como siempre", "valor": 0},
          {"label": "No tanto ahora", "valor": 1},
          {"label": "Definitivamente no tanto ahora", "valor": 2},
          {"label": "No, nada en absoluto", "valor": 3}
        ]
      },
      {
        "codigo": "futuro",
        "label": "He mirado el futuro con placer",
        "opciones": [
          {"label": "Tanto como siempre", "valor": 0},
          {"label": "Algo menos de lo que solía hacer", "valor": 1},
          {"label": "Definitivamente menos que antes", "valor": 2},
          {"label": "Muy poco", "valor": 3}
        ]
      },
      {
        "codigo": "culpa",
        "label": "Me he culpado sin necesidad cuando las cosas no salían bien",
        "opciones": [
          {"label": "Sí, la mayoría de las veces", "valor": 3},
          {"label": "Sí, algunas veces", "valor": 2},
          {"label": "No con mucha frecuencia", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "ansiedad",
        "label": "He estado ansiosa y preocupada sin motivo",
        "opciones": [
          {"label": "Sí, con mucha frecuencia", "valor": 3},
          {"label": "Sí, a veces", "valor": 2},
          {"label": "Rara vez", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "miedo",
        "label": "He sentido miedo y pánico sin motivo alguno",
        "opciones": [
          {"label": "Sí, bastante a menudo", "valor": 3},
          {"label": "Sí, a veces", "valor": 2},
          {"label": "No, no mucho", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "agobio",
        "label": "Las cosas me oprimen o agobian",
        "opciones": [
          {"label": "Sí, la mayoría de las veces no he podido sobrellevarlas", "valor": 3},
          {"label": "Sí, a veces no las sobrevivo tan bien como siempre", "valor": 2},
          {"label": "No, la mayoría de las veces las llevo bastante bien", "valor": 1},
          {"label": "No, las llevo tan bien como siempre", "valor": 0}
        ]
      },
      {
        "codigo": "insomnio",
        "label": "Me he sentido tan infeliz que he tenido dificultad para dormir",
        "opciones": [
          {"label": "Sí, la mayoría de las veces", "valor": 3},
          {"label": "Sí, a veces", "valor": 2},
          {"label": "No con mucha frecuencia", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "tristeza",
        "label": "Me he sentido triste y desgraciada",
        "opciones": [
          {"label": "Sí, la mayoría de las veces", "valor": 3},
          {"label": "Sí, con mucha frecuencia", "valor": 2},
          {"label": "No con mucha frecuencia", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "llanto",
        "label": "He sido tan infeliz que he estado llorando",
        "opciones": [
          {"label": "Sí, la mayoría de las veces", "valor": 3},
          {"label": "Sí, con mucha frecuencia", "valor": 2},
          {"label": "Solo en alguna ocasión", "valor": 1},
          {"label": "No, nunca", "valor": 0}
        ]
      },
      {
        "codigo": "autolesion",
        "label": "He pensado en hacerme daño a mí misma",
        "descripcion": "Respuesta positiva requiere evaluación de riesgo inmediata",
        "opciones": [
          {"label": "Sí, con bastante frecuencia", "valor": 3},
          {"label": "A veces", "valor": 2},
          {"label": "Casi nunca", "valor": 1},
          {"label": "Nunca", "valor": 0}
        ]
      }
    ]
  }',
  '[
    {"min": 0,  "max": 9,  "label": "Sin riesgo significativo", "color": "green"},
    {"min": 10, "max": 12, "label": "Riesgo posible — reevaluar en 2 semanas", "color": "yellow"},
    {"min": 13, "max": 30, "label": "Probable depresión postnatal — derivar", "color": "red"}
  ]',
  true, 11
) ON CONFLICT (codigo) DO NOTHING;

-- 2. BISHOP — Score de Bishop (madurez cervical, inducción del parto)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'bishop',
  'Score de Bishop',
  'Evaluación de madurez cervical para inducción del parto. 5 criterios, puntaje total 0-13.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Ginecología y Obstetricia'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "items": [
      {
        "codigo": "dilatacion",
        "label": "Dilatación cervical",
        "opciones": [
          {"label": "Cerrado", "valor": 0},
          {"label": "1–2 cm", "valor": 1},
          {"label": "3–4 cm", "valor": 2},
          {"label": "≥5 cm", "valor": 3}
        ]
      },
      {
        "codigo": "borramiento",
        "label": "Borramiento",
        "opciones": [
          {"label": "0–30%", "valor": 0},
          {"label": "40–50%", "valor": 1},
          {"label": "60–70%", "valor": 2},
          {"label": "≥80%", "valor": 3}
        ]
      },
      {
        "codigo": "estacion",
        "label": "Estación de la presentación",
        "opciones": [
          {"label": "-3", "valor": 0},
          {"label": "-2", "valor": 1},
          {"label": "-1 / 0", "valor": 2},
          {"label": "+1 / +2", "valor": 3}
        ]
      },
      {
        "codigo": "consistencia",
        "label": "Consistencia cervical",
        "opciones": [
          {"label": "Firme", "valor": 0},
          {"label": "Media", "valor": 1},
          {"label": "Blanda", "valor": 2}
        ]
      },
      {
        "codigo": "posicion",
        "label": "Posición cervical",
        "opciones": [
          {"label": "Posterior", "valor": 0},
          {"label": "Media", "valor": 1},
          {"label": "Anterior", "valor": 2}
        ]
      }
    ]
  }',
  '[
    {"min": 0, "max": 3,  "label": "Cuello desfavorable — inducción muy difícil", "color": "red"},
    {"min": 4, "max": 5,  "label": "Cuello intermedio", "color": "yellow"},
    {"min": 6, "max": 8,  "label": "Cuello favorable — buena respuesta a inducción", "color": "green"},
    {"min": 9, "max": 13, "label": "Cuello muy favorable — inicio espontáneo probable", "color": "blue"}
  ]',
  true, 12
) ON CONFLICT (codigo) DO NOTHING;

-- 3. EPSA — Evaluación Psicosocial Abreviada (control prenatal MINSAL Chile)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'epsa',
  'EPsA — Evaluación Psicosocial Abreviada',
  'Tamizaje de riesgo psicosocial en control prenatal. Instrumento MINSAL Chile. 10 ítems binarios.',
  '1.0',
  ARRAY['Obstetricia y Puericultura'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Responda Sí o No a cada pregunta. El objetivo es identificar situaciones que pueden afectar su bienestar durante el embarazo.",
    "items": [
      {"codigo": "edad",        "label": "¿Es menor de 17 años?",                           "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "escolaridad", "label": "¿Tiene escolaridad menor a 6° básico?",            "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "pareja",      "label": "¿No tiene pareja estable?",                        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "apoyo",       "label": "¿No tiene apoyo familiar?",                        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "sustancias",  "label": "¿Consume alcohol o drogas?",                       "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "vif",         "label": "¿Existe violencia intrafamiliar?",                 "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "maternidad",  "label": "¿Tiene conflictos con la maternidad?",             "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "economia",    "label": "¿Tiene insuficiencia económica severa?",           "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "trabajo",     "label": "¿Tiene trabajo no calificado o está cesante?",     "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]},
      {"codigo": "depresion",   "label": "¿Presenta síntomas depresivos?",                   "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]}
    ]
  }',
  '[
    {"min": 0, "max": 1,  "label": "Riesgo bajo", "color": "green"},
    {"min": 2, "max": 3,  "label": "Riesgo moderado — seguimiento reforzado", "color": "yellow"},
    {"min": 4, "max": 10, "label": "Riesgo alto — derivar a asistente social / psicólogo", "color": "red"}
  ]',
  true, 13
) ON CONFLICT (codigo) DO NOTHING;

-- 4. VIF — Cribado de Violencia Intrafamiliar (tamizaje prenatal obligatorio)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'vif',
  'Cribado de Violencia Intrafamiliar (VIF)',
  'Tamizaje de violencia en control prenatal. Obligatorio en guías MINSAL/SERNAM. 5 preguntas.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Ginecología y Obstetricia', 'Medicina General'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Las siguientes preguntas son confidenciales y nos ayudan a velar por su seguridad.",
    "items": [
      {
        "codigo": "maltrato_emocional",
        "label": "¿Alguna vez ha sido maltratada emocional o psicológicamente?",
        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]
      },
      {
        "codigo": "maltrato_fisico",
        "label": "¿Alguna vez ha sido maltratada físicamente?",
        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]
      },
      {
        "codigo": "agresion_sexual",
        "label": "¿Alguna vez ha sido forzada a tener relaciones sexuales?",
        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]
      },
      {
        "codigo": "seguridad",
        "label": "¿Se siente segura en su relación actual?",
        "descripcion": "Ítem invertido: No (insegura) = 1 punto",
        "opciones": [{"label": "Sí (se siente segura)", "valor": 0}, {"label": "No (no se siente segura)", "valor": 1}]
      },
      {
        "codigo": "amenaza",
        "label": "¿Hay alguien que la asuste o amenace?",
        "opciones": [{"label": "No", "valor": 0}, {"label": "Sí", "valor": 1}]
      }
    ]
  }',
  '[
    {"min": 0, "max": 0, "label": "Sin indicadores de VIF", "color": "green"},
    {"min": 1, "max": 2, "label": "Indicadores presentes — derivar a Red Chile Atiende", "color": "orange"},
    {"min": 3, "max": 5, "label": "Múltiples indicadores — derivación urgente (Casa de Acogida / PDI)", "color": "red"}
  ]',
  true, 14
) ON CONFLICT (codigo) DO NOTHING;

-- 5. MRS — Menopause Rating Scale (11 ítems, 0-44)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'mrs',
  'Menopause Rating Scale (MRS)',
  'Cuantifica síntomas climatéricos en 3 dominios: somático, psicológico y urogenital. 11 ítems, 0-44.',
  '1.0',
  ARRAY['Ginecología y Obstetricia', 'Medicina General'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Indique si padece actualmente alguno de los síntomas y en qué medida le afectan. Dominio somático: ítems 1-4 · Psicológico: 5-8 · Urogenital: 9-11.",
    "items": [
      {"codigo": "bochornos",    "label": "Bochornos / sofocos, sudoración",                                         "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "corazon",      "label": "Molestias cardíacas (palpitaciones, latidos acelerados)",                 "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "sueno",        "label": "Problemas de sueño (dificultad para conciliar o mantener el sueño)",     "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "musculos",     "label": "Molestias musculares y articulares",                                      "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "depresion",    "label": "Estado depresivo (sentirse decaída, triste, sin motivación)",             "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "irritabilidad","label": "Irritabilidad (nerviosismo, tensión interna, agresividad)",               "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "ansiedad",     "label": "Ansiedad (angustia, pánico, preocupación excesiva)",                     "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "agotamiento",  "label": "Agotamiento físico y mental (rendimiento disminuido, falta de memoria)",  "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "sexualidad",   "label": "Problemas sexuales (deseo disminuido, satisfacción reducida)",            "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "urinario",     "label": "Problemas urinarios (urgencia miccional, incontinencia)",                 "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]},
      {"codigo": "vaginal",      "label": "Sequedad vaginal (sensación de sequedad o ardor, dificultad al coito)",  "opciones": [{"label": "Ninguno", "valor": 0}, {"label": "Leve", "valor": 1}, {"label": "Moderado", "valor": 2}, {"label": "Severo", "valor": 3}, {"label": "Muy severo", "valor": 4}]}
    ]
  }',
  '[
    {"min": 0,  "max": 4,  "label": "Asintomática / mínima", "color": "green"},
    {"min": 5,  "max": 8,  "label": "Leve", "color": "blue"},
    {"min": 9,  "max": 16, "label": "Moderada", "color": "yellow"},
    {"min": 17, "max": 44, "label": "Severa", "color": "red"}
  ]',
  true, 15
) ON CONFLICT (codigo) DO NOTHING;

-- 6. AUDIT-C — Cuestionario de Identificación de Uso de Alcohol (3 ítems, 0-12)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'audit_c',
  'AUDIT-C',
  'Versión corta del AUDIT (3 preguntas) para tamizaje rápido de consumo riesgoso de alcohol. Corte femenino ≥3.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Ginecología y Obstetricia', 'Medicina General', 'Enfermería'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Las siguientes preguntas son acerca del consumo de alcohol.",
    "items": [
      {
        "codigo": "frecuencia",
        "label": "¿Con qué frecuencia consume bebidas alcohólicas?",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Una vez al mes o menos", "valor": 1},
          {"label": "2 a 4 veces al mes", "valor": 2},
          {"label": "2 a 3 veces a la semana", "valor": 3},
          {"label": "4 o más veces a la semana", "valor": 4}
        ]
      },
      {
        "codigo": "cantidad",
        "label": "¿Cuántas bebidas alcohólicas consume en un día de consumo normal?",
        "opciones": [
          {"label": "1 o 2", "valor": 0},
          {"label": "3 o 4", "valor": 1},
          {"label": "5 o 6", "valor": 2},
          {"label": "7 a 9", "valor": 3},
          {"label": "10 o más", "valor": 4}
        ]
      },
      {
        "codigo": "episodio_intenso",
        "label": "¿Con qué frecuencia toma 6 o más bebidas alcohólicas en una sola ocasión?",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Menos de una vez al mes", "valor": 1},
          {"label": "Mensualmente", "valor": 2},
          {"label": "Semanalmente", "valor": 3},
          {"label": "A diario o casi a diario", "valor": 4}
        ]
      }
    ]
  }',
  '[
    {"min": 0, "max": 2,  "label": "Bajo riesgo", "color": "green"},
    {"min": 3, "max": 4,  "label": "Consumo de riesgo — consejería breve", "color": "yellow"},
    {"min": 5, "max": 12, "label": "Consumo perjudicial — derivar a especialista", "color": "red"}
  ]',
  true, 16
) ON CONFLICT (codigo) DO NOTHING;

-- 7. LACTANCIA_OBS — Pauta de Observación de Lactancia Materna (OMS/UNICEF adaptada)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'lactancia_obs',
  'Pauta de Observación de Lactancia Materna',
  'Evaluación clínica de la díada madre-hijo durante la mamada. Adaptada de herramienta OMS/UNICEF.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Enfermería'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Observe una mamada completa y puntúe cada criterio (0 = no observado / inadecuado, 1 = parcial, 2 = adecuado).",
    "items": [
      {
        "codigo": "posicion_madre",
        "label": "Posición del cuerpo de la madre",
        "descripcion": "Cómoda, espalda apoyada, sin tensión visible",
        "opciones": [{"label": "No observado / inadecuado", "valor": 0}, {"label": "Parcialmente adecuado", "valor": 1}, {"label": "Adecuado", "valor": 2}]
      },
      {
        "codigo": "posicion_bebe",
        "label": "Posición del bebé",
        "descripcion": "Cuerpo alineado, cabeza libre, tronco apoyado, bien sujeto",
        "opciones": [{"label": "No observado / inadecuado", "valor": 0}, {"label": "Parcialmente adecuado", "valor": 1}, {"label": "Adecuado", "valor": 2}]
      },
      {
        "codigo": "agarre",
        "label": "Agarre del pezón-areola",
        "descripcion": "Boca bien abierta, labio inferior evertido, más areola inferior visible, mentón toca el pecho",
        "opciones": [{"label": "No observado / inadecuado", "valor": 0}, {"label": "Parcialmente adecuado", "valor": 1}, {"label": "Adecuado", "valor": 2}]
      },
      {
        "codigo": "succion",
        "label": "Succión efectiva",
        "descripcion": "Succiones lentas, profundas, con pausas regulares",
        "opciones": [{"label": "No observado / inadecuado", "valor": 0}, {"label": "Parcialmente adecuado", "valor": 1}, {"label": "Adecuado", "valor": 2}]
      },
      {
        "codigo": "deglucion",
        "label": "Deglución audible",
        "opciones": [{"label": "No se escucha", "valor": 0}, {"label": "Ocasionalmente", "valor": 1}, {"label": "Frecuentemente audible", "valor": 2}]
      },
      {
        "codigo": "duracion",
        "label": "Duración de la mamada",
        "opciones": [{"label": "< 5 minutos", "valor": 0}, {"label": "5–10 minutos", "valor": 1}, {"label": "> 10 minutos", "valor": 2}]
      },
      {
        "codigo": "confort_madre",
        "label": "Confort de la madre",
        "descripcion": "Sin dolor, pezón y areola sin lesiones post-mamada",
        "opciones": [{"label": "Dolor o lesión evidente", "valor": 0}, {"label": "Leve incomodidad", "valor": 1}, {"label": "Cómoda y sin dolor", "valor": 2}]
      },
      {
        "codigo": "satisfaccion_bebe",
        "label": "Satisfacción del bebé al terminar",
        "opciones": [{"label": "Inquieto o llora al soltar el pecho", "valor": 0}, {"label": "Parcialmente satisfecho", "valor": 1}, {"label": "Relajado, suelta el pecho espontáneamente", "valor": 2}]
      }
    ]
  }',
  '[
    {"min": 0,  "max": 5,  "label": "Lactancia deficiente — intervención urgente", "color": "red"},
    {"min": 6,  "max": 10, "label": "Regular — requiere apoyo y educación", "color": "yellow"},
    {"min": 11, "max": 16, "label": "Lactancia efectiva", "color": "green"}
  ]',
  true, 17
) ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE C — INSERTs: instrumentos tipo componente_custom (metadata + placeholder)
-- Los componentes React correspondientes (AtalahChart, etc.) se implementarán en sprint posterior.
-- ────────────────────────────────────────────────────────────────────────────

-- 8. ATALAH — Gráfica de Atalah (estado nutricional embarazada)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'atalah',
  'Gráfica de Atalah (Estado Nutricional Embarazada)',
  'Clasificación nutricional de la embarazada según IMC y semanas de gestación. Estándar MINSAL Chile.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Nutrición'],
  'componente_custom',
  'AtalahChart',
  NULL,
  '[
    {"min": 0, "max": 0, "label": "Bajo peso", "color": "yellow"},
    {"min": 1, "max": 1, "label": "Normal", "color": "green"},
    {"min": 2, "max": 2, "label": "Sobrepeso", "color": "orange"},
    {"min": 3, "max": 3, "label": "Obesidad", "color": "red"}
  ]',
  true, 18
) ON CONFLICT (codigo) DO NOTHING;

-- 9. ALARCON_PINARES — Curva de Altura Uterina (Alarcón-Pinares)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'alarcon_pinares',
  'Curva de Altura Uterina (Alarcón-Pinares)',
  'Correlación altura uterina vs edad gestacional para pesquisa de RCIU o macrosomía fetal.',
  '1.0',
  ARRAY['Obstetricia y Puericultura'],
  'componente_custom',
  'AlarconPinaresChart',
  NULL,
  '[
    {"min": 0, "max": 0, "label": "Bajo percentil 10 — sospecha RCIU", "color": "red"},
    {"min": 1, "max": 1, "label": "Normal (p10–p90)", "color": "green"},
    {"min": 2, "max": 2, "label": "Sobre percentil 90 — sospecha macrosomía", "color": "orange"}
  ]',
  true, 19
) ON CONFLICT (codigo) DO NOTHING;

-- 10. EEDP — Escala de Evaluación del Desarrollo Psicomotor (0-24 meses)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'eedp',
  'EEDP — Escala de Evaluación del Desarrollo Psicomotor',
  'Evaluación del desarrollo psicomotor en lactantes 0-24 meses. 4 áreas: lenguaje, social, coordinación, motricidad.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Medicina General'],
  'componente_custom',
  'EEDPAssessment',
  NULL,
  '[
    {"min": 0, "max": 0, "label": "Normal", "color": "green"},
    {"min": 1, "max": 1, "label": "Riesgo — control en 1 mes", "color": "yellow"},
    {"min": 2, "max": 2, "label": "Retraso — derivar a especialista", "color": "red"}
  ]',
  true, 20
) ON CONFLICT (codigo) DO NOTHING;

-- 11. GRAFFAR — Score Socioeconómico de Graffar modificado
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'graffar',
  'Score de Graffar Modificado',
  'Clasificación de riesgo socioeconómico y ambiental del lactante. Considera 5 variables del entorno familiar.',
  '1.0',
  ARRAY['Obstetricia y Puericultura', 'Medicina General', 'Enfermería'],
  'componente_custom',
  'GraffarScore',
  NULL,
  '[
    {"min": 0, "max": 0, "label": "Bajo riesgo", "color": "green"},
    {"min": 1, "max": 1, "label": "Riesgo moderado", "color": "yellow"},
    {"min": 2, "max": 2, "label": "Alto riesgo — derivar a asistente social", "color": "red"}
  ]',
  true, 21
) ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE D — especialidades_catalogo
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO especialidades_catalogo (codigo, label, activa, orden)
VALUES
  ('Obstetricia y Puericultura', 'Obstetricia y Puericultura', true, 12),
  ('Ginecología y Obstetricia',  'Ginecología y Obstetricia',  true, 13)
ON CONFLICT (codigo) DO UPDATE
  SET activa = true, label = EXCLUDED.label;
