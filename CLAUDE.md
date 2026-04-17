# CLAUDE.md — FCE Platform (multi-tenant)

## Qué es este proyecto

Plataforma genérica de Ficha Clínica Electrónica para clínicas chilenas.
Arquitectura **multi-tenant**: un solo repo, una sola base de datos Supabase, todas las clínicas compartidas, separadas por `id_clinica`.

Cada clínica habilita sus propios módulos (M1–M8) y especialidades (kinesiología, fonoaudiología, masoterapia, medicina general, psicología, nutrición, terapia ocupacional, podología) desde la tabla `clinicas_config` — sin redeploy.

**Origen:** este repo es una copia del FCE de Korporis Centro de Salud (San Joaquín, Santiago). Korporis sigue corriendo en su repo original; este repo lo refactoriza a plataforma y eventualmente reemplazará al original.

---

## Documentación de referencia (LEER ANTES de cualquier implementación)

1. `docs/plan-multi-tenant.md` — Arquitectura completa, capas, decisiones de diseño
2. `docs/sprints.md` — Roadmap sprint por sprint con criterios de aceptación
3. `docs/plan-fce-korporis.md` — Plan original del FCE (fases M1–M6, modelo de datos) — heredado
4. `docs/diseno-integral-fce.md` — Requisitos clínicos y legales (Decreto 41 MINSAL, Ley 20.584, CIF, FHIR) — heredado

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.3 |
| Lenguaje | TypeScript strict | ^5 |
| Estilos | Tailwind CSS v4 | ^4 |
| Backend / Auth / DB | Supabase | `@supabase/ssr ^0.10.2` · `@supabase/supabase-js ^2.103.0` |
| Deploy | Vercel | — |
| Formularios | react-hook-form + zod | ^7 · ^4 |
| UI / Animación | lucide-react · motion/react | ^1.8 · ^12 |
| Fechas | date-fns | ^4 |
| PDF | html2pdf.js | ^0.14 |

---

## Paleta de colores — **dinámica desde DB**

En la plataforma multi-tenant **los tokens `kp-*` NO son constantes en `globals.css`**. Se inyectan como CSS variables desde `clinicas_config.tokens_color` al montar el layout del dashboard.

Tokens esperados (el registry los valida):
```
--kp-primary        Teal oscuro — headings
--kp-primary-deep   Muy oscuro — fondo Hero/sidebar
--kp-accent         Color vibrante — CTAs, botones
--kp-accent-md      Más brillante — gradientes
--kp-accent-lt      Fondo claro — badges
--kp-secondary      Color complementario
```

**Regla:** componentes usan siempre `var(--kp-*)`. Nunca `text-teal-500`, nunca `#006B6B` hardcoded.

---

## 🚫 12 reglas inquebrantables

1. **`npm run build` = 0 errores** después de CADA sprint. No se avanza con build roto.
2. **Tokens `kp-*` solo vía CSS variables** — nunca colores Tailwind genéricos (`bg-teal-500` ❌), nunca hex hardcoded en componentes.
3. **TypeScript strict** — sin `any` implícitos. `any` explícito solo en helpers internos de logging.
4. **RLS habilitado en TODAS las tablas** de Supabase que tocan datos de clínica.
5. **Filtrar por `id_clinica`** en toda query de datos clínicos (multi-tenant). Usar `getIdClinica(supabase, user.id)`.
6. **Audit log en toda operación de escritura** (tabla `logs_auditoria`).
7. **Contenido médico nunca se inventa** — datos confirmados o `[PENDIENTE]`.
8. **SOAP firmado = inmutable** (no se puede editar después de firma).
9. **Hard-stop contraindicaciones** obligatorio antes de iniciar sesión de masoterapia o podología (especialidades con `tieneContraindicaciones: true`).
10. **Server Components por defecto**, `'use client'` solo cuando sea necesario (formularios con estado, canvas de firma, etc.).
11. **Seguir los sprints en orden** (`docs/sprints.md`). No saltar. No mezclar sprints.
12. **NUNCA modificar `registry.ts` para "adaptar a una clínica"** — el registry es el catálogo universal. Si una clínica no usa un módulo, se desactiva en `clinicas_config`, no se borra del catálogo.

---

## Arquitectura multi-tenant en 4 capas

```
CATÁLOGO (código, inmutable en runtime)
  src/lib/modules/registry.ts
  → Define QUÉ módulos y especialidades existen
           ↓
CONFIGURACIÓN (Supabase, editable por admin de clínica)
  tabla clinicas_config
  → Define QUÉ tiene activo cada clínica
           ↓
GUARDS (runtime Server Components + Server Actions)
  src/lib/modules/guards.ts
  → Bloquea rutas/actions si módulo inactivo
           ↓
UI CONDICIONAL
  Sidebar, PatientHeader, rutas dinámicas
  → Solo muestra lo habilitado
```

---

## Estructura del proyecto (post-refactor)

```
src/
├── app/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx                    → Auth + fetch clinica config + BrandingInjector
│   │   ├── page.tsx
│   │   └── pacientes/
│   │       ├── page.tsx
│   │       ├── nuevo/page.tsx
│   │       └── [id]/
│   │           ├── anamnesis/page.tsx    → requireModule(config, "M2_anamnesis")
│   │           ├── evaluacion/page.tsx   → requireModule(config, "M3_evaluacion")
│   │           ├── evolucion/page.tsx    → requireModule(config, "M4_soap")
│   │           ├── consentimiento/page.tsx → requireModule(config, "M5_consentimiento")
│   │           └── auditoria/page.tsx    → requireModule(config, "M6_auditoria")
│   ├── admin/
│   │   └── configuracion/page.tsx        → UI de admin para editar clinicas_config
│   └── actions/                           → Server actions (heredadas)
├── components/
│   ├── ui/                                → Átomos (heredados, pasar a var(--kp-*))
│   ├── layout/
│   │   ├── Sidebar.tsx                    → Render condicional según config.modulosActivos
│   │   ├── BrandingInjector.tsx           → Inyecta tokens_color como CSS vars
│   │   └── ...
│   └── modules/                           → Módulos M1–M6 (heredados)
├── lib/
│   ├── supabase/
│   ├── modules/                           ← NUEVO — core de multi-tenant
│   │   ├── registry.ts                    ← Catálogo inmutable
│   │   ├── config.ts                      ← getClinicaConfig() + tipos
│   │   ├── guards.ts                      ← requireModule(), assertModuleEnabled()
│   │   └── provider.tsx                   ← React Context ClinicaConfigProvider
│   ├── permissions.ts
│   ├── audit.ts
│   └── ...
└── types/
supabase/
└── migrations/
    └── 20260417_create_clinicas_config.sql    ← NUEVO
clinics/
└── korporis/
    └── CLAUDE.md                          ← CLAUDE.md específico para cuando Claude trabaje EN Korporis
scripts/
└── onboard-clinica.ts                     ← CLI para agregar clínica nueva
```

---

## Schema Supabase — tabla `clinicas_config`

**Columnas:**
```
id_clinica              uuid PK → clinicas(id)
nombre_display          text
slug                    text unique
logo_url                text nullable
modulos_activos         text[]    default {M1_identificacion, M6_auditoria}
especialidades_activas  text[]    default {}
tokens_color            jsonb     default paleta korporis
config_modulos          jsonb     default {}   (overrides granulares)
created_at, updated_at, updated_by
```

Migration completa en `supabase/migrations/20260417_create_clinicas_config.sql`.

---

## Patrones de código (consolidados)

### Obtener config de clínica en Server Component
```typescript
import { getClinicaConfig } from "@/lib/modules/config";
import { getIdClinica } from "@/app/actions/patients";
import { requireAuth } from "@/lib/auth";

const { supabase, user } = await requireAuth();
const idClinica = await getIdClinica(supabase, user.id);
const config = await getClinicaConfig(idClinica);
if (!config) redirect("/login?error=sin-config");
```

### Guard de módulo en ruta
```typescript
import { requireModule } from "@/lib/modules/guards";

export default async function AnamnesisPage() {
  const config = await getClinicaConfigFromSession();
  requireModule(config, "M2_anamnesis"); // notFound() si inactivo
  // ...
}
```

### requireAuth + getIdClinica (heredado)
```typescript
async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(); // NO getSession()
  if (error || !user) redirect("/login");
  return { supabase, user };
}

async function getIdClinica(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("admin_users")
    .select("id_clinica")
    .eq("auth_id", userId)
    .single();
  return data?.id_clinica ?? null;
}
```

### ActionResult estándar (heredado)
```typescript
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### logAudit (heredado)
```typescript
await supabase.from("logs_auditoria").insert({
  actor_id: userId,
  actor_tipo: "profesional",
  accion,
  tabla_afectada: tabla,
  registro_id,
  ...(idClinica ? { id_clinica: idClinica } : {}),
  ...(idPaciente ? { id_paciente: idPaciente } : {}),
});
```

### Zona horaria Santiago
```typescript
const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
```

### Especialidad — normalización (DB vs type)
La DB guarda `"Kinesiología"` (con tilde); el type espera `"kinesiologia"`:
```typescript
const especialidad = rawEsp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
```

---

## Tablas FCE — recordatorio `id_clinica`

```
CON id_clinica:    pacientes, fce_anamnesis, fce_encuentros, fce_consentimientos, clinicas_config
SIN id_clinica:    fce_evaluaciones, fce_signos_vitales, fce_notas_soap
```

NO agregar `id_clinica` a tablas que no la tienen — provoca error de columna inexistente.

Para consultar datos de tablas SIN `id_clinica`, se filtra vía JOIN con `fce_encuentros.id_clinica` o `pacientes.id_clinica`.

---

## Flujo de trabajo con múltiples clínicas

### Cuando Claude Code trabaja en la plataforma (general)
Lee este `CLAUDE.md` raíz. Trabaja sobre el catálogo y helpers. No toca config de ninguna clínica específica.

### Cuando Claude Code trabaja "para" una clínica específica
Existen CLAUDE.md por clínica en `clinics/<slug>/CLAUDE.md`. Si el usuario dice "estoy trabajando en Korporis ahora", Claude Code debe:
1. Leer `clinics/korporis/CLAUDE.md`
2. Respetar los módulos activos de esa clínica
3. NO implementar módulos desactivados
4. Si el usuario pide algo de un módulo inactivo, responder: "M7_agenda no está habilitado para Korporis según su configuración. ¿Quieres activarlo en `clinicas_config` primero?"

### Generar CLAUDE.md para clínica nueva
Existe un generador web (artifact en Claude.ai o herramienta standalone). Proceso:
1. Abrir el generador
2. Escoger módulos, especialidades, paleta
3. Descargar `CLAUDE-<slug>.md`
4. Poner en `clinics/<slug>/CLAUDE.md` del repo
5. Ejecutar `npm run onboard-clinica -- --slug=<slug>` para seed en DB

---

## Comandos

```bash
npm run dev                  # Desarrollo local
npm run build                # Build producción (0 errores obligatorio)
npm run lint                 # Linting
npm run onboard-clinica      # CLI para agregar clínica nueva (post sprint 6)
```

## Convención de commits

```
feat(registry): agregar módulo M7_agenda
feat(config): helper getClinicaConfig
feat(korporis): migrar a multi-tenant
fix(sidebar): render condicional por módulos activos
refactor(branding): mover tokens kp-* a CSS vars dinámicas
sql: migration clinicas_config
docs(sprints): marcar sprint 1 como completado
```

Prefijo de scope opcional pero útil: `(registry)`, `(config)`, `(guards)`, `(branding)`, `(korporis)`.

---

## ⚠️ Contexto sensible — Korporis en producción

**NO TOCAR el repo original de Korporis** (`fce.korporis.cl`). Este repo (`fce-platform`) está separado a propósito.

Korporis se migrará al final (Sprint 7). Hasta entonces, Korporis vive en su repo original y ESTE repo no afecta producción. Cambios destructivos aquí son seguros.

**Cuando llegue Sprint 7** (migración Korporis → plataforma):
1. Coordinación explícita con el usuario
2. Backup de DB
3. Deploy a staging primero
4. Switch de DNS `fce.korporis.cl` al nuevo deploy
5. Repo viejo a read-only archive

No hacer nada del Sprint 7 sin que el usuario lo pida explícitamente.
