# CLAUDE.md — Clínica Korporis (instancia)

> Archivo de **contexto específico de clínica**. Úsalo cuando el usuario diga
> "estoy trabajando para Korporis" o cuando implementes features que solo
> afectan a esta instalación.
>
> El `CLAUDE.md` raíz contiene las reglas de la plataforma general. Este archivo
> las complementa con la configuración específica de Korporis.

## Identidad

- **Nombre:** Korporis Centro de Salud
- **Slug:** `korporis`
- **Dominio:** `fce.korporis.cl` (post-migración Sprint 7)
- **Ubicación:** San Joaquín, Santiago, Chile
- **Tipo:** Clínica privada de kinesiología, fonoaudiología y masoterapia

## Configuración activa

### Módulos activos (6)
- ✅ `M1_identificacion` — Identificación de paciente
- ✅ `M2_anamnesis` — Anamnesis + Red Flags + Signos Vitales
- ✅ `M3_evaluacion` — Evaluación por especialidad
- ✅ `M4_soap` — Evolución SOAP + CIF Mapper
- ✅ `M5_consentimiento` — Consentimiento informado
- ✅ `M6_auditoria` — Auditoría

### Módulos INACTIVOS
- ❌ `M7_agenda` — No implementar, rutas retornan 404
- ❌ `M8_facturacion` — No implementar, rutas retornan 404

### Especialidades activas (3)
- ✅ `kinesiologia`
- ✅ `fonoaudiologia`
- ✅ `masoterapia` — **requiere hard-stop contraindicaciones**

### Especialidades INACTIVAS
- ❌ `medicina_general`, `psicologia`, `nutricion`, `terapia_ocupacional`, `podologia`

## Paleta de marca

```
kp-primary       #006B6B   Teal oscuro
kp-primary-deep  #004545   Muy oscuro — fondo Hero/sidebar
kp-accent        #00B0A8   Verde-teal vibrante — CTAs
kp-accent-md     #33C4BE   Teal brillante — gradientes
kp-accent-lt     #D5F5F4   Fondo de badges
kp-secondary     #F5A623   Naranja — acento secundario
```

## Reglas específicas de Korporis

1. **Solo implementar features de los módulos activos** listados arriba. Si el
   usuario pide algo de M7 (agenda) o M8 (facturación), responder: "Eso no está
   habilitado para Korporis. ¿Quieres activar el módulo en `clinicas_config`?"
2. **Solo tres especialidades**. No agregar componentes de evaluación para
   otras especialidades "por si acaso".
3. **Masoterapia requiere hard-stop de contraindicaciones** antes de iniciar
   cualquier sesión. No bypass, no shortcut, no toggles.
4. **SOAP de masoterapia** puede ser firmado por profesionales con rol kine+maso
   (ver políticas de Korporis). Verificar con el usuario antes de cambiar.
5. **Fonoaudiología** usa escalas funcionales específicas (FEES, MASA, etc.).
   Están implementadas en `FonoaudiologiaEval.tsx`. No duplicar.

## Referencias

- CLAUDE.md raíz (plataforma): `../../CLAUDE.md`
- Catálogo de módulos: `../../src/lib/modules/registry.ts`
- Plan multi-tenant: `../../docs/plan-multi-tenant.md`
- Sprints: `../../docs/sprints.md`

## Documentación heredada (legacy)

Estos documentos vienen del repo original de Korporis. Claude Code debe
consultarlos para features específicas de Korporis:

- `docs/plan-fce-korporis.md` — Plan original del FCE (fases M1–M6, modelo de datos)
- `docs/diseno-integral-fce.md` — Requisitos clínicos y legales (Decreto 41, Ley 20.584)
- `docs/korporis-modelo.md` — Datos confirmados del cliente
- `docs/korporis-informe.md` — Informe del cliente (servicios, precios)
