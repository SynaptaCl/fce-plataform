-- Migration: 20260729_01_seed_examenes_catalogo
-- Descripción: Seed inicial de examenes_catalogo (tabla ya existente, 0 filas)
-- Impacto: Solo INSERT, no DDL. No afecta fce_ordenes_examen ni RLS existente.
-- Rollback: DELETE FROM examenes_catalogo WHERE codigo LIKE 'LAB\_%' OR codigo LIKE 'IMG\_%'
--   OR codigo LIKE 'CARD\_%' OR codigo LIKE 'GO\_%' OR codigo LIKE 'ODO\_%' OR codigo LIKE 'FUN\_%';
--
-- NOTA CRÍTICA (regla 7 CLAUDE.md — contenido médico nunca se inventa):
--   codigo_fonasa, nivel_fonasa, valores_referencia e indicaciones_comunes
--   se dejan NULL. Requieren carga desde arancel FONASA oficial vigente y
--   revisión de un profesional clínico antes de mostrarse en producción.
--   Este seed cubre solo: codigo, nombre, categoria/subcategoria,
--   muestra_requerida, preparacion (solo casos de consenso universal),
--   especialidades_comunes.
--
-- Pendiente post-aplicación: agregar a docs/errores-conocidos.md y a
-- "Deuda técnica" del CLAUDE.md — "examenes_catalogo sembrado sin códigos
-- FONASA ni valores de referencia, pendiente antes de ir a producción".

-- ============================================================
-- LABORATORIO — HEMATOLOGÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_HEMOGRAMA', 'Hemograma completo', 'Hemograma', 'laboratorio', 'hematologia', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería','Nutrición'], 10),
('LAB_VHS', 'Velocidad de hemosedimentación (VHS)', 'VHS', 'laboratorio', 'hematologia', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería'], 11),
('LAB_PCR', 'Proteína C reactiva', 'PCR', 'laboratorio', 'hematologia', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería'], 12),
('LAB_GRUPO_RH', 'Grupo sanguíneo y Rh', 'Grupo-Rh', 'laboratorio', 'hematologia', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería','Obstetricia y Puericultura'], 13),
('LAB_FERRITINA', 'Ferritina sérica', 'Ferritina', 'laboratorio', 'hematologia', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 14),
('LAB_FERROCINEMIA', 'Perfil de fierro (ferrocinemia)', 'Ferrocinemia', 'laboratorio', 'hematologia', 'Sangre venosa', true, 'Ayuno de 8 horas', ARRAY['Medicina General','Nutrición'], 15);

-- ============================================================
-- LABORATORIO — BIOQUÍMICA / METABÓLICO
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_GLICEMIA_AYUNAS', 'Glicemia en ayunas', 'Glicemia ayunas', 'laboratorio', 'metabolico', 'Sangre venosa', true, 'Ayuno de 8-12 horas', ARRAY['Medicina General','Nutrición','Enfermería'], 20),
('LAB_HBA1C', 'Hemoglobina glicosilada (HbA1c)', 'HbA1c', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 21),
('LAB_PTGO', 'Prueba de tolerancia a la glucosa oral (PTGO)', 'PTGO', 'laboratorio', 'metabolico', 'Sangre venosa', true, 'Ayuno de 8 horas, curva de 2 horas', ARRAY['Medicina General','Nutrición','Obstetricia y Puericultura'], 22),
('LAB_PERFIL_LIPIDICO', 'Perfil lipídico (colesterol total, HDL, LDL, triglicéridos)', 'Perfil lipídico', 'laboratorio', 'metabolico', 'Sangre venosa', true, 'Ayuno de 9-12 horas', ARRAY['Medicina General','Nutrición'], 23),
('LAB_ACIDO_URICO', 'Ácido úrico', 'Ác. úrico', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 24),
('LAB_INSULINA_AYUNAS', 'Insulina basal en ayunas', 'Insulina ayunas', 'laboratorio', 'metabolico', 'Sangre venosa', true, 'Ayuno de 8 horas', ARRAY['Medicina General','Nutrición'], 25),
('LAB_ELECTROLITOS', 'Electrolitos plasmáticos (Na, K, Cl)', 'ELP', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería'], 26),
('LAB_CALCIO', 'Calcio sérico', 'Calcio', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 27),
('LAB_FOSFORO', 'Fósforo sérico', 'Fósforo', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 28),
('LAB_MAGNESIO', 'Magnesio sérico', 'Magnesio', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 29),
('LAB_PROT_TOTALES', 'Proteínas totales y albúmina', 'Prot. totales', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 30),
('LAB_LDH', 'Lactato deshidrogenasa (LDH)', 'LDH', 'laboratorio', 'metabolico', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 31);

-- ============================================================
-- LABORATORIO — FUNCIÓN RENAL / HEPÁTICA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_CREATININA', 'Creatinina sérica', 'Creatinina', 'laboratorio', 'funcion_renal', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 40),
('LAB_BUN', 'Nitrógeno ureico (BUN)', 'BUN', 'laboratorio', 'funcion_renal', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 41),
('LAB_ORINA_COMPLETA', 'Orina completa', 'OC', 'laboratorio', 'funcion_renal', 'Orina, primer chorro matinal', false, NULL, ARRAY['Medicina General','Enfermería','Obstetricia y Puericultura'], 42),
('LAB_MICROALBUMINURIA', 'Microalbuminuria', 'Microalbuminuria', 'laboratorio', 'funcion_renal', 'Orina 24 horas o muestra aislada', false, NULL, ARRAY['Medicina General','Nutrición'], 43),
('LAB_PERFIL_HEPATICO', 'Perfil hepático (GOT, GPT, GGT, FA, bilirrubina)', 'Perfil hepático', 'laboratorio', 'funcion_hepatica', 'Sangre venosa', true, 'Ayuno de 8 horas', ARRAY['Medicina General','Nutrición'], 44),
('LAB_BILIRRUBINA', 'Bilirrubina total y directa', 'Bilirrubina', 'laboratorio', 'funcion_hepatica', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 45),
('LAB_AMILASA', 'Amilasa sérica', 'Amilasa', 'laboratorio', 'funcion_hepatica', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 46),
('LAB_LIPASA', 'Lipasa sérica', 'Lipasa', 'laboratorio', 'funcion_hepatica', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 47);

-- ============================================================
-- LABORATORIO — HORMONAS / TIROIDES
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_TSH', 'Hormona estimulante de tiroides (TSH)', 'TSH', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 50),
('LAB_T4_LIBRE', 'T4 libre', 'T4 libre', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 51),
('LAB_T3', 'T3 total', 'T3', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 52),
('LAB_ANTI_TPO', 'Anticuerpos anti-tiroperoxidasa (Anti-TPO)', 'Anti-TPO', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 53),
('LAB_CORTISOL', 'Cortisol basal', 'Cortisol', 'laboratorio', 'hormonas', 'Sangre venosa', true, 'Toma matinal antes de las 9 AM', ARRAY['Medicina General'], 54),
('LAB_PROLACTINA', 'Prolactina', 'Prolactina', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 55),
('LAB_BETA_HCG', 'Beta-HCG cuantitativa', 'Beta-HCG', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia','Obstetricia y Puericultura'], 56),
('LAB_VITAMINA_D', 'Vitamina D (25-OH)', 'Vit. D', 'laboratorio', 'hormonas', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Nutrición'], 57);

-- ============================================================
-- LABORATORIO — INFECCIOSO / SEROLOGÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_VIH', 'Test de VIH (ELISA)', 'VIH', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Enfermería','Ginecología y Obstetricia'], 60),
('LAB_VDRL', 'VDRL / RPR (sífilis)', 'VDRL', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia','Obstetricia y Puericultura'], 61),
('LAB_HEPATITIS_B', 'Antígeno de superficie hepatitis B (HBsAg)', 'HBsAg', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Obstetricia y Puericultura'], 62),
('LAB_HEPATITIS_C', 'Anticuerpos hepatitis C', 'Hep C', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 63),
('LAB_CHAGAS', 'Serología Chagas', 'Chagas', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Obstetricia y Puericultura'], 64),
('LAB_TOXOPLASMOSIS', 'Serología toxoplasmosis (IgG/IgM)', 'Toxoplasmosis', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 65),
('LAB_RUBEOLA', 'Serología rubéola (IgG)', 'Rubéola IgG', 'laboratorio', 'infeccioso', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 66),
('LAB_HELICOBACTER', 'Antígeno Helicobacter pylori en deposiciones', 'H. pylori', 'laboratorio', 'infeccioso', 'Deposiciones', false, NULL, ARRAY['Medicina General'], 67),
('LAB_PCR_SARSCOV2', 'PCR SARS-CoV-2', 'PCR COVID', 'laboratorio', 'infeccioso', 'Hisopado nasofaríngeo', false, NULL, ARRAY['Medicina General','Enfermería'], 68),
('LAB_COPROPARASITOLOGICO', 'Coproparasitológico seriado', 'Coproparasitológico', 'laboratorio', 'infeccioso', 'Deposiciones (3 muestras)', false, NULL, ARRAY['Medicina General','Enfermería'], 69);

-- ============================================================
-- LABORATORIO — COAGULACIÓN
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_TP_INR', 'Tiempo de protrombina (TP/INR)', 'TP/INR', 'laboratorio', 'coagulacion', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 70),
('LAB_TTPK', 'Tiempo de tromboplastina parcial (TTPK)', 'TTPK', 'laboratorio', 'coagulacion', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 71),
('LAB_DIMERO_D', 'Dímero D', 'Dímero D', 'laboratorio', 'coagulacion', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 72);

-- ============================================================
-- LABORATORIO — MARCADORES TUMORALES
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_PSA', 'Antígeno prostático específico (PSA)', 'PSA', 'laboratorio', 'marcadores_tumorales', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 80),
('LAB_CA125', 'CA-125', 'CA-125', 'laboratorio', 'marcadores_tumorales', 'Sangre venosa', false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 81),
('LAB_CEA', 'Antígeno carcinoembrionario (CEA)', 'CEA', 'laboratorio', 'marcadores_tumorales', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 82),
('LAB_CA153', 'CA 15-3', 'CA 15-3', 'laboratorio', 'marcadores_tumorales', 'Sangre venosa', false, NULL, ARRAY['Medicina General'], 83);

-- ============================================================
-- LABORATORIO — MICROBIOLOGÍA / CULTIVOS
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('LAB_UROCULTIVO', 'Urocultivo', 'Urocultivo', 'laboratorio', 'microbiologia', 'Orina, segundo chorro', false, NULL, ARRAY['Medicina General','Enfermería','Obstetricia y Puericultura'], 90),
('LAB_CULTIVO_FARINGEO', 'Cultivo faríngeo', 'Cultivo faríngeo', 'laboratorio', 'microbiologia', 'Hisopado faríngeo', false, NULL, ARRAY['Medicina General','Enfermería'], 91),
('LAB_CULTIVO_HERIDA', 'Cultivo y antibiograma de herida', 'Cultivo herida', 'laboratorio', 'microbiologia', 'Hisopado de la lesión', false, NULL, ARRAY['Medicina General','Enfermería'], 92),
('LAB_CULTIVO_VAGINAL', 'Cultivo vaginal', 'Cultivo vaginal', 'laboratorio', 'microbiologia', 'Hisopado vaginal', false, NULL, ARRAY['Ginecología y Obstetricia','Medicina General'], 93),
('LAB_ANTIBIOGRAMA', 'Antibiograma (según cultivo)', 'Antibiograma', 'laboratorio', 'microbiologia', 'Según muestra base', false, NULL, ARRAY['Medicina General'], 94);

-- ============================================================
-- IMAGENOLOGÍA — RADIOGRAFÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('IMG_RX_TORAX', 'Radiografía de tórax (PA y lateral)', 'Rx tórax', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General'], 100),
('IMG_RX_COLUMNA_LUMBAR', 'Radiografía de columna lumbar', 'Rx columna lumbar', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 101),
('IMG_RX_COLUMNA_CERVICAL', 'Radiografía de columna cervical', 'Rx columna cervical', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 102),
('IMG_RX_RODILLA', 'Radiografía de rodilla', 'Rx rodilla', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 103),
('IMG_RX_HOMBRO', 'Radiografía de hombro', 'Rx hombro', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 104),
('IMG_RX_MUÑECA', 'Radiografía de muñeca', 'Rx muñeca', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 105),
('IMG_RX_TOBILLO', 'Radiografía de tobillo', 'Rx tobillo', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 106),
('IMG_RX_PIE', 'Radiografía de pie', 'Rx pie', 'imagenologia', 'radiografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 107);

-- ============================================================
-- IMAGENOLOGÍA — ECOGRAFÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('IMG_ECO_ABDOMINAL', 'Ecografía abdominal total', 'Eco abdominal', 'imagenologia', 'ecografia', NULL, true, 'Ayuno de 6-8 horas', ARRAY['Medicina General'], 110),
('IMG_ECO_RENAL_VESICAL', 'Ecografía renal y vesical', 'Eco renal-vesical', 'imagenologia', 'ecografia', NULL, true, 'Vejiga llena', ARRAY['Medicina General'], 111),
('IMG_ECO_TIROIDEA', 'Ecografía tiroidea', 'Eco tiroidea', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General'], 112),
('IMG_ECO_MAMARIA', 'Ecografía mamaria', 'Eco mamaria', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 113),
('IMG_ECO_TEJIDOS_BLANDOS', 'Ecografía de tejidos blandos / partes blandas', 'Eco partes blandas', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 114),
('IMG_ECO_MUSCULOESQUELETICA', 'Ecografía musculoesquelética', 'Eco MSK', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 115),
('IMG_ECO_DOPPLER_VENOSO', 'Eco-Doppler venoso de extremidades', 'Eco-Doppler venoso', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General'], 116),
('IMG_ECO_DOPPLER_ARTERIAL', 'Eco-Doppler arterial de extremidades', 'Eco-Doppler arterial', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General'], 117),
('IMG_ECO_CAROTIDEO', 'Eco-Doppler carotídeo', 'Eco-Doppler carotídeo', 'imagenologia', 'ecografia', NULL, false, NULL, ARRAY['Medicina General'], 118),
('IMG_ECO_PROSTATICA', 'Ecografía prostática', 'Eco prostática', 'imagenologia', 'ecografia', NULL, true, 'Vejiga llena', ARRAY['Medicina General'], 119);

-- ============================================================
-- IMAGENOLOGÍA — TAC
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('IMG_TAC_CEREBRO', 'TAC de cerebro sin contraste', 'TAC cerebro', 'imagenologia', 'tac', NULL, false, NULL, ARRAY['Medicina General'], 130),
('IMG_TAC_TORAX', 'TAC de tórax', 'TAC tórax', 'imagenologia', 'tac', NULL, false, NULL, ARRAY['Medicina General'], 131),
('IMG_TAC_ABDOMEN_PELVIS', 'TAC de abdomen y pelvis', 'TAC abdomen-pelvis', 'imagenologia', 'tac', NULL, true, 'Ayuno según indicación de contraste', ARRAY['Medicina General'], 132),
('IMG_TAC_COLUMNA', 'TAC de columna (segmento a definir)', 'TAC columna', 'imagenologia', 'tac', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 133),
('IMG_TAC_SENOS_PARANASALES', 'TAC de senos paranasales', 'TAC senos paranasales', 'imagenologia', 'tac', NULL, false, NULL, ARRAY['Medicina General'], 134),
('IMG_ANGIOTAC', 'AngioTAC (según territorio)', 'AngioTAC', 'imagenologia', 'tac', NULL, true, 'Requiere contraste EV', ARRAY['Medicina General'], 135);

-- ============================================================
-- IMAGENOLOGÍA — RESONANCIA MAGNÉTICA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('IMG_RNM_CEREBRO', 'Resonancia magnética de cerebro', 'RNM cerebro', 'imagenologia', 'rnm', NULL, false, NULL, ARRAY['Medicina General'], 150),
('IMG_RNM_COLUMNA_LUMBAR', 'Resonancia magnética de columna lumbar', 'RNM columna lumbar', 'imagenologia', 'rnm', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 151),
('IMG_RNM_RODILLA', 'Resonancia magnética de rodilla', 'RNM rodilla', 'imagenologia', 'rnm', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 152),
('IMG_RNM_HOMBRO', 'Resonancia magnética de hombro', 'RNM hombro', 'imagenologia', 'rnm', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 153),
('IMG_RNM_ABDOMEN', 'Resonancia magnética de abdomen', 'RNM abdomen', 'imagenologia', 'rnm', NULL, false, NULL, ARRAY['Medicina General'], 154);

-- ============================================================
-- IMAGENOLOGÍA — MAMOGRAFÍA / DENSITOMETRÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('IMG_MAMOGRAFIA', 'Mamografía bilateral', 'Mamografía', 'imagenologia', 'mamografia', NULL, false, NULL, ARRAY['Medicina General','Ginecología y Obstetricia'], 160),
('IMG_DENSITOMETRIA_OSEA', 'Densitometría ósea (DEXA)', 'Densitometría', 'imagenologia', 'densitometria', NULL, false, NULL, ARRAY['Medicina General','Nutrición'], 161),
('IMG_ECO_TRANSVAGINAL', 'Ecografía ginecológica transvaginal', 'Eco transvaginal', 'imagenologia', 'ecografia', NULL, true, 'Vejiga vacía', ARRAY['Ginecología y Obstetricia','Medicina General'], 162);

-- ============================================================
-- CARDIOLOGÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('CARD_ECG', 'Electrocardiograma de reposo (ECG)', 'ECG', 'procedimiento', 'cardiologia', NULL, false, NULL, ARRAY['Medicina General'], 170),
('CARD_ECOCARDIOGRAMA', 'Ecocardiograma doppler color', 'Ecocardiograma', 'procedimiento', 'cardiologia', NULL, false, NULL, ARRAY['Medicina General'], 171),
('CARD_HOLTER_RITMO', 'Holter de ritmo 24 horas', 'Holter ritmo', 'procedimiento', 'cardiologia', NULL, false, NULL, ARRAY['Medicina General'], 172),
('CARD_HOLTER_PRESION', 'Holter de presión arterial (MAPA) 24 horas', 'MAPA', 'procedimiento', 'cardiologia', NULL, false, NULL, ARRAY['Medicina General'], 173),
('CARD_TEST_ESFUERZO', 'Test de esfuerzo (ergometría)', 'Test esfuerzo', 'procedimiento', 'cardiologia', NULL, true, 'Ropa y calzado deportivo, ayuno relativo 2 horas', ARRAY['Medicina General'], 174);

-- ============================================================
-- GINECOLOGÍA / OBSTETRICIA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('GO_PAP', 'Papanicolau (PAP)', 'PAP', 'procedimiento', 'go_screening', 'Muestra cervical', false, NULL, ARRAY['Ginecología y Obstetricia','Medicina General','Obstetricia y Puericultura'], 180),
('GO_ECO_OBSTETRICA_1T', 'Ecografía obstétrica primer trimestre', 'Eco obstétrica 1T', 'imagenologia', 'go_ecografia_obstetrica', NULL, false, NULL, ARRAY['Ginecología y Obstetricia','Obstetricia y Puericultura'], 181),
('GO_ECO_OBSTETRICA_2T', 'Ecografía obstétrica segundo trimestre (estructural)', 'Eco obstétrica 2T', 'imagenologia', 'go_ecografia_obstetrica', NULL, false, NULL, ARRAY['Ginecología y Obstetricia','Obstetricia y Puericultura'], 182),
('GO_ECO_OBSTETRICA_3T', 'Ecografía obstétrica tercer trimestre', 'Eco obstétrica 3T', 'imagenologia', 'go_ecografia_obstetrica', NULL, false, NULL, ARRAY['Ginecología y Obstetricia','Obstetricia y Puericultura'], 183),
('GO_MONITOREO_FETAL', 'Monitoreo fetal (NST)', 'NST', 'procedimiento', 'go_monitoreo', NULL, false, NULL, ARRAY['Ginecología y Obstetricia','Obstetricia y Puericultura'], 184),
('GO_ECO_MAMARIA_GES', 'Ecografía mamaria bilateral', 'Eco mamaria', 'imagenologia', 'go_screening', NULL, false, NULL, ARRAY['Ginecología y Obstetricia'], 185),
('GO_CULTIVO_ESTREPTOCOCO', 'Cultivo perianal-vaginal Estreptococo grupo B', 'Cultivo SGB', 'laboratorio', 'go_microbiologia', 'Hisopado vaginal y anal', false, NULL, ARRAY['Ginecología y Obstetricia','Obstetricia y Puericultura'], 186),
('GO_COLPOSCOPIA', 'Colposcopia', 'Colposcopia', 'procedimiento', 'go_diagnostico', NULL, false, NULL, ARRAY['Ginecología y Obstetricia'], 187);

-- ============================================================
-- ODONTOLOGÍA
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('ODO_RX_PANORAMICA', 'Radiografía panorámica (ortopantomografía)', 'Rx panorámica', 'imagenologia', 'odo_radiografia', NULL, false, NULL, ARRAY['Odontología'], 200),
('ODO_RX_PERIAPICAL', 'Radiografía periapical', 'Rx periapical', 'imagenologia', 'odo_radiografia', NULL, false, NULL, ARRAY['Odontología'], 201),
('ODO_RX_BITEWING', 'Radiografía bite-wing (interproximal)', 'Rx bite-wing', 'imagenologia', 'odo_radiografia', NULL, false, NULL, ARRAY['Odontología'], 202),
('ODO_RX_OCLUSAL', 'Radiografía oclusal', 'Rx oclusal', 'imagenologia', 'odo_radiografia', NULL, false, NULL, ARRAY['Odontología'], 203),
('ODO_TAC_CONE_BEAM', 'Tomografía computarizada cone beam (CBCT)', 'CBCT', 'imagenologia', 'odo_tac', NULL, false, NULL, ARRAY['Odontología'], 204),
('ODO_TELERRADIOGRAFIA', 'Telerradiografía de perfil', 'Telerradiografía', 'imagenologia', 'odo_radiografia', NULL, false, NULL, ARRAY['Odontología'], 205);

-- ============================================================
-- FUNCIONALES / OTROS
-- ============================================================
INSERT INTO examenes_catalogo (codigo, nombre, nombre_corto, categoria, subcategoria, muestra_requerida, requiere_preparacion, preparacion_paciente, especialidades_comunes, orden) VALUES
('FUN_ESPIROMETRIA', 'Espirometría', 'Espirometría', 'procedimiento', 'fun_respiratorio', NULL, true, 'Evitar broncodilatador inhalado 6-8 horas previas si es posible', ARRAY['Medicina General','Kinesiología'], 220),
('FUN_AUDIOMETRIA', 'Audiometría tonal', 'Audiometría', 'procedimiento', 'fun_audicion', NULL, false, NULL, ARRAY['Medicina General','Fonoaudiología'], 221),
('FUN_EEG', 'Electroencefalograma (EEG)', 'EEG', 'procedimiento', 'fun_neurologico', NULL, true, 'Privación parcial de sueño según indicación', ARRAY['Medicina General'], 222),
('FUN_EMG', 'Electromiografía (EMG)', 'EMG', 'procedimiento', 'fun_neurologico', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 223),
('FUN_POLISOMNOGRAFIA', 'Polisomnografía nocturna', 'Polisomnografía', 'procedimiento', 'fun_sueno', NULL, false, NULL, ARRAY['Medicina General'], 224),
('FUN_TEST_MARCHA_6MIN', 'Test de marcha de 6 minutos', 'Test marcha 6 min', 'procedimiento', 'fun_respiratorio', NULL, false, NULL, ARRAY['Medicina General','Kinesiología'], 225),
('FUN_VIDEODEGLUCION', 'Videofluoroscopia de deglución', 'Videodeglución', 'imagenologia', 'fun_deglucion', NULL, false, NULL, ARRAY['Fonoaudiología','Medicina General'], 226),
('FUN_IMPEDANCIOMETRIA', 'Impedanciometría (timpanometría)', 'Impedanciometría', 'procedimiento', 'fun_audicion', NULL, false, NULL, ARRAY['Fonoaudiología','Medicina General'], 227);
