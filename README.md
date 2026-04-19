# 📦 Paquete handoff v2 — FCE Platform multi-tenant

Paquete con todo lo necesario para que Claude Code convierta el repo `korporis-fce` (copiado a `fce-plataform`) en una plataforma multi-tenant del ecosistema Synapta.

## Qué cambió vs v1

Después de inspeccionar el schema real de `Synapta Product`, el plan original tenía varias asunciones incorrectas. v2 corrige:

| Cambio | v1 | v2 |
|---|---|---|
| DB destino | Se asumía DB aislada de Korporis | Compartida en `Synapta Product` con Nuvident y otros repos |
| Config de clínica | Tabla nueva `clinicas_config` | Tabla nueva `clinicas_fce_config` + branding leído de `clinicas.config.branding` existente |
| Especialidades | Lowercase sin tilde (`kinesiologia`) | Capitalized con tilde (`Kinesiología`) — match DB exacto |
| Check constraint de `fce_encuentros.especialidad` | Ignorado | Migrado a tabla lookup `especialidades_catalogo` |
| Roles | 3 valores | 5 valores reales (`superadmin, director, admin, profesional, recepcionista`) |
| Módulos | M1–M8 (incluía Agenda y Facturación) | Solo M1–M6 (Agenda/Pagos viven en otros repos del ecosistema) |
| Clínicas | Solo Korporis | Korporis + Nuvident desde el día 1 |
| Branding | Tokens FCE propios | Leer `config.branding` + mapear |

## Contenido

```
handoff-v2/
├── README.md                                                    ← Este archivo
├── CLAUDE.md                                                    ← Maestro (v2)
├── docs/
│   ├── plan-multi-tenant.md                                     ← Arquitectura v2
│   ├── sprints.md                                               ← 5 sprints (no 7)
│   └── schema-real.md                                           ← Mapa del schema actual
├── src/lib/modules/
│   ├── registry.ts                                              ← Catálogo + mapBrandingToTokens
│   ├── config.ts                                                ← getClinicaConfig + helpers
│   ├── guards.ts                                                ← requireModule, roles
│   └── provider.tsx                                             ← ClinicaSessionProvider
├── supabase/migrations/
│   ├── 20260417_01_especialidades_catalogo.sql                 ← Tabla lookup + trigger
│   └── 20260417_02_clinicas_fce_config.sql                     ← Config FCE separada + seed
├── clinics/
│   ├── korporis/CLAUDE.md                                       ← Contexto Korporis
│   └── nuvident/CLAUDE.md                                       ← Contexto Nuvident
└── scripts/
    └── onboard-clinica.ts                                       ← CLI de onboarding
```

---

## Uso

### 1. Descomprimir en el repo fce-plataform

Asumiendo que ya tienes el repo inicializado (Sprint 0 hecho):

```powershell
Copy-Item -Path "C:\...\handoff-v2\*" -Destination "C:\Users\alexi\fce-plataform\" -Recurse -Force
```

Esto:
- Reemplaza el `CLAUDE.md` del paquete anterior
- Agrega los 2 migrations nuevos en `supabase/migrations/`
- Reemplaza los 4 archivos de `src/lib/modules/`
- Agrega `clinics/nuvident/CLAUDE.md`
- Agrega `docs/schema-real.md`
- Reemplaza `docs/plan-multi-tenant.md`, `docs/sprints.md`, `scripts/onboard-clinica.ts`, `clinics/korporis/CLAUDE.md`

### 2. Verificar que build sigue funcionando

```powershell
npm install
npm run build
```

Debe dar 0 errores (los nuevos archivos compilan pero aún no se importan).

### 3. Aplicar migrations en Supabase

**Opción A: vía Claude Code con Supabase MCP** (recomendado)
- Abrir Claude Code en el repo
- Pedirle: "Aplica las migrations en supabase/migrations/ usando el Supabase MCP"
- Claude Code usa `apply_migration` del MCP para ejecutar ambas en orden

**Opción B: manual via Supabase Dashboard**
- Ir a https://supabase.com/dashboard/project/vigyhfpwyxihrjiygfsa/sql
- Ejecutar `20260417_01_especialidades_catalogo.sql`
- Verificar: `SELECT * FROM especialidades_catalogo;` → 10 filas
- Ejecutar `20260417_02_clinicas_fce_config.sql`
- Verificar: `SELECT * FROM clinicas_fce_config;` → 2 filas (Korporis + Nuvident)

### 4. Commit del paquete

```powershell
cd C:\Users\alexi\fce-plataform
git add .
git commit -m "feat(handoff-v2): paquete multi-tenant alineado a schema real"
git push
```

### 5. Abrir Claude Code y arrancar Sprint 1

```powershell
claude
```

Primer prompt:

> Antes de ejecutar nada, lee en orden: `CLAUDE.md`, `docs/plan-multi-tenant.md`, `docs/schema-real.md`, `docs/sprints.md`, y `clinics/korporis/CLAUDE.md`.
>
> Luego armá el plan del Sprint 1 (sin ejecutarlo) con:
> 1. Qué migrations vas a aplicar y en qué orden
> 2. Qué tests de validación vas a correr después
> 3. Qué archivos vas a tocar (esperable: ninguno; el código del Sprint 1 ya viene en el paquete)
>
> Esperá mi confirmación antes de tocar DB o código.

---

## Notas operacionales

- **Modelo recomendado**: OpusPlan (Opus planea, Sonnet ejecuta). Balance de calidad y cuota.
- **Sprint 5 (migración Korporis)** nunca se corre sin pedido explícito del usuario.
- **Supabase MCP está conectado** a `Synapta Product` — Claude Code puede aplicar migrations directo.
- **Las tablas FCE están vacías** (0 filas) — las migrations son de bajo riesgo.
- **Nuvident admin está inactivo** — se reactiva cuando la clínica empiece a usar FCE.
