# CLAUDE.md — Korporis Centro de Salud (instancia)

> Contexto específico de esta clínica. Usar cuando el usuario diga
> "estoy trabajando para Korporis" o cuando se implementen features
> que solo afectan a esta instalación.

## Identidad

- **Nombre:** Korporis Centro de Salud
- **Slug:** `korporis`
- **UUID:** `572be8d9-f764-4a07-8045-13808679c7e9`
- **Dominio:** `fce.korporis.cl` (post Sprint 5)
- **Ubicación:** Juan Sebastián Bach 208, San Joaquín, Santiago, Chile
- **Tipo:** Clínica multidisciplinaria de rehabilitación
- **Plan Synapta:** `esencial` (por ahora)

## Configuración FCE activa

### Módulos activos (6/6)
- ✅ M1_identificacion
- ✅ M2_anamnesis
- ✅ M3_evaluacion
- ✅ M4_soap
- ✅ M5_consentimiento
- ✅ M6_auditoria

### Especialidades activas (3)
- ✅ `Kinesiología` — con 5 sub-especialidades (musculo-esquelética, neurológica, respiratoria, vestibular, piso pélvico)
- ✅ `Fonoaudiología`
- ✅ `Masoterapia` — **requiere hard-stop contraindicaciones**

## Branding (de `clinicas.config.branding`)

```
navy           #006B6B  → maps to kp-primary
navy_deep      #004545  → maps to kp-primary-deep
primary        #00B0A8  → maps to kp-accent
primary_hover  #009990  → maps to kp-primary-hover
light_bg       #E6FAF9  → maps to kp-accent-lt
accent         #F5A623  → maps to kp-secondary
logo_url       https://vigyhfpwyxihrjiygfsa.supabase.co/storage/v1/object/public/clinic-assets/logo_korporis.svg
clinic_initials  KP
```

## Equipo actual

| Rol | Nombre | Email |
|---|---|---|
| superadmin | Synapta Admin | synaptacl@gmail.com |
| director | Javier Korporis | javier@korporis.test |
| director | Jaime Korporis | Jaime@korporis.test |
| admin | Alexis Korporis | Alexis@korporis.test |

Profesionales: 3 (uno por especialidad).

## Reglas específicas

1. **Sub-especialidades de kinesiología**: al crear un encuentro o evaluación de Kinesiología, capturar sub-área (`musculo_esqueletica | neurologica | respiratoria | vestibular | piso_pelvico`). La DB permite esto en `fce_evaluaciones.sub_area` (texto libre, usar códigos consistentes).
2. **Masoterapia es solo presencial** — nunca a domicilio. En formularios, la opción "modalidad: domicilio" no debe aparecer si la especialidad es Masoterapia.
3. **Masoterapia requiere hard-stop de contraindicaciones** antes de iniciar sesión. Campo en `fce_evaluaciones.contraindicaciones_certificadas` (jsonb). Sin firma del profesional = no se puede pasar a M4 SOAP.
4. **Fonoaudiología** atiende desde los 2 años (niños) y adultos mayores. El formulario de anamnesis puede adaptarse según edad.
5. **Contexto de pagos**: Korporis cobra abonos de $15.000 via Stripe (gateway). Esto vive en synapta-web, no en este repo. El FCE solo lee `fce_encuentros.id_cita` como referencia.
6. **Datos de pago de la clínica**: `config.booking_flow.datos_pago` tiene `[PENDIENTE]` en varios campos. Son datos operacionales del bot, no relevantes para FCE.

## Datos pre-existentes al momento del handoff

- 2 pacientes en `pacientes` (probablemente de pruebas)
- 310 filas en `disponibilidad` (agenda ya poblada)
- 50 plantillas de horario
- 10 filas en `conversaciones` (chatbot activo)
- 4 filas en `logs_auditoria` (actividad existente)
- 0 filas en tablas FCE (`fce_*`) — todo está listo para empezar limpio

## Referencias

- CLAUDE.md raíz (plataforma): `../../CLAUDE.md`
- Schema real: `../../docs/schema-real.md`
- Registry: `../../src/lib/modules/registry.ts`
- Plan multi-tenant: `../../docs/plan-multi-tenant.md`
- Sprints: `../../docs/sprints.md`

## Documentación legacy (del repo korporis-fce original)

Revisar si Claude Code necesita contexto histórico sobre el FCE de Korporis:
- `docs/plan-fce-korporis.md` (si se copió)
- `docs/diseno-integral-fce.md`
- `docs/korporis-modelo.md`
- `docs/korporis-informe.md`
