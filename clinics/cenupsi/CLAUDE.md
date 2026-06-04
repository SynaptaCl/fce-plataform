# CLAUDE.md — Cenupsi (banco de pruebas técnico)

> Contexto específico de Cenupsi para Claude Code.
> Leer siempre junto con el CLAUDE.md raíz del proyecto.

---

## Estado y propósito

**Cenupsi es banco de pruebas técnico — NO es cliente confirmado.**

Usamos su perfil (centro multidisciplinario de rehabilitación + psicología + nutrición)
para validar el sistema E2E antes de activar fce-plataform en producción.

- **Tipo de clínica**: centro multidisciplinario (rehab + psicología)
- **Estado**: en validación — NO contactar al equipo Cenupsi sin decisión comercial
- **Slug**: `cenupsi`
- **DB**: `vigyhfpwyxihrjiygfsa` (misma DB compartida)
- **Template onboarding**: `multidisciplinaria-rehab-psi`

---

## Restricciones críticas

1. **NO se solicitan datos reales al equipo Cenupsi** — usar placeholders en tests
2. **NO se envía comunicación comercial** como cliente hasta decisión confirmada
3. **Los datos sensibles de profesionales reales** NO se inventan ni se rellenan

---

## Modelo clínico

**Modelo**: `rehabilitacion` (Kinesiología, Fonoaudiología, Terapia Ocupacional)
           + `clinico_general` (Psicología, Nutrición)

Hay bifurcación de workspace por especialidad:
- Kine, Fono, TO → `rehab/page.tsx` (SoapForm + Eval + M10)
- Psico, Nutri → `clinico/page.tsx` (NotaClinicaForm + secciones estructuradas)

---

## Especialidades activas (post-migration)

| Código (exacto en DB) | Modelo | Prescripción | Exámenes |
|---|---|:---:|:---:|
| `Kinesiología` | rehabilitacion | NO | NO |
| `Fonoaudiología` | rehabilitacion | NO | NO |
| `Psicología` | clinico_general | NO | NO |
| `Nutrición` | clinico_general | NO | NO |
| `Terapia Ocupacional` | rehabilitacion | NO | NO |

**M7 y M8 NO activos** — sin habilitación para prescripción ni indicación de exámenes.

---

## Módulos activos (post-migration)

| Módulo | Estado |
|---|---|
| M1_identificacion | ✅ obligatorio |
| M2_anamnesis | ✅ activo |
| M3_evaluacion | ✅ activo |
| M4_soap | ✅ activo |
| M5_consentimiento | ✅ activo |
| M6_auditoria | ✅ obligatorio |
| M9_egresos | ✅ activo |
| M10_plan_intervencion | ✅ activo (GAS para neurodesarrollo) |
| M7_prescripciones | ❌ NO activo |
| M8_examenes | ❌ NO activo |

---

## Migration de onboarding

```bash
# Genera el SQL (no lo aplica)
npm run onboard:clinica -- --slug=cenupsi --template=multidisciplinaria-rehab-psi

# Archivo generado: supabase/migrations/20260604_onboard_cenupsi.sql
# Aplicar: operador Synapta, coordinado con el equipo
```

Estado actual: **migration generada, pendiente de aplicar**.

---

## Validación de estado

```bash
# Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm run validate:clinica -- --slug=cenupsi

# Estado esperado PRE-migration:  NOT READY (bloqueo: modulos_solo_base)
# Estado esperado POST-migration: NOT READY (bloqueo: sin_profesionales)
# Estado objetivo:                READY (tras registrar profesionales reales)
```

---

## Checklist go-live técnico

- [ ] Aplicar `20260604_onboard_cenupsi.sql`
- [ ] Recolectar nombre, numero_registro, tipo_registro de los 5 profesionales
- [ ] Registrar profesionales con `auth_id` vinculado
- [ ] Asignar profesionales a servicios desde `/configuracion/servicios`
- [ ] Smoke test por especialidad (encuentro → nota → firma)
- [ ] `npm run validate:clinica -- --slug=cenupsi` → READY

---

## Tests E2E

```bash
npx tsx scripts/test-sprint-o1-f6.ts
```

Verifica el flujo completo con datos mock (no necesita env vars para checks estáticos).
Con env vars cargadas, también valida el estado real en DB.
