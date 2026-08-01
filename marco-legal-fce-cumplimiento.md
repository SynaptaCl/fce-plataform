# Marco Legal FCE — Referencia de Cumplimiento Normativo

> Generado: 2026-07-31. Uso: referencia para Claude Code al auditar cumplimiento legal del repo `fce-plataform`. No reemplaza asesoría legal — items `[LEGAL]` requieren confirmación de abogado, no son verificables por código.
> Mantener actualizado: revisar cuando MINSAL publique el reglamento de Ley 21.668 (pendiente a esta fecha) o cambie el estado de implementación de Ley 21.719.

## Cómo usar este documento

Cada requisito tiene una etiqueta:
- `[CÓDIGO]` — verificable revisando/grepeando el repo.
- `[LEGAL]` — decisión organizacional o contractual, no está en el código.
- `[VERIFICAR]` — estado desconocido a la fecha de este doc. No asumir cumplimiento sin confirmar.

---

## 1. Ley 20.584 + Decreto 41 — Derechos y Deberes del Paciente / Ficha Clínica

### 1.1 Confidencialidad y acceso restringido
Solo accede a la ficha el paciente, su representante, profesionales tratantes, y terceros autorizados por ley (tribunales, fiscalía, autoridad sanitaria).

- `[CÓDIGO]` RLS en toda tabla `fce_*` filtrando por `id_clinica` / relación profesional-paciente. Ver `supabase/migrations/20260606_02_fix_rls_tenant_isolation_5_policies.sql` y policies posteriores.
- `[CÓDIGO]` Recepcionista sin acceso a FCE — `requireAccesoFCE(rol)` en `guards.ts`, no el `permissions.ts` legacy.
- Deuda conocida: inyección `.or()` en catálogos (`examenes_catalogo`/`medicamentos`) y periograma sin guard `id_clinica` a nivel app (solo RLS) — ambos pendientes en CLAUDE.md §14.

### 1.2 Contenido mínimo de la ficha
Identificación del paciente, anamnesis, evolución, diagnósticos, tratamientos, consentimientos.

- `[CÓDIGO]` M1 (pacientes), M2 (anamnesis), notas SOAP/clínicas, diagnóstico ICD-11/CIE-10, M5 (consentimiento) — confirmar cobertura en cada modelo (`rehabilitacion`, `clinico_general`, `odontologico`).

### 1.3 Inmutabilidad de registros firmados
La ficha no se altera una vez firmada; toda corrección queda trazada, no reemplaza el original.

- `[CÓDIGO]` Triggers `trg_block_update_signed_*` en soap, nota_clinica, periograma, consentimiento, prescripción, orden de examen.
- `[CÓDIGO]` Sistema de adendas/erratas/anulaciones (`fce_adendas`, sprints A0/A1) — nunca edita el original, todo aditivo.
- `[VERIFICAR]` Nota de coherencia pendiente en CLAUDE.md: confirmar si el trigger de `fce_notas_clinicas` cubre `icd_codigos` y `secciones_estructuradas` (agregadas después del trigger original) — riesgo de edición post-firma no bloqueada.

### 1.4 Conservación mínima de 15 años
- `[VERIFICAR]` No hay política de retención/archivado visible en el repo. Es un mínimo, no un máximo — el riesgo real es que algún job de limpieza o TTL borre datos antes de tiempo. Confirmar que no existe ninguno.

### 1.5 Consentimiento informado
- `[CÓDIGO]` M5 `fce_consentimientos`, `ConsentManager`, firma canvas, RLS con policy UPDATE (fix 2026-06-06).

---

## 2. Ley 21.668 — Interoperabilidad de Fichas Clínicas (modifica Ley 20.584)

Publicada 28-may-2024. MINSAL debe actualizar el reglamento del art. 13 (estándar técnico) en 18 meses desde la entrada en vigencia. **A la fecha de este documento, el reglamento sigue sin publicarse formalmente.** El estándar más probable es HL7 FHIR R4, pero no está confirmado oficialmente — no tratar como definitivo.

### 2.1 Capacidad de interoperar
- `[CÓDIGO]` `src/lib/fhir-mapper.ts` + ruta `/dashboard/pacientes/[id]/fhir`. Confirmar qué resources cubre (mínimo esperado internacionalmente: Patient, Encounter, Observation, Condition, MedicationRequest).
- `[VERIFICAR]` El mapper actual, ¿es exportación/visualización unidireccional o expone algo consultable por terceros? La ley apunta a acceso oportuno bidireccional entre prestadores, no solo export propio.

### 2.2 Acceso oportuno entre prestadores
- `[LEGAL]` `[VERIFICAR]` No aplicable de forma exigible aún — depende del reglamento no publicado. **No construir infraestructura de intercambio activo (API expuesta a terceros prestadores) hasta que el estándar esté confirmado** — riesgo de construir contra un target que puede cambiar.

### 2.3 Conservación reforzada
Igual a 1.4 (15 años).

### 2.4 Riesgo de scope
- `[LEGAL]` No sobre-invertir en cumplimiento fino de 21.668 mientras el reglamento no esté publicado. Mantener la capacidad exportable existente sin construir mecanismos de intercambio activo todavía.

---

## 3. Ley 21.719 — Protección de Datos Personales

Publicada 13-dic-2024. **Entra en vigencia plena el 1-dic-2026.** Datos de salud son categoría especial (protección reforzada). PYMEs tienen 12 meses de gracia post-vigencia (amonestación, no multa) — `[LEGAL]` confirmar si Synapta y/o las clínicas-cliente califican como PYME bajo Ley 20.416.

### 3.1 Principios generales
Licitud, finalidad, proporcionalidad, calidad del dato, seguridad, responsabilidad demostrada (accountability).

- `[CÓDIGO]` Cada tabla con PII debería tener finalidad documentada. Hoy es implícita en el modelo de datos, no un registro explícito (ver 3.5, RAT).

### 3.2 Base legal del tratamiento — distinta del consentimiento clínico
- `[LEGAL]` `[CÓDIGO]` El consentimiento de M5 (`fce_consentimientos`) es consentimiento **clínico** (para el acto médico, bajo Ley 20.584). No necesariamente cubre el tratamiento de **datos personales** bajo 21.719 (ej. procesamiento por IA). Definir con abogado si son la misma base legal o si se necesita una capa de consentimiento/base legal específica para tratamiento de datos.

### 3.3 Categoría especial — datos de salud
- `[VERIFICAR]` Cifrado en tránsito: HTTPS/TLS vía Vercel, por defecto — confirmar igual.
- `[VERIFICAR]` Cifrado en reposo: Supabase generalmente cifra por defecto (AES-256) — **confirmar explícitamente, no asumir**.

### 3.4 Encargados de tratamiento (terceros procesadores)
Todo tercero que trate datos personales por cuenta de Synapta/clínica necesita contrato de encargo de tratamiento (DPA).

- `[LEGAL]` Gestionar/verificar DPA con: Anthropic (API Claude), Supabase (DB), Vercel (hosting), Sentry (observabilidad — `[VERIFICAR]` si algún error capturado incluye PII pese a la regla "PII prohibido en logs").
- `[CÓDIGO]` `seudonimizarTexto` (sprint SEC-1, `lib/ia/sanitize-pii.ts`) cubre nombre/apellidos/rut/teléfono/email antes de enviar a Anthropic. Confirmar que módulos nuevos (Copiloto de informes M11-M12, Resumen IA) pasan por este mismo choke point y no abren un path nuevo sin seudonimizar.

### 3.5 Registro de Actividades de Tratamiento (RAT)
Documentar qué datos se tratan, con qué finalidad, base legal, plazo de conservación, destinatarios, medidas de seguridad — por actividad de tratamiento.

- `[LEGAL]` `[CÓDIGO]` No existe hoy, ni como documento ni como tabla. Pendiente de construir.

### 3.6 Evaluación de Impacto (DPIA)
Obligatoria para tratamientos de alto riesgo — datos sensibles a escala y uso de IA sobre datos sensibles califican.

- `[LEGAL]` No existe. El uso de Claude (Resumen IA, Copiloto Escritura, Copiloto de informes) sobre datos de salud probablemente la requiere.

### 3.7 Derechos ARCO+ (acceso, rectificación, cancelación, oposición, portabilidad)

| Derecho | Estado | Gap |
|---|---|---|
| Acceso | Parcial — export PDF ficha completa | Falta canal formal de solicitud + tracking de plazo de respuesta |
| Rectificación | Parcial — adendas/erratas solo para documentos clínicos firmados | Datos no-clínicos (contacto, demográficos) sin flujo de rectificación auditado |
| Cancelación | No implementado | **Tensión legal directa con retención obligatoria de 15 años (20.584)** — `[LEGAL]` documentar la excepción explícitamente, no es un bug sino una excepción legal que debe quedar declarada |
| Oposición | No implementado | Aplica más a tratamientos secundarios (marketing, analytics) que a la ficha clínica en sí |
| Portabilidad | Parcial — export/vista FHIR | Confirmar que el formato exportado es realmente estructurado y reutilizable, no solo visual |

### 3.8 Notificación de brechas de seguridad
Notificar a la Agencia de Protección de Datos y a los afectados dentro de plazos definidos por reglamento.

- `[CÓDIGO]` Sentry captura errores técnicos, pero no existe un flujo "esto califica como brecha → iniciar notificación".
- `[LEGAL]` `[CÓDIGO]` Definir criterio de qué constituye brecha reportable y un runbook (aunque sea manual) para el equipo.

### 3.9 Menores de edad
Tratamiento de datos de menores requiere consentimiento de representante legal.

- `[VERIFICAR]` Confirmar si el flujo de paciente pediátrico captura representante legal para el consentimiento de **datos** (no solo el clínico de M5).

### 3.10 Delegado de Protección de Datos (DPO)
Organizaciones que traten datos de forma significativa deben designar DPO — aplica casi con certeza a clínicas de salud.

- `[LEGAL]` Decisión organizacional, no de código. El sistema debería exponer un punto de contacto visible para solicitudes de titulares (ej. sección en configuración o footer legal).

### 3.11 Sanciones (contexto de riesgo)
Multas hasta 20.000 UTM o 4% de ingresos anuales en reincidencia. PYMEs: solo amonestación en los primeros 12 meses (1-dic-2026 a 1-dic-2027).

---

## 4. Matriz resumen para auditoría de Claude Code

| # | Requisito | Ley | Dónde revisar | Tipo |
|---|---|---|---|---|
| 1 | RLS por `id_clinica` en toda tabla clínica | 20.584 | `supabase/migrations/*rls*` | CÓDIGO |
| 2 | Inmutabilidad post-firma | 20.584 | triggers `trg_block_update_signed_*` | CÓDIGO |
| 3 | Adendas no alteran el original | 20.584 | `src/app/actions/adendas.ts` | CÓDIGO |
| 4 | Consentimiento clínico trazable | 20.584 | `src/app/actions/consentimiento.ts` | CÓDIGO |
| 5 | Export FHIR — resources cubiertos | 21.668 | `src/lib/fhir-mapper.ts` | CÓDIGO |
| 6 | Seudonimización PII antes de IA | 21.719 | `src/lib/ia/sanitize-pii.ts` + toda action que use el SDK de Anthropic | CÓDIGO |
| 7 | Logs sin PII | 21.719 | `src/lib/logger.ts` + uso de `log()` en actions | CÓDIGO |
| 8 | Errores genéricos al cliente | 21.719 (seguridad) | `dbError()` en `guards.ts` | CÓDIGO |
| 9 | RAT existente | 21.719 | no existe — crear | LEGAL+CÓDIGO |
| 10 | DPIA de módulos IA | 21.719 | no existe — crear | LEGAL |
| 11 | Flujo de rectificación de datos no-clínicos | 21.719 | no existe | CÓDIGO |
| 12 | Excepción de cancelación declarada | 21.719 vs 20.584 | no existe | LEGAL |
| 13 | Runbook de notificación de brechas | 21.719 | no existe | LEGAL+CÓDIGO |
| 14 | Consentimiento de representante (menores) | 21.719 | flujo de paciente pediátrico | VERIFICAR |
| 15 | Cifrado en reposo confirmado | 21.719 | configuración Supabase | VERIFICAR |

---

## 5. Fuera de alcance de este documento
- DPA con proveedores (Anthropic, Supabase, Vercel, Sentry) — gestión contractual, no técnica.
- Designación formal de DPO — decisión organizacional de Synapta.
- Si Synapta actúa como "encargado" o "responsable" del tratamiento frente a cada clínica-cliente — determina quién firma qué con quién. Requiere abogado.

## 6. Registro de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-07-31 | Versión inicial — cobertura 20.584/Decreto 41 + 21.668 + 21.719 |
