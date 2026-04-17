# 📦 Paquete handoff — FCE Platform multi-tenant

Este paquete contiene todo lo necesario para que Claude Code convierta el FCE de Korporis en una plataforma multi-tenant.

## Qué hay adentro

```
handoff/
├── README.md                          ← Este archivo
├── CLAUDE.md                          ← Maestro de la plataforma (pegar en root)
├── docs/
│   ├── plan-multi-tenant.md           ← Arquitectura y decisiones
│   └── sprints.md                     ← Roadmap sprint por sprint (seguir en orden)
├── src/lib/modules/
│   ├── registry.ts                    ← Catálogo universal
│   ├── config.ts                      ← Helpers de runtime
│   ├── guards.ts                      ← requireModule, assertModuleEnabled
│   └── provider.tsx                   ← React Context
├── supabase/migrations/
│   └── 20260417_create_clinicas_config.sql
├── clinics/korporis/
│   └── CLAUDE.md                      ← Config específica de Korporis
└── scripts/
    └── onboard-clinica.ts             ← CLI para agregar clínicas nuevas
```

---

## Pasos que tú (humano) haces antes de invocar Claude Code

### 1. Copiar el repo actual de Korporis

```bash
# Desde la carpeta donde tienes el repo de Korporis
cp -R fce-korporis fce-platform
cd fce-platform
rm -rf .git
git init
```

### 2. Crear repo en GitHub

En GitHub, crear repo privado `fce-platform`. Luego:

```bash
git remote add origin git@github.com:tu-usuario/fce-platform.git
git add .
git commit -m "chore: baseline desde fce-korporis"
git branch -M main
git push -u origin main
```

### 3. Copiar el contenido de este paquete al repo

Copiar todos los archivos de `handoff/` al root de `fce-platform/`, respetando la estructura de carpetas:

- `handoff/CLAUDE.md` → `fce-platform/CLAUDE.md` (reemplazar el existente)
- `handoff/docs/*` → `fce-platform/docs/*` (agregar, no reemplazar los legacy)
- `handoff/src/lib/modules/*` → `fce-platform/src/lib/modules/*`
- `handoff/supabase/migrations/*` → `fce-platform/supabase/migrations/*`
- `handoff/clinics/*` → `fce-platform/clinics/*`
- `handoff/scripts/*` → `fce-platform/scripts/*`

Commit:
```bash
git add .
git commit -m "feat(handoff): paquete multi-tenant base"
git push
```

### 4. Verificar que build sigue corriendo

```bash
npm install
npm run build
```

Los archivos del paquete **no se usan todavía en ningún import** — solo existen. El build debe pasar idéntico al Korporis original.

### 5. Invocar Claude Code

Abrir Claude Code en `fce-platform/`. El `CLAUDE.md` raíz lo orienta automáticamente.

Primer prompt sugerido:

> "Lee CLAUDE.md, docs/plan-multi-tenant.md y docs/sprints.md. Cuando los hayas entendido, resumí qué vas a hacer en el Sprint 1 y esperá mi confirmación antes de ejecutar."

---

## Cómo Claude Code debería trabajar

### Flujo ideal

1. Lee `CLAUDE.md` raíz
2. Lee `docs/sprints.md`
3. Confirma entendimiento
4. Ejecuta Sprint 1 completo (catálogo + migration + helpers)
5. `npm run build` = 0 errores
6. Commit: `feat(registry): agregar module registry y config helpers`
7. Pide confirmación antes del Sprint 2
8. Repite

### Qué NO debe hacer Claude Code

- Saltarse sprints
- Modificar el registry "para adaptar a Korporis"
- Ejecutar el Sprint 7 (migración Korporis) sin coordinación explícita
- Aplicar migrations en producción sin confirmación
- Tocar código de Korporis producción (está en otro repo)

### Qué hacer si algo falla

Si el build de `npm run build` se rompe:
1. NO continuar al siguiente sprint
2. Reportar el error exacto
3. Corregir y re-correr build
4. Solo entonces avanzar

---

## Generador de CLAUDE.md para clínica nueva (sin CLI)

Si quieres generar un CLAUDE.md antes de tener el CLI implementado (Sprint 6), hay un artifact web en Claude.ai donde seleccionas módulos y especialidades, y descargas el archivo. Luego lo guardas en `clinics/<slug>/CLAUDE.md`.

## Onboarding con CLI (post Sprint 6)

```bash
npm run onboard-clinica -- \
  --slug=mi-clinica \
  --nombre="Mi Clínica" \
  --admin-email=admin@miclinica.cl \
  --direccion="Dirección 123, Santiago" \
  --modulos=M1_identificacion,M2_anamnesis,M5_consentimiento,M6_auditoria \
  --especialidades=psicologia,nutricion
```

El script valida con el registry, crea la fila en DB, invita al admin, e imprime el CLAUDE.md sugerido.

---

## Referencias cruzadas

- **Repo original de Korporis** (NO TOCAR): `fce-korporis` en GitHub
- **Repo plataforma** (donde se trabaja): `fce-platform`
- **Staging DB** para pruebas: Supabase project separado
- **Producción DB**: solo se toca en Sprint 7

---

## Contactos y coordinación

Cualquier cambio que afecte producción (Sprint 7 o migrations en DB prod) requiere coordinación explícita con el usuario humano. Claude Code nunca debe ejecutar migrations destructivas en prod sin confirmación.
