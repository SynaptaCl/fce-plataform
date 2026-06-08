# Tarea para Claude Code — Hardening Multi-Tenant FCE-plataform

> Fecha: 2026-06-06
> Contexto: Auditoría de seguridad multi-tenant completada. 5 políticas RLS ya corregidas en DB.
> Este documento define las tareas de código restantes.

---

## 1. COPIAR MIGRATIONS AL REPO

Copiar estos 2 archivos a `supabase/migrations/`:
- `20260606_01_version_get_clinica_ids_for_user.sql`
- `20260606_02_fix_rls_tenant_isolation_5_policies.sql`

Marcar `20260601_01_hotfix_rls_tenant_isolation.sql` como obsoleta (renombrar a `.sql.obsolete` o eliminar — la migration 20260606_02 la reemplaza completamente).

---

## 2. DEFENSE-IN-DEPTH: AGREGAR `.eq("id_clinica", idClinica)` EN ACTIONS

Patrón correcto ya existe en el codebase (ver `copiloto-nota.ts`, `dental/odontograma.ts`, `egresos.ts`).
Las actions usan `createClient()` (anon, RLS activo), así que RLS ya protege. Estos fixes son defense-in-depth.

### 2.1 Actions de LECTURA sin filtro de clínica

Cada una necesita: obtener `idClinica` via `getIdClinica()` o `admin_users`, luego agregar `.eq("id_clinica", idClinica)` al query.

| Action | Archivo:línea | Query actual | Fix |
|--------|--------------|-------------|-----|
| `getPatientById` | `patients.ts:142` | `.eq("id", id)` | Agregar `.eq("id_clinica", idClinica)` |
| `getAnamnesis` | `anamnesis.ts:41` | `.eq("id_paciente", patientId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getLatestVitalSigns` | `anamnesis.ts:120` | `.eq("id_paciente", patientId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getNotaClinica` | `clinico/nota-clinica.ts:42` | `.eq("id_encuentro", encuentroId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getSoapNotes` | `rehab/soap.ts:102` | `.eq("id_paciente", patientId)` | fce_notas_soap NO tiene id_clinica — filtrar via JOIN o subquery a fce_encuentros |
| `getEvaluaciones` | `rehab/evaluacion.ts:40` | `.eq("id_paciente", patientId)` | fce_evaluaciones NO tiene id_clinica — mismo patrón que soap |
| `getConsentimientos` | `consentimiento.ts:36` | `.eq("id_paciente", patientId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getPrescripcionesByPatient` | `prescripciones.ts:63` | `.eq("id_paciente", patientId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getPrescripcionById` | `prescripciones.ts:80` | `.eq("id", id)` | Agregar `.eq("id_clinica", idClinica)` |
| `getInstrumentosAplicados` | `clinico/instrumentos.ts:67` | `.eq("id_encuentro", encuentroId)` | Agregar `.eq("id_clinica", idClinica)` |
| `getEncuentroContext` | `encuentros.ts:157` | `.eq("id", id)` | Agregar `.eq("id_clinica", idClinica)` |
| `getAuditLogs` | `auditoria.ts:41` | Sin filtro id_clinica | Agregar `.eq("id_clinica", idClinica)` — la función requireAdmin() ya resuelve idClinica |
| `getPdfPatientData` | `exportar-pdf.ts:111` | Fetch paciente sin id_clinica | Agregar `.eq("id_clinica", idClinica)` al fetch inicial |

### 2.2 Actions de ESCRITURA sin cross-check

| Action | Archivo:línea | Fix |
|--------|--------------|-----|
| `updatePatient` | `patients.ts:211` | Agregar `.eq("id_clinica", idClinica)` al UPDATE |
| `upsertNotaClinica` (UPDATE path) | `clinico/nota-clinica.ts:104` | Agregar `.eq("id_clinica", idClinica)` al UPDATE |
| `signNotaClinica` | `clinico/nota-clinica.ts:170` | Agregar `.eq("id_clinica", idClinica)` al UPDATE |
| `signConsentimiento` | `consentimiento.ts:105` | Agregar `.eq("id_clinica", idClinica)` al UPDATE |
| `upsertAnamnesis` (UPDATE path) | `anamnesis.ts:75` | Agregar `.eq("id_clinica", idClinica)` al UPDATE |
| `createConsentimiento` | `consentimiento.ts:80` | Cambiar `idClinica ? { id_clinica } : {}` → siempre incluir `id_clinica: idClinica` (no condicional) |

### 2.3 Caso especial: fce_notas_soap y fce_evaluaciones (NO tienen id_clinica)

Estas tablas no tienen columna `id_clinica`. No se puede hacer `.eq("id_clinica")`.

**Opciones (elegir una):**

A) Filtrar via subquery en la action:
```typescript
// Obtener encuentros de la clínica, luego filtrar soap por esos encuentros
const { data: encuentroIds } = await supabase
  .from("fce_encuentros")
  .select("id")
  .eq("id_clinica", idClinica)
  .eq("id_paciente", patientId);

const ids = encuentroIds?.map(e => e.id) ?? [];
const { data: soaps } = await supabase
  .from("fce_notas_soap")
  .select("*")
  .in("id_encuentro", ids);
```

B) Dejar como está — RLS ya filtra via JOIN en la policy de DB. Documentar que la defensa es solo RLS.

**Recomendación: opción B** — el RLS ya cubre, y la opción A agrega complejidad y un round-trip extra. Documentar la decisión con comentario en el código.

---

## 3. NOTA SOBRE `signSoapNote` en `rehab/soap.ts:197`

Verificar si hace UPDATE sin filtro de tenant. Si fce_notas_soap no tiene id_clinica, el único guard es RLS (ya fijado en Fix 2 de la migration). Documentar con comentario.

---

## 4. HOUSEKEEPING

- Agregar comentario en `lib/supabase/service.ts` advirtiendo que service-role bypassa RLS
- En cada action que ya tiene el patrón correcto, verificar que `getIdClinica()` se llama ANTES de cualquier query de datos (no después)
- `npm run build` con 0 errores al final

---

## 5. ACTUALIZAR CLAUDE.md

En la sección "DB aplicada (fuera de sprints)", agregar:

```
| Fix RLS tenant isolation (5 policies) + versionar get_clinica_ids_for_user | 2026-06-06 |
```

En "Deuda técnica", marcar como resuelta:
- ~~Migración RLS pendiente 20260601_01~~ → reemplazada por 20260606_02

---

## 6. REGLAS PARA CLAUDE CODE

- NO aplicar migrations — ya están aplicadas en DB
- Solo copiar los .sql al directorio de migrations del repo
- `npm run build` = 0 errores al final
- No tocar actions dentales (`dental/*`) — ya tienen el patrón correcto
- No tocar `copiloto-nota.ts`, `resumen-ia.ts`, `timeline.ts` — ya son seguras
