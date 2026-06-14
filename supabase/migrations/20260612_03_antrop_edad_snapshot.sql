-- Sprint N1/N2 fix: snapshot edad al momento del registro antropométrico
-- ⚠️ HARD STOP — NO aplicar sin confirmación explícita vía MCP
ALTER TABLE fce_antropometria
  ADD COLUMN IF NOT EXISTS edad_meses_registro int;

COMMENT ON COLUMN fce_antropometria.edad_meses_registro IS
  'Edad del paciente en meses completos al momento de tomar la medición.
   Uso interno: cálculo z-score OMS. La UI lo formatea como años/meses/días.
   Snapshoteado server-side — no recalcular desde fecha_nacimiento en UI.';
