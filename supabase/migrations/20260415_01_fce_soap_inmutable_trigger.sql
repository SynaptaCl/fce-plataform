-- ============================================================================
-- Migration: 20260415_01_fce_soap_inmutable_trigger
-- Aplicado en producción: 2026-04-15 (migration real: fce_soap_inmutable_trigger)
-- NOTA: ya aplicado en producción — reconstruida el 2026-08-02 vía verificación
--   MCP Supabase (auditoría de cumplimiento legal) porque no existía en el repo.
--   El repo daba a entender que fce_notas_soap dependía solo de RLS para
--   inmutabilidad post-firma (CLAUDE.md regla 8) — en realidad SÍ tiene trigger
--   DB, igual que nota_clinica/prescripción/consentimiento/informe/adenda.
-- Descripción: trigger BEFORE UPDATE que bloquea cualquier modificación a una
--   nota SOAP ya firmada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_fce_soap_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.firmado = true THEN
    RAISE EXCEPTION
      'SOAP firmada es inmutable. id=% firmado_por=% firmado_at=%',
      OLD.id, OLD.firmado_por, OLD.firmado_at
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_fce_soap_inmutable
  BEFORE UPDATE ON public.fce_notas_soap
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_fce_soap_inmutable();
