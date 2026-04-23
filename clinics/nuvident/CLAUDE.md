# CLAUDE.md — Nuvident Clínica Dental (instancia)

> Contexto específico de esta clínica. Usar cuando el usuario diga
> "estoy trabajando para Nuvident".

## Identidad

- **Nombre:** Nuvident Clínica Dental
- **Slug:** `nuvident`
- **UUID:** `861ee507-9555-44d3-8836-b21ff039ceab`
- **Dominio:** por asignar
- **Ubicaciones:** 2 sucursales
  - Conchalí — Av. Cardenal José María Caro 1828
  - Pudahuel (Style Outlet) — Claudio Arrau 6910, Local 30
- **Tipo:** Clínica dental
- **Plan Synapta:** `profesional`

## Configuración FCE activa (inicial mínima)

### Módulos activos (2/6 + M7 pendiente migrations)
- ✅ `M1_identificacion`
- ✅ `M6_auditoria`
- 🔜 `M7_prescripciones` — activado en migration R9 (pendiente aplicar) · modo_firma_default: impresa

### Módulos INACTIVOS (no implementar para Nuvident aún)
- ❌ `M2_anamnesis`
- ❌ `M3_evaluacion`
- ❌ `M4_soap`
- ❌ `M5_consentimiento`

### M7 — Prescripciones para Nuvident

- `modo_firma_default: "impresa"` — dentistas firman el papel antes de entregarlo
- Para que la Dra. Nuri Peralta pueda prescribir: activar `puede_prescribir=true` en su fila de `profesionales`
- Odontología prescribe: analgésicos, antibióticos locales, anestésicos tópicos

### Especialidades activas (0)
Actualmente ninguna especialidad FCE activa. Cuando se active M3, la especialidad a configurar es `Odontología`.

## Branding (de `clinicas.config.branding`)

```
navy           #1B3A5C  → maps to kp-primary
navy_deep      #0F2440  → maps to kp-primary-deep
primary        #2563EB  → maps to kp-accent
primary_hover  #1D4ED8  → maps to kp-primary-hover
light_bg       #EFF6FF  → maps to kp-accent-lt
accent         #0891B2  → maps to kp-secondary
clinic_initials  NV
```

## Equipo actual

| Rol | Nombre | Email | Estado |
|---|---|---|---|
| admin | Alexis Olmedo | alexis.olmedoz@hotmail.com | **inactivo** |

Profesionales: 1 (Dra. Nuri Peralta, "Odontología general y estética").

**Atención:** el único admin está `activo = false`. Hay que activarlo o crear otro antes de que la clínica use el FCE en producción.

## Reglas específicas

1. **Odontología es una especialidad con hard-stop** (`tieneContraindicaciones: true` en registry). Antes de implementar M3 para Nuvident, el componente `OdontologiaEval` debe incluir checklist de contraindicaciones (anticoagulantes, embarazo, alergias a anestésicos, etc.).
2. **El campo `profesionales.especialidad` dice "Odontología general y estética"** (string libre), pero en FCE se usa el codigo exacto `Odontología` del catálogo. No mezclar.
3. **Nuvident está en estado `demo`** — los datos actuales son de pruebas, no reales.
4. **Futuro Odontograma**: cuando se implemente `OdontologiaEval`, incluirá un componente de odontograma interactivo. Esto es roadmap post-Sprint 5, no scope de los sprints iniciales.

## Estado de roadmap Nuvident

- ✅ Onboarding básico (clínica + admin)
- ✅ Chatbot configurado (ver `config.chatbot` — tipo_clinica: dental)
- ⏳ Activación de admin (actualmente inactivo)
- ⏳ FCE básico: M1 + M6 activos pero sin uso real todavía
- 🔜 Expansión FCE: activar M2, M3 (con Odontología), M4, M5
- 🔜 Componente `OdontologiaEval` con odontograma

## Referencias

- CLAUDE.md raíz (plataforma): `../../CLAUDE.md`
- Schema real: `../../docs/schema-real.md`
- Registry: `../../src/lib/modules/registry.ts`
