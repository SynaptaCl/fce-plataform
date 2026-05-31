# N1 — Módulo M10: Activación de Plan de Intervención Neurodesarrollo

> Esta guía es para el operador Synapta (superadmin). Claude Code NO ejecuta estos SQL.

## Prerrequisitos

Las siguientes tablas deben existir en Supabase (ya migradas):
- `plantillas_dominios`
- `fce_planes_intervencion`
- `fce_plan_objetivos`
- `fce_plan_progreso`
- Columna `secciones_estructuradas jsonb` en `fce_notas_clinicas`

## Activar M10 para una clínica

```sql
-- 1. Obtener el id_clinica
SELECT id, nombre FROM clinicas WHERE slug = 'nombre-clinica';

-- 2. Agregar M10 a los módulos activos
UPDATE clinicas_fce_config
SET modulos_activos = array_append(modulos_activos, 'M10_plan_intervencion'),
    config_modulos = jsonb_set(
      COALESCE(config_modulos, '{}'::jsonb),
      '{M10_plan_intervencion}',
      '{
        "habilitado": true,
        "plantillas_default": ["tea"],
        "periodo_revision_dias": 90
      }'::jsonb
    ),
    updated_at = now()
WHERE id_clinica = '<id_clinica>';
```

## Verificar activación

```sql
SELECT modulos_activos, config_modulos->'M10_plan_intervencion'
FROM clinicas_fce_config
WHERE id_clinica = '<id_clinica>';
```

El módulo aparecerá en el workspace clínico y rehab como botón "Plan de Intervención".

## Plantillas disponibles

Las condiciones seedeadas en `plantillas_dominios`:

| condicion_codigo | condicion_label |
|---|---|
| `tea` | Trastorno del Espectro Autista |
| `tdah` | TDAH |
| `trastorno_aprendizaje` | Trastorno del Aprendizaje |
| `tel` | Trastorno Específico del Lenguaje |

## Configuración de config_modulos

```json
{
  "habilitado": true,
  "plantillas_default": ["tea"],          // condicion_codigos que aparecen primero en el selector
  "periodo_revision_dias": 90             // días entre revisiones del plan (referencia UI)
}
```
