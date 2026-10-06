-- Migration: 20261006_01_set_componente_id_instrumentos_dentales
-- Descripción: Asigna componente_id a los 3 instrumentos dentales que quedaron
--              huérfanos (seed_instrumentos_odontologicos de 20260429 nunca
--              commiteó estos valores). Los componentes React OlearyIndex/
--              CpodIndex/IndiceGingival se implementan en el repo.
-- Aplicada:    2026-10-06 vía MCP (Synapta Product).
-- Rollback:    UPDATE instrumentos_valoracion SET componente_id = NULL
--              WHERE codigo IN ('oleary','cpod','indice_gingival');

UPDATE instrumentos_valoracion
SET componente_id = 'OlearyIndex'
WHERE codigo = 'oleary' AND tipo_renderer = 'componente_custom';

UPDATE instrumentos_valoracion
SET componente_id = 'CpodIndex'
WHERE codigo = 'cpod' AND tipo_renderer = 'componente_custom';

UPDATE instrumentos_valoracion
SET componente_id = 'IndiceGingival'
WHERE codigo = 'indice_gingival' AND tipo_renderer = 'componente_custom';
