-- ============================================================================
-- Migration: 20260907_05_seed_procedimientos_esteticos_catalogo
-- Sprint: M13 — Módulo Ficha Estética
-- Descripción: Seed inicial de procedimientos_esteticos_catalogo con
--   categorías genéricas únicamente (regla 7 CLAUDE.md — contenido médico
--   nunca se inventa). Sin dosis/producto específico: eso se registra por
--   aplicación en fce_ficha_estetica_zonas. contraindicaciones_clave usa
--   solo advertencias de consenso amplio (embarazo, lactancia, infección
--   activa en zona) — no reemplaza criterio clínico ni ficha técnica del
--   fabricante.
-- Impacto: Solo INSERT, no DDL.
-- Rollback: DELETE FROM procedimientos_esteticos_catalogo WHERE id_clinica IS NULL;
-- Pendiente post-aplicación: agregar a "Deuda técnica" del CLAUDE.md —
--   "procedimientos_esteticos_catalogo sembrado sin validación clínica
--   formal, pendiente revisión por profesional antes de producción" —
--   mismo estándar que el seed de medicamentos/examenes.
-- Aplicada 2026-09-07 con aprobación humana explícita en el chat (CLAUDE.md regla 15).
-- ============================================================================

INSERT INTO procedimientos_esteticos_catalogo
  (nombre, categoria, descripcion, contraindicaciones_clave, requiere_consentimiento_especifico, id_clinica, activo)
VALUES
  ('Toxina botulínica', 'toxina_botulinica', 'Aplicación de toxina botulínica tipo A para líneas de expresión.', ARRAY['Embarazo','Lactancia','Enfermedad neuromuscular','Infección activa en zona'], true, NULL, true),
  ('Ácido hialurónico', 'relleno_ac_hialuronico', 'Relleno dérmico con ácido hialurónico.', ARRAY['Embarazo','Lactancia','Infección activa en zona','Alergia conocida al producto'], true, NULL, true),
  ('Depilación láser', 'laser', 'Depilación mediante tecnología láser.', ARRAY['Embarazo','Fotosensibilidad','Bronceado reciente en zona'], true, NULL, true),
  ('Láser fraccionado', 'laser', 'Resurfacing cutáneo con láser fraccionado.', ARRAY['Embarazo','Fotosensibilidad','Infección activa en zona','Bronceado reciente'], true, NULL, true),
  ('Peeling químico', 'peeling', 'Exfoliación química superficial/media.', ARRAY['Embarazo','Lactancia','Infección activa en zona','Herpes activo'], true, NULL, true),
  ('Radiofrecuencia facial', 'radiofrecuencia', 'Tensado cutáneo facial no invasivo.', ARRAY['Embarazo','Marcapasos','Implantes metálicos en zona'], false, NULL, true),
  ('Radiofrecuencia corporal', 'radiofrecuencia', 'Tensado cutáneo corporal no invasivo.', ARRAY['Embarazo','Marcapasos','Implantes metálicos en zona'], false, NULL, true),
  ('Mesoterapia facial', 'mesoterapia', 'Microinyecciones de principios activos en dermis facial.', ARRAY['Embarazo','Lactancia','Infección activa en zona','Trastornos de coagulación'], true, NULL, true),
  ('Mesoterapia corporal', 'mesoterapia', 'Microinyecciones de principios activos en dermis corporal.', ARRAY['Embarazo','Lactancia','Infección activa en zona','Trastornos de coagulación'], true, NULL, true);
