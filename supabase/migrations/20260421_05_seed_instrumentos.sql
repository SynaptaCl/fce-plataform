-- ============================================================================
-- Migration: 20260421_05_seed_instrumentos
-- Sprint: R2
-- Descripción: Seed de 10 instrumentos de valoración clínica iniciales
-- ⚠️ RIESGO CLÍNICO: schema_items marcados con "validado": true solo en Braden y EVA.
--    Resto marcados con "validado": false — requieren revisión de profesional clínico
--    antes de usar en producción (R5).
-- Rollback: DELETE FROM instrumentos_valoracion WHERE codigo IN
--   ('braden','downton','barthel','lawton','eva','phq9','gad7','mmse','glasgow','apgar');
-- ============================================================================

-- 1. BRADEN — Escala de riesgo de úlceras por presión (validado ✓)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'braden',
  'Escala de Braden',
  'Evalúa el riesgo de desarrollar úlceras por presión. Menor puntaje = mayor riesgo.',
  '1.0',
  ARRAY['Enfermería'],
  'escala_simple',
  '{
    "validado": true,
    "calculo": "suma",
    "items": [
      {
        "codigo": "percepcion_sensorial",
        "label": "Percepción sensorial",
        "descripcion": "Capacidad para responder significativamente a la presión",
        "opciones": [
          {"label": "Completamente limitada", "valor": 1},
          {"label": "Muy limitada", "valor": 2},
          {"label": "Ligeramente limitada", "valor": 3},
          {"label": "Sin limitaciones", "valor": 4}
        ]
      },
      {
        "codigo": "humedad",
        "label": "Exposición a la humedad",
        "descripcion": "Grado en que la piel está expuesta a humedad",
        "opciones": [
          {"label": "Constantemente húmeda", "valor": 1},
          {"label": "Muy húmeda", "valor": 2},
          {"label": "Ocasionalmente húmeda", "valor": 3},
          {"label": "Raramente húmeda", "valor": 4}
        ]
      },
      {
        "codigo": "actividad",
        "label": "Actividad",
        "descripcion": "Grado de actividad física",
        "opciones": [
          {"label": "Encamado", "valor": 1},
          {"label": "En silla de ruedas", "valor": 2},
          {"label": "Camina ocasionalmente", "valor": 3},
          {"label": "Camina frecuentemente", "valor": 4}
        ]
      },
      {
        "codigo": "movilidad",
        "label": "Movilidad",
        "descripcion": "Capacidad para cambiar y controlar la posición del cuerpo",
        "opciones": [
          {"label": "Completamente inmóvil", "valor": 1},
          {"label": "Muy limitada", "valor": 2},
          {"label": "Ligeramente limitada", "valor": 3},
          {"label": "Sin limitaciones", "valor": 4}
        ]
      },
      {
        "codigo": "nutricion",
        "label": "Nutrición",
        "descripcion": "Patrón habitual de ingesta alimentaria",
        "opciones": [
          {"label": "Muy pobre", "valor": 1},
          {"label": "Probablemente inadecuada", "valor": 2},
          {"label": "Adecuada", "valor": 3},
          {"label": "Excelente", "valor": 4}
        ]
      },
      {
        "codigo": "friccion_cizallamiento",
        "label": "Fricción y cizallamiento",
        "descripcion": "Movimiento de la piel sobre superficies de apoyo",
        "opciones": [
          {"label": "Problema", "valor": 1},
          {"label": "Problema potencial", "valor": 2},
          {"label": "Sin problema aparente", "valor": 3}
        ]
      }
    ]
  }',
  '[
    {"min": 6,  "max": 9,  "label": "Riesgo muy alto",  "color": "red"},
    {"min": 10, "max": 12, "label": "Riesgo alto",      "color": "orange"},
    {"min": 13, "max": 14, "label": "Riesgo moderado",  "color": "yellow"},
    {"min": 15, "max": 18, "label": "Riesgo bajo",      "color": "green"},
    {"min": 19, "max": 23, "label": "Sin riesgo",       "color": "blue"}
  ]',
  true, 1
);

-- 2. DOWNTON — Riesgo de caídas (validado: false — requiere revisión clínica)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'downton',
  'Escala de Downton',
  'Evalúa el riesgo de caídas en pacientes hospitalizados o en atención domiciliaria.',
  '1.0',
  ARRAY['Enfermería', 'Medicina General'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "items": [
      {
        "codigo": "caidas_previas",
        "label": "Caídas previas",
        "opciones": [
          {"label": "No", "valor": 0},
          {"label": "Sí", "valor": 1}
        ]
      },
      {
        "codigo": "medicamentos",
        "label": "Medicamentos (sedantes, diuréticos, hipotensores, antiparkinsonianos, antidepresivos)",
        "opciones": [
          {"label": "Ninguno", "valor": 0},
          {"label": "Uno o más", "valor": 1}
        ]
      },
      {
        "codigo": "deficit_sensorial",
        "label": "Déficit sensorial (visual, auditivo, extremidades)",
        "opciones": [
          {"label": "Ninguno", "valor": 0},
          {"label": "Presente", "valor": 1}
        ]
      },
      {
        "codigo": "estado_mental",
        "label": "Estado mental",
        "opciones": [
          {"label": "Orientado", "valor": 0},
          {"label": "Confuso", "valor": 1}
        ]
      },
      {
        "codigo": "marcha",
        "label": "Marcha",
        "opciones": [
          {"label": "Normal / encamado / silla de ruedas", "valor": 0},
          {"label": "Insegura", "valor": 1},
          {"label": "Imposible", "valor": 1}
        ]
      }
    ]
  }',
  '[
    {"min": 0, "max": 2, "label": "Bajo riesgo",  "color": "green"},
    {"min": 3, "max": 5, "label": "Alto riesgo",  "color": "red"}
  ]',
  true, 2
);

-- 3. BARTHEL — Actividades de la vida diaria (validado: false)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'barthel',
  'Índice de Barthel',
  'Mide la independencia funcional en actividades básicas de la vida diaria (ABVD).',
  '1.0',
  ARRAY['Medicina General', 'Enfermería', 'Kinesiología'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "items": [
      {
        "codigo": "alimentacion",
        "label": "Alimentación",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Necesita ayuda", "valor": 5},
          {"label": "Independiente", "valor": 10}
        ]
      },
      {
        "codigo": "bano",
        "label": "Baño",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 5}
        ]
      },
      {
        "codigo": "aseo_personal",
        "label": "Aseo personal",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 5}
        ]
      },
      {
        "codigo": "vestido",
        "label": "Vestido",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Necesita ayuda", "valor": 5},
          {"label": "Independiente", "valor": 10}
        ]
      },
      {
        "codigo": "miccion",
        "label": "Micción",
        "opciones": [
          {"label": "Incontinente", "valor": 0},
          {"label": "Accidente ocasional", "valor": 5},
          {"label": "Continente", "valor": 10}
        ]
      },
      {
        "codigo": "defecacion",
        "label": "Defecación",
        "opciones": [
          {"label": "Incontinente", "valor": 0},
          {"label": "Accidente ocasional", "valor": 5},
          {"label": "Continente", "valor": 10}
        ]
      },
      {
        "codigo": "uso_retrete",
        "label": "Uso del retrete",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Necesita ayuda", "valor": 5},
          {"label": "Independiente", "valor": 10}
        ]
      },
      {
        "codigo": "traslados",
        "label": "Traslados (cama-silla)",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Ayuda mayor", "valor": 5},
          {"label": "Mínima ayuda", "valor": 10},
          {"label": "Independiente", "valor": 15}
        ]
      },
      {
        "codigo": "deambulacion",
        "label": "Deambulación",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente en silla de ruedas", "valor": 5},
          {"label": "Camina con ayuda de persona", "valor": 10},
          {"label": "Independiente (con ayuda técnica)", "valor": 15}
        ]
      },
      {
        "codigo": "escaleras",
        "label": "Subir/bajar escaleras",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Necesita ayuda", "valor": 5},
          {"label": "Independiente", "valor": 10}
        ]
      }
    ]
  }',
  '[
    {"min": 0,   "max": 20,  "label": "Dependencia total",    "color": "red"},
    {"min": 21,  "max": 60,  "label": "Dependencia severa",   "color": "orange"},
    {"min": 61,  "max": 90,  "label": "Dependencia moderada", "color": "yellow"},
    {"min": 91,  "max": 99,  "label": "Dependencia leve",     "color": "green"},
    {"min": 100, "max": 100, "label": "Independencia",        "color": "blue"}
  ]',
  true, 3
);

-- 4. LAWTON — Actividades instrumentales de la vida diaria (validado: false)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'lawton',
  'Escala de Lawton-Brody',
  'Mide la independencia en actividades instrumentales de la vida diaria (AIVD).',
  '1.0',
  ARRAY['Medicina General', 'Enfermería'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "items": [
      {
        "codigo": "telefono",
        "label": "Usar el teléfono",
        "opciones": [
          {"label": "Sin capacidad", "valor": 0},
          {"label": "Con ayuda", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "compras",
        "label": "Ir de compras",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "comida",
        "label": "Preparar comida",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "casa",
        "label": "Cuidar la casa",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "ropa",
        "label": "Lavar ropa",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "transporte",
        "label": "Usar medios de transporte",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "medicacion",
        "label": "Responsabilidad sobre la medicación",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      },
      {
        "codigo": "dinero",
        "label": "Manejo de dinero",
        "opciones": [
          {"label": "Dependiente", "valor": 0},
          {"label": "Independiente", "valor": 1}
        ]
      }
    ]
  }',
  '[
    {"min": 0, "max": 1, "label": "Dependencia total",   "color": "red"},
    {"min": 2, "max": 4, "label": "Dependencia severa",  "color": "orange"},
    {"min": 5, "max": 7, "label": "Dependencia leve",    "color": "yellow"},
    {"min": 8, "max": 8, "label": "Independencia",       "color": "blue"}
  ]',
  true, 4
);

-- 5. EVA — Escala Visual Análoga de dolor (validado ✓)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'eva',
  'Escala Visual Análoga (EVA)',
  'Mide la intensidad del dolor percibido por el paciente en una escala de 0 a 10.',
  '1.0',
  ARRAY['Kinesiología', 'Fonoaudiología', 'Masoterapia', 'Enfermería', 'Medicina General', 'Psicología', 'Nutrición', 'Terapia Ocupacional', 'Podología', 'Odontología'],
  'escala_simple',
  '{
    "validado": true,
    "calculo": "suma",
    "items": [
      {
        "codigo": "dolor",
        "label": "Intensidad del dolor",
        "descripcion": "0 = sin dolor, 10 = dolor insoportable",
        "opciones": [
          {"label": "0 — Sin dolor",       "valor": 0},
          {"label": "1",                   "valor": 1},
          {"label": "2",                   "valor": 2},
          {"label": "3",                   "valor": 3},
          {"label": "4",                   "valor": 4},
          {"label": "5 — Dolor moderado",  "valor": 5},
          {"label": "6",                   "valor": 6},
          {"label": "7",                   "valor": 7},
          {"label": "8",                   "valor": 8},
          {"label": "9",                   "valor": 9},
          {"label": "10 — Insoportable",   "valor": 10}
        ]
      }
    ]
  }',
  '[
    {"min": 0,  "max": 0,  "label": "Sin dolor",         "color": "blue"},
    {"min": 1,  "max": 3,  "label": "Dolor leve",        "color": "green"},
    {"min": 4,  "max": 6,  "label": "Dolor moderado",    "color": "yellow"},
    {"min": 7,  "max": 9,  "label": "Dolor intenso",     "color": "orange"},
    {"min": 10, "max": 10, "label": "Dolor insoportable","color": "red"}
  ]',
  true, 5
);

-- 6. PHQ-9 — Cuestionario de Salud del Paciente (depresión) (validado: false)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'phq9',
  'PHQ-9',
  'Cuestionario de 9 ítems para detección y monitorización de depresión mayor.',
  '1.0',
  ARRAY['Medicina General', 'Psicología'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?",
    "items": [
      {
        "codigo": "anhedonia",
        "label": "Poco interés o placer en hacer cosas",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "depresion",
        "label": "Sentirse desanimado/a, deprimido/a o sin esperanza",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "sueno",
        "label": "Dificultad para dormir o dormir demasiado",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "fatiga",
        "label": "Sentirse cansado/a o con poca energía",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "apetito",
        "label": "Poco apetito o comer en exceso",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "autoestima",
        "label": "Sentirse mal consigo mismo/a",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "concentracion",
        "label": "Dificultad para concentrarse",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "psicomotor",
        "label": "Moverse o hablar tan despacio que los demás lo notan",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "suicidio",
        "label": "Pensamientos de que estaría mejor muerto/a o de hacerse daño",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      }
    ]
  }',
  '[
    {"min": 0,  "max": 4,  "label": "Sin depresión",            "color": "blue"},
    {"min": 5,  "max": 9,  "label": "Depresión mínima",         "color": "green"},
    {"min": 10, "max": 14, "label": "Depresión moderada",       "color": "yellow"},
    {"min": 15, "max": 19, "label": "Depresión moderada-severa","color": "orange"},
    {"min": 20, "max": 27, "label": "Depresión severa",         "color": "red"}
  ]',
  true, 6
);

-- 7. GAD-7 — Trastorno de ansiedad generalizada (validado: false)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'gad7',
  'GAD-7',
  'Escala de 7 ítems para detección y monitorización de trastorno de ansiedad generalizada.',
  '1.0',
  ARRAY['Medicina General', 'Psicología'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "instruccion": "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?",
    "items": [
      {
        "codigo": "nerviosismo",
        "label": "Sentirse nervioso/a, ansioso/a o con los nervios de punta",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "control",
        "label": "No poder detener o controlar las preocupaciones",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "preocupacion",
        "label": "Preocuparse demasiado por diferentes cosas",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "relajacion",
        "label": "Dificultad para relajarse",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "inquietud",
        "label": "Estar tan inquieto/a que es difícil permanecer sentado/a",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "irritabilidad",
        "label": "Sentirse irritable o con facilidad para enojarse",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      },
      {
        "codigo": "miedo",
        "label": "Sentir miedo de que algo terrible vaya a pasar",
        "opciones": [
          {"label": "Nunca", "valor": 0},
          {"label": "Varios días", "valor": 1},
          {"label": "Más de la mitad de los días", "valor": 2},
          {"label": "Casi cada día", "valor": 3}
        ]
      }
    ]
  }',
  '[
    {"min": 0,  "max": 4,  "label": "Ansiedad mínima",  "color": "blue"},
    {"min": 5,  "max": 9,  "label": "Ansiedad leve",    "color": "green"},
    {"min": 10, "max": 14, "label": "Ansiedad moderada","color": "yellow"},
    {"min": 15, "max": 21, "label": "Ansiedad severa",  "color": "red"}
  ]',
  true, 7
);

-- 8. MMSE — Mini-Mental State Examination (validado: false)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, schema_items, interpretacion, activo, orden)
VALUES (
  'mmse',
  'Mini-Mental State Examination (MMSE)',
  'Evaluación breve del estado cognitivo. Detecta deterioro cognitivo y monitoriza su evolución.',
  '1.0',
  ARRAY['Medicina General', 'Psicología'],
  'escala_simple',
  '{
    "validado": false,
    "calculo": "suma",
    "nota": "Puntajes por área son referenciales. Requiere aplicación presencial con protocolo estandarizado.",
    "items": [
      {"codigo": "orientacion_tiempo",  "label": "Orientación temporal (año, estación, fecha, día, mes)", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}, {"label": "4", "valor": 4}, {"label": "5", "valor": 5}]},
      {"codigo": "orientacion_lugar",   "label": "Orientación espacial (país, ciudad, hospital, piso, sala)", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}, {"label": "4", "valor": 4}, {"label": "5", "valor": 5}]},
      {"codigo": "registro",            "label": "Registro (repetir 3 palabras)", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}]},
      {"codigo": "atencion_calculo",    "label": "Atención y cálculo (serial 7s o deletrear MUNDO al revés)", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}, {"label": "4", "valor": 4}, {"label": "5", "valor": 5}]},
      {"codigo": "memoria",             "label": "Evocación (recordar las 3 palabras)", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}]},
      {"codigo": "lenguaje_nombrar",    "label": "Lenguaje: nombrar 2 objetos", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}]},
      {"codigo": "lenguaje_repetir",    "label": "Lenguaje: repetir frase", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}]},
      {"codigo": "lenguaje_orden",      "label": "Lenguaje: orden de 3 pasos", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}, {"label": "2", "valor": 2}, {"label": "3", "valor": 3}]},
      {"codigo": "lenguaje_leer",       "label": "Lenguaje: leer y obedecer", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}]},
      {"codigo": "escritura",           "label": "Escritura espontánea", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}]},
      {"codigo": "copia",               "label": "Copia de pentágonos", "opciones": [{"label": "0", "valor": 0}, {"label": "1", "valor": 1}]}
    ]
  }',
  '[
    {"min": 0,  "max": 9,  "label": "Deterioro grave",    "color": "red"},
    {"min": 10, "max": 18, "label": "Deterioro moderado", "color": "orange"},
    {"min": 19, "max": 23, "label": "Deterioro leve",     "color": "yellow"},
    {"min": 24, "max": 27, "label": "Normal bajo",        "color": "green"},
    {"min": 28, "max": 30, "label": "Normal",             "color": "blue"}
  ]',
  true, 8
);

-- 9. GLASGOW — Glasgow Coma Scale (componente_custom)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'glasgow',
  'Glasgow Coma Scale',
  'Escala neurológica para evaluar el nivel de conciencia. 3 sub-componentes: ocular, verbal, motor.',
  '1.0',
  ARRAY['Medicina General', 'Enfermería'],
  'componente_custom',
  'GlasgowComaScale',
  NULL,
  '[
    {"min": 3,  "max": 8,  "label": "Coma grave",    "color": "red"},
    {"min": 9,  "max": 12, "label": "Coma moderado", "color": "orange"},
    {"min": 13, "max": 15, "label": "Normal",        "color": "blue"}
  ]',
  true, 9
);

-- 10. APGAR — Apgar Score (componente_custom)
INSERT INTO instrumentos_valoracion
  (codigo, nombre, descripcion, version, especialidades, tipo_renderer, componente_id, schema_items, interpretacion, activo, orden)
VALUES (
  'apgar',
  'Apgar Score',
  'Evaluación del estado del recién nacido al minuto y a los 5 minutos de vida. 5 criterios, puntaje 0-2 cada uno.',
  '1.0',
  ARRAY['Medicina General', 'Enfermería'],
  'componente_custom',
  'ApgarScore',
  NULL,
  '[
    {"min": 0, "max": 3,  "label": "Depresión severa",  "color": "red"},
    {"min": 4, "max": 6,  "label": "Depresión moderada","color": "orange"},
    {"min": 7, "max": 10, "label": "Normal",            "color": "blue"}
  ]',
  true, 10
);
