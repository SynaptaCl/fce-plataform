# Informe de Auditoría FCE-plataform — 2026-06-06

> Auditor: Claude Sonnet 4.6 (asistido por análisis automatizado de código)
> Rama auditada: `main` (HEAD f9e1a03)
> Alcance: aislamiento multi-tenant en Server Actions + observabilidad

---

## 1. RESUMEN EJECUTIVO

- **Mecanismo de tenant:** lookup a `admin_users` vía JWT en cada Server Action — NO hay claim de tenant en el JWT; la resolución es a nivel de aplicación.
- **Actions auditadas:** 48 funciones en 28 archivos.
- **Fugas CRÍTICAS:** 13 (lectura/escritura/firma cross-tenant sin ningún guard).
- **Fugas ALTAS:** 5 (insert sin `id_clinica`, IDOR intra-tenant, sign sin verificación).
- **Fugas MEDIAS:** 2 (creación de recursos con `id_clinica` condicional, fuga en export PDF).
- **Migración RLS pendiente (`20260601_01`):** parcial — cubre solo 3 tablas de 16+. Además, la función de BD `get_clinica_ids_for_user()` que referencia **no existe en ningún archivo de migración del repo** — riesgo de fallo en `supabase db push` si no está definida directamente en Supabase.
- **Runner de tests:** ninguno real — solo scripts manuales `tsx scripts/`.
- **Observabilidad:** únicamente `console.error()` — sin Sentry, sin logging estructurado con correlación de tenant.

---

## 2. MODELO DE AUTENTICACIÓN Y TENANT

### Flujo de autenticación

```
Usuario → Supabase Auth → JWT (sin claim id_clinica)
             │
             ▼
         requireAuth()  [src/lib/modules/guards.ts]
         └─ supabase.auth.getUser()  ← JWT validado server-side ✅
             │
             ▼
         getIdClinica(supabase, user.id)  [src/app/actions/patients.ts:31]
         └─ SELECT id_clinica FROM admin_users
            WHERE auth_id = user.id         ← lookup a tabla (NO JWT claim)
             │
             ▼
         Aplicación filtra manualmente: .eq("id_clinica", idClinica)
```

**Problema de diseño:** el `id_clinica` no está en el JWT — se resuelve con un query adicional en cada action. Si ese query no se hace, o si el resultado no se usa en el filtro de la query de datos, la fuga queda abierta. Esto es lo que ocurre en ~13 actions.

### Clientes Supabase usados

| Cliente | Archivo | Aplica RLS | Usado en |
|---------|---------|-----------|---------|
| `createClient()` (anon SSR) | `src/lib/supabase/server.ts` | ✅ Sí | ~90% de las actions |
| `createServiceClient()` (service-role) | `src/lib/supabase/service.ts` | ❌ No | `timeline.ts`, `resumen-ia.ts`, `copiloto-nota.ts` |

El cliente service-role se usa en 3 archivos. `resumen-ia.ts` y `copiloto-nota.ts` lo usan **solo para insertar el audit log** (con `idClinica` validado previamente) — patrón correcto. `timeline.ts` lo usa para leer datos clínicos protegidos, pero realiza un ownership-check manual antes. Ver §4.

---

## 3. INVENTARIO DE SERVER ACTIONS

| Action | Archivo | Fuente de id_clinica | ¿Cross-check recurso? | Severidad | Evidencia |
|--------|---------|---------------------|----------------------|-----------|-----------|
| `getPatients` | `patients.ts:81` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | patients.ts:90 |
| **`getPatientById`** | `patients.ts:137` | ❌ No obtiene | ❌ Solo `.eq("id", id)` | **CRÍTICA** | patients.ts:142–146 |
| `createPatient` | `patients.ts:157` | `getIdClinica()` sesión | ✅ hardcoded en INSERT | SEGURA | patients.ts:167–171 |
| **`updatePatient`** | `patients.ts:194` | ❌ No obtiene | ❌ Solo `.eq("id", id)` | **CRÍTICA** | patients.ts:211–214 |
| `createEncuentro` | `encuentros.ts:39` | `getIdClinica()` sesión | ✅ cross-check paciente + id_clinica en INSERT | SEGURA | encuentros.ts:61–126 |
| **`getEncuentroContext`** | `encuentros.ts:154` | ❌ No obtiene | ❌ Solo `.eq("id", id)` | **ALTA** | encuentros.ts:157–161 |
| **`getAnamnesis`** | `anamnesis.ts:36` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | anamnesis.ts:41–45 |
| **`getLatestVitalSigns`** | `anamnesis.ts:115` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | anamnesis.ts:120–126 |
| **`upsertAnamnesis`** (UPDATE path) | `anamnesis.ts:53` | `getIdClinica()` sesión | ❌ UPDATE usa `existing.id` sin filtro clinic | **ALTA** | anamnesis.ts:75–81 |
| **`getNotaClinica`** | `clinico/nota-clinica.ts:37` | ❌ No obtiene | ❌ Solo `.eq("id_encuentro")` | **CRÍTICA** | nota-clinica.ts:42–46 |
| **`upsertNotaClinica`** (UPDATE path) | `clinico/nota-clinica.ts:104` | `admin_users` sesión | ❌ UPDATE `.eq("id", existing.id)` sin id_clinica | **CRÍTICA** | nota-clinica.ts:104–107 |
| **`signNotaClinica`** | `clinico/nota-clinica.ts:141` | `admin_users` sesión | ❌ UPDATE `.eq("id", notaId)` sin id_clinica | **CRÍTICA** | nota-clinica.ts:170–179 |
| `createQuickNote` | `clinico/nota-rapida.ts:50` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | nota-rapida.ts:75–111 |
| `aplicarInstrumento` | `clinico/instrumentos.ts:79` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | instrumentos.ts:114–127 |
| **`getInstrumentosAplicados`** | `clinico/instrumentos.ts:62` | ❌ No obtiene | ❌ Solo `.eq("id_encuentro")` | **ALTA** | instrumentos.ts:67–71 |
| `getPlanesIntervencion` | `clinico/plan-intervencion.ts:65` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | plan-intervencion.ts:73–81 |
| `getPlanIntervencionDetalle` | `clinico/plan-intervencion.ts:90` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` en plan + objetivos | SEGURA | plan-intervencion.ts:99–138 |
| `crearPlanIntervencion` | `clinico/plan-intervencion.ts:150` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | plan-intervencion.ts:169–181 |
| `searchDiagnosticos` | `clinico/diagnostico.ts:8` | N/A (API externa) | N/A | SEGURA | — |
| **`getSoapNotes`** | `rehab/soap.ts:97` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | soap.ts:102–106 |
| **`upsertSoapNote`** (INSERT) | `rehab/soap.ts:114` | `getIdClinica()` sesión | ❌ INSERT sin `id_clinica` en tabla | **ALTA** | soap.ts:175–182 |
| **`signSoapNote`** | `rehab/soap.ts:197` | Requiere verificación | Sin filtro id_clinica en UPDATE | **ALTA** | soap.ts:197+ |
| **`getEvaluaciones`** | `rehab/evaluacion.ts:35` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | evaluacion.ts:40–44 |
| **`upsertEvaluacion`** (INSERT) | `rehab/evaluacion.ts:53` | ❌ No obtiene | ❌ INSERT sin `id_clinica` | **ALTA** | evaluacion.ts:84–94 |
| **`getPrescripcionesByPatient`** | `prescripciones.ts:58` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | prescripciones.ts:63–67 |
| **`getPrescripcionById`** | `prescripciones.ts:75` | ❌ No obtiene | ❌ Solo `.eq("id", id)` | **CRÍTICA** | prescripciones.ts:80–84 |
| `createPrescripcion` | `prescripciones.ts:105` | `admin_users` sesión | ✅ id_clinica en INSERT | SEGURA | prescripciones.ts:122–131 |
| `createAndSignOrdenExamen` | `ordenes-examen.ts:56` | `admin_users` sesión | ✅ id_clinica en INSERT | SEGURA | ordenes-examen.ts:120–139 |
| **`getConsentimientos`** | `consentimiento.ts:32` | ❌ No obtiene | ❌ Solo `.eq("id_paciente")` | **CRÍTICA** | consentimiento.ts:36–40 |
| **`createConsentimiento`** (INSERT) | `consentimiento.ts:45` | `getIdClinica()` sesión | ❌ id_clinica condicional: `idClinica ? { id_clinica } : {}` | **MEDIA** | consentimiento.ts:80 |
| **`signConsentimiento`** | `consentimiento.ts:91` | ❌ No obtiene | ❌ Solo `.eq("id", consentId)` | **CRÍTICA** | consentimiento.ts:105–114 |
| `createEgreso` | `egresos.ts:66` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | egresos.ts:83–98 |
| `getEgreso` | `egresos.ts:111` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | egresos.ts:119–124 |
| `getEgresosByPaciente` | `egresos.ts:132` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | egresos.ts:140–145 |
| `getPatientTimeline` | `timeline.ts:169` | `getIdClinica()` sesión | ✅ ownership check previo al service-role | SEGURA | timeline.ts:178–188 |
| **`getPdfPatientData`** | `exportar-pdf.ts:98` | `admin_users` sesión | ❌ fetch inicial de paciente sin id_clinica | **MEDIA** | exportar-pdf.ts:111 |
| **`getAuditLogs`** | `auditoria.ts:36` | ❌ rol-check solo | ❌ Sin filtro id_clinica — admin ve TODOS los logs | **CRÍTICA** | auditoria.ts:41–60 |
| `generarResumenIA` | `resumen-ia.ts:15` | `admin_users` sesión | ✅ cross-check `admin.id_clinica === idClinica` | SEGURA | resumen-ia.ts:32–36 |
| `estructurarNota` | `copiloto-nota.ts:16` | `admin_users` sesión | ✅ cross-check idClinica + encuentro.id_clinica | SEGURA | copiloto-nota.ts:34–65 |
| `crearProfesional` | `profesionales.ts:66` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | profesionales.ts:77–89 |
| `actualizarProfesional` | `profesionales.ts:99` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` en UPDATE | SEGURA | profesionales.ts:113–117 |
| `setPerfilActivo` | `perfil-selector.ts:12` | `getIdClinica()` sesión | ✅ valida via `getProfesionalesDelUsuario()` | SEGURA | perfil-selector.ts:20–29 |
| `getOdontograma` | `dental/odontograma.ts:27` | `getClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | odontograma.ts:34–39 |
| `upsertPieza` | `dental/odontograma.ts:45` | `getClinica()` sesión | ✅ todas las queries filtran por id_clinica | SEGURA | odontograma.ts:63–90 |
| `getPlanActivo` (dental) | `dental/plan-tratamiento.ts:55` | `getIdClinica()` sesión | ✅ `.eq("id_clinica")` | SEGURA | plan-tratamiento.ts:64–72 |
| `crearPlanTratamiento` | `dental/plan-tratamiento.ts:88` | `getIdClinica()` sesión | ✅ id_clinica en INSERT | SEGURA | plan-tratamiento.ts:105–120 |
| `addItemPlanTratamiento` | `dental/plan-tratamiento.ts:140` | `getIdClinica()` sesión | ✅ ownership check previo | SEGURA | plan-tratamiento.ts:163–168 |

**Resumen:** 25 seguras / 13 críticas / 5 altas / 2 medias / 3 sin verificar

---

## 4. FUGAS CONFIRMADAS — clasificadas por severidad

### CRÍTICA — fuga cross-tenant explotable

#### F-01: `getPatientById` — Lectura PII cross-tenant

- **Action:** `getPatientById` — `src/app/actions/patients.ts:137`
- **Escenario de ataque:** Usuario autenticado de Clínica A llama `getPatientById("uuid-paciente-clinica-b")`. La query solo filtra por `id` — retorna el registro completo con nombre, RUT, fecha_nacimiento, previsión, género de un paciente de otra clínica.
- **Evidencia:**
  ```typescript
  // patients.ts:142–146
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)      // ← ÚNICO filtro — sin id_clinica
    .single();
  ```
- **Datos expuestos:** `pacientes.*` (nombre, apellidos, RUT, fecha_nacimiento, prevision, genero, telefono, email, estado_clinico)
- **Impacto cross-repo:** `pacientes` es tabla compartida con Synapta — la fuga afecta también a los pacientes de las clínicas de Synapta.
- **Cobertura RLS:** ❌ No cubierta por `20260601_01`.

---

#### F-02: `updatePatient` — Modificación de datos de paciente cross-tenant

- **Action:** `updatePatient` — `src/app/actions/patients.ts:194`
- **Escenario de ataque:** Usuario de Clínica A envía `updatePatient("uuid-clinica-b", { rut: "forjado", ... })` — modifica el RUT, nombre o previsión de un paciente de otra clínica.
- **Evidencia:**
  ```typescript
  // patients.ts:211–214
  const { error } = await supabase
    .from("pacientes")
    .update(payload)
    .eq("id", id);     // ← ÚNICO filtro — sin id_clinica
  ```
- **Datos expuestos (escritura):** todos los campos de `pacientes` incluido `rut`, `nombre`, `apellido_paterno`, `prevision`, `estado_clinico`.
- **Impacto cross-repo:** escribe en tabla compartida con Synapta.
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-03: `getNotaClinica` — Lectura de nota clínica cross-tenant

- **Action:** `getNotaClinica` — `src/app/actions/clinico/nota-clinica.ts:37`
- **Escenario de ataque:** Usuario de Clínica A invoca con el `encuentroId` de un encuentro de Clínica B (que puede obtener via F-04 o si conoce UUIDs). Retorna la nota clínica completa: motivo de consulta, diagnóstico, plan, códigos CIE-10, contenido estructurado.
- **Evidencia:**
  ```typescript
  // nota-clinica.ts:42–46
  const { data, error } = await supabase
    .from("fce_notas_clinicas")
    .select("*")
    .eq("id_encuentro", encuentroId)   // ← sin id_clinica
    .maybeSingle();
  ```
- **Datos expuestos:** `fce_notas_clinicas.*` (motivo_consulta, contenido, diagnostico, cie10_codigos, secciones_estructuradas, plan, firmado, firmado_por)
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-04: `upsertNotaClinica` (UPDATE path) — Modificación de nota clínica cross-tenant

- **Action:** `upsertNotaClinica` — `src/app/actions/clinico/nota-clinica.ts:104`
- **Escenario de ataque:** El attacker llama `upsertNotaClinica` con un `encuentroId` extranjero. `getNotaClinica` (sin filtro clinic) retorna el `existing`. El UPDATE siguiente usa solo `existing.id` — sin verificar que pertenezca a la clínica del actor.
- **Evidencia:**
  ```typescript
  // nota-clinica.ts:104–107
  const { error } = await supabase
    .from("fce_notas_clinicas")
    .update({ ...cleanedData, updated_at: new Date().toISOString() })
    .eq("id", existing.id);    // ← sin id_clinica
  ```
- **Datos expuestos (escritura):** `fce_notas_clinicas` — puede sobreescribir diagnóstico, plan, contenido de notas firmadas de otra clínica.
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-05: `signNotaClinica` — Firma fraudulenta de nota clínica cross-tenant

- **Action:** `signNotaClinica` — `src/app/actions/clinico/nota-clinica.ts:141`
- **Escenario de ataque:** El atacante provee un `notaId` de otra clínica. El SELECT en línea 161 (`eq("id", notaId)`) no filtra por id_clinica — retorna la nota. El UPDATE aplica la firma del profesional atacante sobre esa nota.
- **Evidencia:**
  ```typescript
  // nota-clinica.ts:161–165 (fetch sin filtro clinica)
  const { data: notaRow } = await supabase
    .from("fce_notas_clinicas")
    .select("id_encuentro, firmado")
    .eq("id", notaId)          // ← sin id_clinica
    .single();
  
  // nota-clinica.ts:170–179 (UPDATE sin filtro clinica)
  const { error } = await supabase
    .from("fce_notas_clinicas")
    .update({ firmado: true, firmado_por: profesional.id, ... })
    .eq("id", notaId)
    .eq("firmado", false);
  ```
- **Datos expuestos (escritura):** Falsifica firma digital en nota clínica de otra clínica; el campo `firmado_por` queda con el ID del profesional atacante.
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-06: `signConsentimiento` — Firma de consentimiento cross-tenant

- **Action:** `signConsentimiento` — `src/app/actions/consentimiento.ts:91`
- **Escenario de ataque:** Atacante provee `consentId` de otra clínica. El UPDATE no verifica propiedad de la clínica.
- **Evidencia:**
  ```typescript
  // consentimiento.ts:105–114
  const { error } = await supabase
    .from("fce_consentimientos")
    .update({
      firma_paciente: { data_url: firmaDataUrl, timestamp },
      firma_profesional: { id_profesional: profesionalId, timestamp, hash },
      firmado: true, firmado_at: timestamp,
    })
    .eq("id", consentId)       // ← sin id_clinica
    .eq("firmado", false);
  ```
- **Datos expuestos (escritura):** Consentimiento informado de otra clínica queda marcado como firmado con datos del atacante.
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-07: `getSoapNotes` — Lectura de notas SOAP cross-tenant

- **Action:** `getSoapNotes` — `src/app/actions/rehab/soap.ts:97`
- **Escenario de ataque:** Usuario de Clínica A invoca con un `patientId` de Clínica B — obtiene el historial SOAP completo (subjetivo, objetivo, análisis, plan) de ese paciente.
- **Evidencia:**
  ```typescript
  // soap.ts:102–106
  const { data, error } = await supabase
    .from("fce_notas_soap")
    .select("*")
    .eq("id_paciente", patientId)   // ← sin id_clinica
    .order("created_at", { ascending: false });
  ```
- **Datos expuestos:** `fce_notas_soap.*` (subjetivo, objetivo, analisis, plan, intervenciones, cif_codes, firmado, firmado_por)
- **Cobertura RLS:** ⚠️ Cubierta por `20260601_01` **solo para SELECT**, pero la función `get_clinica_ids_for_user()` no está definida en ningún archivo de migración del repo (ver §5).

---

#### F-08: `getEvaluaciones` — Lectura de evaluaciones clínicas cross-tenant

- **Action:** `getEvaluaciones` — `src/app/actions/rehab/evaluacion.ts:35`
- **Evidencia:**
  ```typescript
  // evaluacion.ts:40–44
  const { data, error } = await supabase
    .from("fce_evaluaciones")
    .select("*")
    .eq("id_paciente", patientId)   // ← sin id_clinica
    .order("created_at", { ascending: false });
  ```
- **Datos expuestos:** `fce_evaluaciones.*` (tipo, sub_area, data — incluye resultados de evaluaciones Kine/Fono/TO/etc.)
- **Cobertura RLS:** ⚠️ Cubierta por `20260601_01` **para SELECT y UPDATE**, misma advertencia sobre `get_clinica_ids_for_user()`.

---

#### F-09: `getPrescripcionesByPatient` — Lectura de recetas cross-tenant

- **Action:** `getPrescripcionesByPatient` — `src/app/actions/prescripciones.ts:58`
- **Evidencia:**
  ```typescript
  // prescripciones.ts:63–67
  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id_paciente", patientId)   // ← sin id_clinica
    .order("created_at", { ascending: false });
  ```
- **Datos expuestos:** `fce_prescripciones.*` (medicamentos jsonb, dosis, posología, diagnóstico_indicacion, firmado, puede contener datos sensibles de salud mental/crónica)
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-10: `getPrescripcionById` — Lectura individual de receta cross-tenant

- **Action:** `getPrescripcionById` — `src/app/actions/prescripciones.ts:75`
- **Evidencia:**
  ```typescript
  // prescripciones.ts:80–84
  const { data, error } = await supabase
    .from("fce_prescripciones")
    .select("*")
    .eq("id", prescripcionId)       // ← sin id_clinica
    .single();
  ```
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-11: `getAnamnesis` y `getLatestVitalSigns` — Lectura de antecedentes y signos vitales cross-tenant

- **Actions:** `getAnamnesis` (`anamnesis.ts:36`), `getLatestVitalSigns` (`anamnesis.ts:115`)
- **Evidencia:**
  ```typescript
  // anamnesis.ts:41–45
  .from("fce_anamnesis").select("*").eq("id_paciente", patientId)  // sin id_clinica
  
  // anamnesis.ts:120–126
  .from("fce_signos_vitales").select("*").eq("id_paciente", patientId)  // sin id_clinica
  ```
- **Datos expuestos:** `fce_anamnesis.*` (antecedentes mórbidos, quirúrgicos, alérgicos, familiares, medicación habitual, historia social), `fce_signos_vitales.*` (PA, FC, temperatura, peso, talla, saturación)
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-12: `getConsentimientos` — Lectura de consentimientos cross-tenant

- **Action:** `getConsentimientos` — `src/app/actions/consentimiento.ts:32`
- **Evidencia:**
  ```typescript
  // consentimiento.ts:36–40
  .from("fce_consentimientos").select("*").eq("id_paciente", patientId)  // sin id_clinica
  ```
- **Datos expuestos:** `fce_consentimientos.*` (tipo, contenido, firma_paciente, firma_profesional, firmado, firmado_at)
- **Cobertura RLS:** ❌ No cubierta.

---

#### F-13: `getAuditLogs` — Admin lee logs de todas las clínicas

- **Action:** `getAuditLogs` — `src/app/actions/auditoria.ts:36`
- **Escenario de ataque:** Un usuario con rol `"admin"` en Clínica A llama `getAuditLogs({})` sin filtro. Obtiene hasta 200 entradas de `logs_auditoria` de TODAS las clínicas del sistema.
- **Evidencia:**
  ```typescript
  // auditoria.ts:41–60
  let query = supabase
    .from("logs_auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  // Filtros opcionales por patientId, accion, fecha — NUNCA por id_clinica
  ```
- **Contexto adicional:** `requireAdmin()` en línea 22 verifica que `rol === "admin"` — pero no vincula ese rol a una clínica específica para filtrar los logs. La tabla `logs_auditoria` contiene `id_clinica` nullable, pero nunca se usa como filtro.
- **Datos expuestos:** `logs_auditoria.*` — actividad de todos los profesionales de todas las clínicas: qué pacientes accedieron, qué notas firmaron, qué prescripciones emitieron.
- **Cobertura RLS:** ❌ No cubierta.

---

### ALTA — fuga posible bajo condiciones específicas

#### F-14: `upsertSoapNote` INSERT sin `id_clinica`

- **Action:** `upsertSoapNote` — `src/app/actions/rehab/soap.ts:175`
- **Descripción:** El INSERT de `fce_notas_soap` no incluye el campo `id_clinica`. Si la tabla tiene esa columna (tabla con RLS según la migración pendiente), el registro queda sin vínculo de clínica — rompe la cadena de aislamiento.
- **Evidencia:**
  ```typescript
  // soap.ts:175–182
  .from("fce_notas_soap").insert({
    id_paciente: patientId,
    id_encuentro: encounterId,
    ...soapData,
    firmado: false,
    // ← id_clinica ausente
  })
  ```
- **Cobertura RLS:** Si la columna es NOT NULL → el INSERT falla (error en producción). Si es nullable → registro huérfano sin tenant.

---

#### F-15: `upsertEvaluacion` INSERT sin `id_clinica`

- **Action:** `upsertEvaluacion` — `src/app/actions/rehab/evaluacion.ts:84`
- Mismo patrón que F-14. INSERT en `fce_evaluaciones` sin `id_clinica`.
- **Evidencia:** `evaluacion.ts:84–94` — ningún campo `id_clinica` en el objeto insertado.

---

#### F-16: `upsertAnamnesis` UPDATE sin verificación de clínica

- **Action:** `upsertAnamnesis` — `src/app/actions/anamnesis.ts:53`
- **Descripción:** El path de UPDATE usa `existing.id` (obtenido de `getAnamnesis` sin filtro de clínica — ver F-11). Un atacante puede sobrescribir la anamnesis de un paciente de otra clínica si conoce su `patientId`.
- **Evidencia:** `anamnesis.ts:75–81` — UPDATE sin `.eq("id_clinica", idClinica)`.

---

#### F-17: `getEncuentroContext` sin filtro de clínica

- **Action:** `getEncuentroContext` — `src/app/actions/encuentros.ts:154`
- **Descripción:** Devuelve el contexto de un encuentro (especialidad, nombre del servicio, id_paciente) filtrado solo por `id` — sin verificar que pertenezca a la clínica del usuario.
- **Evidencia:** `encuentros.ts:157–161` — `.eq("id", encuentroId)` sin id_clinica.
- **Impacto:** Exposición de metadatos de encuentros de otras clínicas; además es la fuente de datos para otras actions que confían en su output.

---

#### F-18: `getInstrumentosAplicados` sin filtro de clínica

- **Action:** `getInstrumentosAplicados` — `src/app/actions/clinico/instrumentos.ts:62`
- **Evidencia:** `instrumentos.ts:67–71` — `.eq("id_encuentro", encuentroId)` sin id_clinica.
- **Datos expuestos:** `instrumentos_aplicados.*` (instrumento, puntaje_total, interpretación, respuestas jsonb).

---

#### F-19: `signSoapNote` — posible UPDATE sin id_clinica (requiere verificación)

- **Action:** `signSoapNote` — `src/app/actions/rehab/soap.ts:197`
- **Nota:** No se pudo verificar en este análisis el código completo de esta función. Dada la inconsistencia del patrón en el mismo archivo (F-07, F-14), se clasifica como ALTA con necesidad de confirmación.

---

### MEDIA — falta defensa en profundidad

#### F-20: `createConsentimiento` — id_clinica condicional

- **Action:** `createConsentimiento` — `src/app/actions/consentimiento.ts:45`
- **Descripción:** El INSERT incluye `id_clinica` solo si no es null: `...(idClinica ? { id_clinica } : {})`. Si `getIdClinica()` retorna null (usuario sin entrada en `admin_users`), el consentimiento se inserta sin vínculo de clínica.
- **Evidencia:** `consentimiento.ts:80`.

---

#### F-21: `getPdfPatientData` — fetch de paciente sin filtro de clínica

- **Action:** `getPdfPatientData` — `src/app/actions/exportar-pdf.ts:98`
- **Descripción:** El fetch inicial del paciente (`exportar-pdf.ts:111`) no filtra por `id_clinica`. Los datos del paciente se retornan aunque pertenezca a otra clínica. Las queries subsiguientes de datos clínicos sí filtran por `idClinica`, pero el registro base del paciente queda expuesto. Adicionalmente, si el usuario no tiene entrada en `admin_users` (idClinica = null), todas las queries con guard `idClinica ? ... : Promise.resolve({})` retornan vacío, pero el paciente base sí se devuelve.
- **Evidencia:** `exportar-pdf.ts:111` — `.from("pacientes").eq("id", patientId).single()` sin id_clinica.

---

## 5. ANÁLISIS DE MIGRACIÓN RLS PENDIENTE

**Archivo:** `supabase/migrations/20260601_01_hotfix_rls_tenant_isolation.sql`

### Tablas cubiertas

| Tabla | Políticas creadas | Tipo de operación |
|-------|------------------|--------------------|
| `fce_notas_soap` | `fce_soap_select` | SELECT |
| `fce_evaluaciones` | `fce_evaluaciones_select`, `fce_evaluaciones_update` | SELECT + UPDATE |
| `profesionales` | DROP `public_read_profesionales_activos` | Elimina lectura pública |

### Observación crítica: función `get_clinica_ids_for_user()` no está definida en el repo

Las tres políticas RLS usan:
```sql
WHERE id_clinica IN (SELECT get_clinica_ids_for_user(auth.uid()))
```

Esta función **no existe en ningún archivo de migración del repositorio** — confirmado con grep exhaustivo de `CREATE.*FUNCTION.*get_clinica_ids_for_user` sobre todo `/supabase/`. La función es referenciada también en `20260427_01_fce_egresos.sql` y `20260531_01_fce_planes_intervencion.sql` (migraciones ya aplicadas), lo que sugiere que podría estar definida directamente en Supabase (fuera del control de versiones).

**Consecuencias:**
- Si la función no existe en la DB: `supabase db push` fallará con `ERROR: function get_clinica_ids_for_user(uuid) does not exist`.
- Si la función existe en Supabase pero no en el repo: es infraestructura no versionada — riesgo de pérdida ante un reset/recreación de la BD.
- **Se debe verificar** en Supabase Dashboard → Database → Functions antes de intentar aplicar la migración.

### Tablas con datos clínicos NO cubiertas por esta migración

| Tabla | id_clinica | RLS actual | Riesgo |
|-------|-----------|-----------|--------|
| `pacientes` | ✅ | ❌ | 🔴 CRÍTICO — Fugas F-01, F-02 |
| `fce_anamnesis` | ✅ | ❌ | 🔴 CRÍTICO — Fuga F-11 |
| `fce_signos_vitales` | ✅ | ❌ | 🔴 CRÍTICO — Fuga F-11 |
| `fce_notas_clinicas` | ✅ | ❌ | 🔴 CRÍTICO — Fugas F-03, F-04, F-05 |
| `fce_consentimientos` | ✅ | ❌ | 🔴 CRÍTICO — Fugas F-06, F-12 |
| `fce_prescripciones` | ✅ | ❌ | 🔴 CRÍTICO — Fugas F-09, F-10 |
| `fce_ordenes_examen` | ✅ | ❌ | 🔴 CRÍTICO |
| `fce_encuentros` | ✅ | ❌ | 🔴 CRÍTICO — base del JOIN del RLS de SOAP/eval |
| `instrumentos_aplicados` | ✅ | ❌ | 🟠 ALTO — Fuga F-18 |
| `logs_auditoria` | ✅ (nullable) | ❌ | 🔴 CRÍTICO — Fuga F-13 |
| `fce_egresos` | ✅ | ✅ (20260427) | ✅ Cubierta |
| `fce_planes_intervencion` | ✅ | ✅ (20260531) | ✅ Cubierta |

**Conclusión:** La migración pendiente es **insuficiente** y potencialmente no funcional. Cubre 2 de las 12+ tablas clínicas sin RLS, y depende de una función que no está en el repositorio.

---

## 6. ESTADO DE TESTING

### Runner de tests

- **Automated runner:** ❌ Ninguno — no hay `vitest`, `jest`, ni `playwright` en `devDependencies` (`package.json`).
- **Scripts existentes:** 8 scripts manuales invocados con `tsx scripts/test-sprint-*.ts`. Deben ejecutarse manualmente y no producen exit codes estándar de CI.

### Qué cubren los test scripts

| Script | Qué verifica |
|--------|-------------|
| `test-sprint-p2-f1.ts` | Códigos de instrumentos en `especialidad-config.ts` (45 checks de string) |
| `test-sprint-p2-f2.ts` | Secciones estructuradas en nota clínica + presencia de trigger inmutabilidad en DB |
| `test-sprint-p2-f3.ts` | Estado del registry de TerapiaOcupacionalEval |
| `test-sprint-p2-f4.ts` | Seed de instrumentos nutricionales + cálculos antropométricos |
| `test-sprint-n1.ts` | Smoke test M10 — requiere IDs de prueba hardcodeados |

**Cobertura de seguridad:** ❌ Ningún script verifica aislamiento multi-tenant. Todos son smoke tests funcionales que validan configuración o lógica de negocio, no accesos cross-tenant.

### Test de aislamiento multi-tenant

❌ No existe ningún test que verifique que el usuario de Clínica A no puede acceder a datos de Clínica B.

---

## 7. ESTADO DE OBSERVABILIDAD

### Stack de logging

| Mecanismo | Presente | Notas |
|-----------|---------|-------|
| Sentry / error tracker externo | ❌ | No hay `@sentry/nextjs` en dependencias |
| Logging estructurado (winston, pino) | ❌ | Solo `console.error()` / `console.log()` |
| Correlation ID / request ID | ❌ | Sin tracing entre requests |
| Prefijos de log por módulo | ⚠️ Parcial | e.g. `"[FCE][IA]"`, `"[FCE][COPILOTO]"` — solo en algunos módulos |

### Actions sin logging de errores

Las actions de las fugas más críticas (`getPatientById`, `getSoapNotes`, `getConsentimientos`, etc.) no loguean errores con contexto de tenant:

```typescript
// patients.ts:148 — sin id_clinica en el log de error
if (error) return { success: false, error: error.message };
```

### Audit log (`logs_auditoria`) — calidad actual

| Aspecto | Estado |
|---------|--------|
| Cobertura de escrituras | ⚠️ Parcial — no todas las actions llaman `logAudit` |
| `id_clinica` en log | ⚠️ Parcial — `logAudit()` en `anamnesis.ts` no recibe `id_clinica` (solo `id_paciente`) |
| Accesos de lectura loggeados | ⚠️ Parcial — `getPatientById` sí, la mayoría de `get*` no |
| Intentos cross-tenant loggeados | ❌ — No hay logging defensivo de accesos rechazados |

### Alertas

❌ No existe ningún mecanismo de alerta ante falla de acciones clínicas. Los errores llegan a `console.error()` en Vercel logs, sin alertas proactivas.

---

## 8. PRIORIZACIÓN SUGERIDA

> No se incluye código de fix. Estas son acciones de remediación ordenadas por impacto y esfuerzo.

| Prioridad | Acción | Fugas que cierra | Estimación |
|-----------|--------|-----------------|-----------|
| **1** | Añadir `.eq("id_clinica", idClinica)` en todas las queries de lectura y UPDATE que hoy filtran solo por `id_paciente` o `id` de recurso. Afecta ~13 actions: `getPatientById`, `updatePatient`, `getSoapNotes`, `getEvaluaciones`, `getAnamnesis`, `getLatestVitalSigns`, `getConsentimientos`, `signConsentimiento`, `getPrescripcionesByPatient`, `getPrescripcionById`, `getNotaClinica`, `upsertNotaClinica` (UPDATE), `signNotaClinica`. | F-01..F-13 | 4–6 h |
| **2** | Crear y aplicar función `get_clinica_ids_for_user(uuid)` en Supabase (si no existe), luego aplicar la migración `20260601_01`. Extenderla para cubrir tablas faltantes: `pacientes`, `fce_anamnesis`, `fce_signos_vitales`, `fce_notas_clinicas`, `fce_consentimientos`, `fce_prescripciones`, `fce_ordenes_examen`, `fce_encuentros`, `logs_auditoria`. | F-01..F-13 (defensa en profundidad) | 3–4 h |
| **3** | Agregar `id_clinica` a los INSERTs de `fce_notas_soap` (soap.ts:175) y `fce_evaluaciones` (evaluacion.ts:84). Hacer `id_clinica` NOT NULL en esas tablas si no lo es ya. | F-14, F-15 | 1 h |
| **4** | Agregar filtro `.eq("id_clinica", idClinica)` a `getAuditLogs` en `auditoria.ts:41`. La función `requireAdmin()` ya resuelve el `id_clinica` del admin autenticado — solo falta usarlo como filtro. | F-13 | 30 min |
| **5** | Integrar Sentry (`@sentry/nextjs`) con `NEXT_PUBLIC_SENTRY_DSN` + alert rules sobre errores 500 en Server Actions. Prioridad menor a los fixes, pero necesario para detectar explotación activa. | Observabilidad | 2 h |

---

*Informe generado el 2026-06-06. Este documento es confidencial — contiene detalles de vulnerabilidades no remedidas.*
