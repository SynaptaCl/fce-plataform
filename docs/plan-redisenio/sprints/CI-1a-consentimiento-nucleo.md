# Sprint CI-1a — Consentimiento por canal del paciente: núcleo

> Estado: **PLAN — solo criterios de aceptación. Sin implementación.** Fase 0 (hotfix) está en `fce-plataform` (2026-09-21); CI-1a es la corrección estructural mínima viable: la firma del consentimiento la hace el **paciente** desde su propio dispositivo, no el staff desde su sesión.
> Fecha: 2026-09-22 · Repo: `fce-plataform` (decisión de ubicación cerrada — ver índice `CI-1-consentimiento-canal-paciente.md` §3)
> Antecedentes: auditoría M5 (H1–H8), Fase 0 aplicada, `docs/AMB-1-ambient-scribe.md` (F1/§5).
> Parte de: [`CI-1-consentimiento-canal-paciente.md`](./CI-1-consentimiento-canal-paciente.md) (índice). Extensiones (plantillas, PDF certificado, representante legal, revocación por link, tablet, WhatsApp) en [`CI-1b-consentimiento-extensiones.md`](./CI-1b-consentimiento-extensiones.md).
> Dependencia de **cierre** (no bloquea el inicio, sí el go-live): cuenta **SMSMasivo.cl** activa + credenciales de API + DPA/contrato de tratamiento de datos firmado (ver §4). El desarrollo arranca con `MockSmsProvider` detrás de `lib/sms/`; el proveedor real se integra al final del sprint.

---

## 0. Principio rector

Un consentimiento con `firmado=true` solo puede originarse en una acción autenticada del **paciente** (o su representante legal) para los tipos donde el canal paciente es obligatorio (ver matriz §0bis). El staff puede **solicitar**, nunca **firmar por**. Para los tipos donde el canal `sesion_staff` sigue permitido (transitoriamente, hasta respuesta `[LEGAL]`), el profesional declara "declaro haber informado" y el acto queda auditado como tal — no se disfraza de firma del paciente. El sistema debe poder demostrar el origen de cada firma: evidencia técnica + audit trail con `actor_tipo` correcto.

## 0bis. Matriz de canal por tipo de consentimiento

| `tipo` | Canal paciente | `sesion_staff` |
|---|---|---|
| `grabacion_ia`, `uso_ia`, `teleconsulta` | **Obligatorio** | **Prohibido** |
| `general`, `procedimiento_estetico`, `menores` | Preferente | Permitido hasta respuesta `[LEGAL]` (índice §12, ítem 1) |

- Ambient (AMB-1) solo arranca con un consentimiento **firmado por canal paciente** — nunca con uno `sesion_staff` (ver §9 "Gating Ambient").
- Esta matriz gobierna qué UI de staff se ofrece por tipo: para `grabacion_ia`/`uso_ia`/`teleconsulta` la única acción disponible es "enviar link/QR al paciente"; para el resto se ofrece también la opción `sesion_staff` heredada de Fase 0, marcada como transitoria.
- Cuando `[LEGAL]` (índice §12, ítem 1) resuelva si la firma electrónica simple + evidencia de canal paciente cubre procedimientos invasivos, la columna `sesion_staff` de la fila `general`/`procedimiento_estetico`/`menores` puede cerrarse (pasar a prohibido) sin cambios de esquema — es un cambio de política de UI + validación server-side, no de datos.
- **La matriz es fija respecto a `[LEGAL]` ítem 3** (índice §12): la pregunta "¿OTP basta como verificación de identidad?" solo puede **agregar requisitos** al canal paciente (ej. segundo factor) — nunca eliminarlo ni degradarlo a `sesion_staff` para los tipos donde es obligatorio.

---

## 1. Modelo de datos — reuso, no tablas nuevas

### 1.1 `consentimiento_tokens` (AMB-1, ya existe — 0 filas, RLS sin policies = solo service role)

Reusar tal cual; agregar por migration **solo si falta**:

- [ ] `destino` — texto enmascarado del canal: `+56 9 ****789` o `u***@***.cl` (nunca el dato crudo en esta tabla).
- [ ] `destino_hash` — hash del destino en claro (para rate limit cruzando tokens, ver §4).
- [ ] `canal` — `'link_remoto' | 'qr_presencial' | 'tablet_box' | 'whatsapp'`.
- [ ] `estado` — `'pendiente' | 'otp_enviado' | 'otp_verificado' | 'firmado' | 'expirado' | 'anulado'` (máquina de estados completa, ver §6).
- [ ] `otp_hash` — hash del código OTP (nunca en claro).
- [ ] `otp_expira_at` — TTL del código (5 min).
- [ ] `otp_verificado_at` — timestamp de verificación; abre la ventana de firma (ver §6).
- [ ] `intentos_otp` — entero, default 0. Tope 3, luego `estado='anulado'`.
- [ ] `envios_otp` — entero, default 0. Tope de reenvíos por rate limit (ver §4).
- [ ] El token en claro jamás se persiste ni se loguea (solo `token_hash` SHA-256 — igual que AMB-1 §5).
- [ ] Un solo uso + expiración (TTL configurable por canal; sugerido 72h link remoto, 15 min QR/tablet).

### 1.2 `fce_consentimientos` — columnas que AMB-1 §5 planeó y nunca aplicó

- [ ] `canal_otorgamiento` — CHECK contra los valores de canal de 1.1 + `'sesion_staff'` (default `'sesion_staff'` para compatibilidad con la única fila firmada existente, ver §10).
- [ ] `evidencia jsonb` — estructura documentada y versionada (ver §5): huellas, IP, UA, timestamps, canal enmascarado, telemetría del trazo, resultado OTP.
- [ ] `plantilla_version` — versión de la plantilla usada (CI-1b §6).
- [ ] `firmado_paciente_at` + `firmado_profesional_at` — separación real de actos (hoy `firmado_at` es un solo acto simultáneo — hallazgo H1/firma_profesional de la auditoría).
- [ ] Sin columnas de revocación: la revocación sigue siendo **append-only** (fila nueva `firmado=false`), como quedó decidido en AMB-1 §0 y en el trigger endurecido `20260921_02`.

### Trigger de inmutabilidad — criterio explícito

La **misma migración** que crea `canal_otorgamiento`, `evidencia`, `plantilla_version`, `firmado_paciente_at` y `firmado_profesional_at` **extiende** `block_update_signed_consentimiento()` para bloquear estas 5 columnas cuando `OLD.firmado = true` — mismo criterio que ya protege `firmado`, `contenido`, `tipo`, `firma_paciente`, `firma_profesional`, `id_paciente`, `id_clinica`, `firmado_at`, `version`, `created_by` desde `20260921_02`. La función debe mantener `SET search_path = public` (fix de `20260922_01`, ya aplicado — no regresar a la versión sin `search_path` fijo).

### 1.3 Representante legal (menores)

Ver [`CI-1b-consentimiento-extensiones.md`](./CI-1b-consentimiento-extensiones.md) §1.3.

---

## 2. Página pública por token — RPCs

- [ ] Ruta `/consentimiento/[token]`: muestra clínica (branding vía `BrandingInjector`), texto completo de la plantilla, identidad del paciente **parcialmente enmascarada** (ej: "María G.", RUT `12.***.***-5`), y no revela más datos clínicos que el título del consentimiento solicitado.
- [ ] El token no autentica: solo autoriza **ese** consentimiento, **ese** paciente, **esa** ventana temporal. Un solo uso.
- [ ] La app **no usa service role** en la ruta pública — toda lectura y escritura pasa por RPCs `SECURITY DEFINER` acotadas con `search_path` fijo.

### RPC de lectura

Ya definida arriba: recibe el token (hash), retorna exclusivamente `{ id_clinica, nombre_clinica, tipo_consentimiento, texto, id_paciente_enmascarado, estado_token }`. Nada de `SELECT` genérico sobre `fce_consentimientos` desde contexto público.

### RPC de escritura — `firmar_consentimiento_por_token`

`SECURITY DEFINER`, `search_path` fijo (`SET search_path = public`). En **una sola transacción**:

1. Valida que el token esté vigente (no expirado, no usado) y que el OTP esté verificado **dentro de la ventana de firma** (sugerida: 10 min desde `otp_verificado_at`).
2. Escribe la firma (`firma_paciente`) y la `evidencia` (§5).
3. Setea `firmado_paciente_at`.
4. Si `firmado_profesional_at` ya existe (el profesional ya declaró — ver §6), setea `firmado=true`.
5. Marca el token `usado_at` + `estado='firmado'`.
6. Registra el audit con `actor_tipo='paciente'` (`tipoEvento='consent_otorgado'`).

Todo o nada — si cualquier validación falla, la transacción no deja rastro de firma parcial.

### Orden de los actos (elimina la ambigüedad del "o")

El OTP verificado **abre una ventana de firma** (sugerido 10 min); el token se consume **solo al firmar**, no al verificar el OTP. Verificar el OTP y no firmar dentro de la ventana no invalida el token — el estado queda en `otp_verificado` y la ventana puede reabrirse reenviando un nuevo OTP (sujeto al rate limit de §4). Ver máquina de estados completa en §6.

---

## 3. Decisión de ubicación

Ver índice [`CI-1-consentimiento-canal-paciente.md`](./CI-1-consentimiento-canal-paciente.md) §3 — decidido 2026-09-22, la página pública vive en `fce-plataform`.

---

## 4. OTP al paciente

**Canal v1: SMS** a `pacientes.telefono` (cobertura 100% en prod — 7/7 pacientes con teléfono vs. 2/7 con email, verificado 2026-09-22). Email es secundario (fallback si el paciente prefiere o si SMS falla). WhatsApp queda para CI-1b.

### Proveedor: SMSMasivo.cl

- [ ] Integración vía su API REST, **detrás de una interfaz propia** en `lib/sms/`: `enviarSMS(destino, texto)`. Ningún otro punto del código conoce al proveedor — cambiarlo después toca un solo archivo.
- [ ] Credenciales (API key) **solo en variables de entorno de Vercel**. Nunca en el repo ni en logs.
- [ ] El texto del SMS **no lleva datos clínicos**, solo el código y el nombre de la clínica. Ej: `"Clínica X: tu código es 123456. Vence en 5 min."`
- [ ] Loguear **solo el resultado del envío** (ok/error + id del proveedor), nunca el número completo ni el código.
- [ ] SMSMasivo se agrega a la lista de proveedores del marco legal §3.4 como **encargado de datos** (maneja teléfonos de pacientes).

**Dependencia de cierre** (no bloquea el inicio del sprint): cuenta SMSMasivo activa + credenciales de API + DPA/contrato de tratamiento de datos firmado. Bloquea el **go-live**, no el desarrollo — ver `MockSmsProvider` abajo.

### Desarrollo con `MockSmsProvider`

- [ ] El sprint arranca con un `MockSmsProvider` detrás de la misma interfaz `enviarSMS(destino, texto)` de `lib/sms/` — el resto del código (RPCs, UI, tests) no distingue mock de real.
- [ ] El código OTP generado por el mock es visible **solo en el log de desarrollo** (`console.log`/`log("info", ...)` en `NODE_ENV=development`), **nunca** en producción ni en `logs_auditoria`.
- [ ] **Nuevo criterio de build**: el build de producción **falla** si `SMS_PROVIDER=mock` (o si la env var no apunta a SMSMasivo). Gate en el propio `lib/sms/` o en un check de `next.config.ts`/CI — impide desplegar a producción con el proveedor mock activo.
- [ ] El proveedor real (SMSMasivo) se integra e intercambia **al final del sprint**, una vez cerrada la dependencia de cierre (cuenta + credenciales + DPA).

### Reglas del código OTP

- [ ] Código de 6 dígitos, TTL 5 min, **hash del código almacenado** (`otp_hash`, nunca en claro).
- [ ] Máximo 3 intentos de verificación por token (`intentos_otp`), luego `estado='anulado'` — se debe emitir token nuevo.
- [ ] Canal mostrado siempre enmascarado en UI del staff y del paciente.

### Rate limit por destino (cruza tokens)

Un mismo número de teléfono puede recibir varios tokens (reintentos, consentimientos de distinto tipo). El rate limit debe frenar bombeo de SMS **por destino**, no solo por token. Dos opciones, presentar trade-off:

| Opción | Cómo | Ventaja | Desventaja |
|---|---|---|---|
| **A. Columna `destino_hash` + consulta por ventana** | Agregar `destino_hash` a `consentimiento_tokens` (ya listado en §1.1); consultar `COUNT(*) WHERE destino_hash = X AND created_at > now() - interval '30 min'` antes de emitir/reenviar OTP | Sin tabla nueva, reusa índice existente sobre `consentimiento_tokens` | Query de agregación en el path caliente de emisión de OTP; requiere índice sobre `destino_hash` + `created_at` |
| **B. Tabla aparte `consentimiento_rate_limit`** | `(destino_hash, ventana_inicio, contador)` con upsert atómico | Aislado del modelo de tokens, más fácil de purgar/expirar, mismo patrón que rate limit de IA (`lib/rate-limit.ts` con Upstash) | Tabla nueva a mantener; posible duplicación de lógica con Upstash si se prefiere Redis en vez de Postgres |

- [ ] Tope sugerido: máximo 3 envíos de OTP por destino en 30 min (protege contra bombeo SMS — costo y acoso).

### `[LEGAL]`

Ver índice §12. Ítems que bloquean esta sección: (3) ¿OTP basta como verificación de identidad para consentimiento clínico? — la respuesta solo puede **agregar** requisitos (ej. segundo factor), no eliminar el canal paciente donde es obligatorio (§0bis); (4) ¿QR presencial puede prescindir de OTP porque el profesional presencia el acto?

---

## 5. Evidencia del acto (`evidencia` jsonb)

- [ ] `huella_contenido_sha256` — sobre el canónico de Fase 0 (`tipo|contenido|id_paciente|id_clinica|firma.data_url|firma.timestamp`).
- [ ] `huella_firma_sha256` — de la imagen PNG de la firma.
- [ ] `ip`, `user_agent`, `timestamps servidor` (emisión token, envío OTP, verificación OTP, firma).
- [ ] `canal_destino_enmascarado`.
- [ ] Telemetría del trazo: nº de trazos, duración total de dibujo, tiempos primera/última — insumo de autenticidad (no biométrico, declararlo como tal).
- [ ] `logAudit` con `actor_tipo='paciente'` (ya aceptado por el CHECK en prod) en: emisión de token, envío OTP, verificación, firma, expiración/anulación.
- [ ] PII prohibido en `logs_auditoria` (regla 23 de CLAUDE.md): solo UUIDs + eventos.

---

## 6. Máquina de estados del token

```
pendiente → otp_enviado → otp_verificado → firmado
                                          ↘ expirado
                    (en cualquier estado) → anulado
```

- **`expirado`** se calcula **al leer** (`expira_at < now()`), sin job de limpieza.
- **`anulado`** se setea al agotar `intentos_otp` (3) o por acción explícita (staff invalida el token).

### Orden de los actos

1. El **profesional** solicita el consentimiento y declara ("declaro haber informado") — se setea `firmado_profesional_at` en ese momento, antes de que el paciente reciba el link/QR.
2. El **paciente** firma vía la RPC de escritura (§2) — se setea `firmado_paciente_at`.
3. `firmado=true` **solo** cuando ambos timestamps existen. Esto lo hace la RPC de escritura (`firmar_consentimiento_por_token`), no una escritura separada del staff.

### Si el paciente no firma antes de expirar

El token queda `expirado` (calculado al leer). El consentimiento en `fce_consentimientos` permanece `firmado=false` (o no existe la fila, según en qué punto del flujo se materializa la fila — a definir en implementación). El staff puede **reemitir un token nuevo** para el mismo consentimiento pendiente; el token expirado no se reutiliza ni se extiende.

---

## 7. `tipo_evento` — CHECK de `logs_auditoria`

DDL necesario (ampliar el CHECK existente, mantener los `consent_grabacion_*` ya presentes desde AMB-1):

```sql
-- Nuevos valores a agregar al CHECK de logs_auditoria.tipo_evento
'consent_solicitado',
'consent_otp_enviado',
'consent_otp_verificado',
'consent_otorgado',
'consent_revocado',
'consent_token_anulado'
```

---

## 8. Modalidades de otorgamiento (canal paciente)

- [ ] **Link remoto** (SMS/email al paciente antes o después de la consulta).
- [ ] **QR en el teléfono del paciente** — el staff muestra QR, el paciente escanea, firma en SU dispositivo. El profesional puede estar físicamente presente sin que cambie el canal: la sesión de firma sigue siendo del paciente.
- [ ] En NINGUNA de estas dos modalidades la sesión autenticada es del staff para el acto de firma.

Fallback tablet y WhatsApp: ver [`CI-1b-consentimiento-extensiones.md`](./CI-1b-consentimiento-extensiones.md).

---

## 9. Gating Ambient (AMB-1)

- [ ] La grabación ambient NO inicia sin consentimiento **vigente firmado por canal paciente**: `assertConsentimientoGrabacion()` sigue siendo el hard-stop de F2/F3 — sin cambios de forma, ahora exige `canal_otorgamiento` distinto de `'sesion_staff'` para los tipos `grabacion_ia`/`uso_ia`/`teleconsulta` (matriz §0bis — `sesion_staff` está **prohibido** para estos tipos, no es un fallback válido).
- [ ] Corregir criterio de aceptación F1 de AMB-1 (`docs/AMB-1-ambient-scribe.md` línea 287, "La recepcionista puede escribir consentimiento **sin** obtener acceso a FCE"): la redacción correcta es **"la recepcionista puede enviar la solicitud de consentimiento (link/QR), nunca firmarlo ni crear filas con `firmado=true`"**. Documentar el cambio en AMB-1 §0 — la redacción actual quedó obsoleta con la corrección T4 de Fase 0 y con la matriz de canal de este sprint.

---

## 10. Migración desde Fase 0

Hay **1 sola fila firmada** en `fce_consentimientos` (verificado en prod 2026-09-22, `tipo='procedimiento_estetico'` — canal `sesion_staff` permitido para ese tipo por la matriz §0bis, sin inconsistencia). Las columnas nuevas (`canal_otorgamiento`, `evidencia`, `plantilla_version`, `firmado_paciente_at`, `firmado_profesional_at`) se crean con un **default** en la misma migración que marca esa fila (y cualquier otra futura sin canal explícito) como `canal_otorgamiento='sesion_staff'`. **No se hace `UPDATE` sobre filas firmadas** — el default de columna cubre el caso, no un backfill activo.

- [ ] La UI del staff deja de ofrecer "captura de firma del paciente en mi sesión" para los tipos donde el canal paciente es obligatorio (`grabacion_ia`/`uso_ia`/`teleconsulta`, matriz §0bis); para el resto, el canvas de Fase 0 queda disponible como opción transitoria hasta que `[LEGAL]` (índice §12, ítem 1) resuelva si debe cerrarse también.

---

## 11. Tests

Reemplaza el criterio genérico "tests de sprint CI-1" de versiones anteriores del doc.

- [ ] **Funciones puras** (se mantienen del enfoque original): generación/validación de tokens, enmascaramiento de destino, cálculo de rate limit, canonicalización de evidencia (huellas SHA-256).
- [ ] **Tests contra la DB con un JWT real por rol**: `profesional`, `recepcionista`, anónimo por token (sin JWT, solo token hash).

### Casos negativos obligatorios

- [ ] La recepcionista **no puede** crear un consentimiento con `firmado=true` (ni vía RPC ni vía insert directo bajo RLS).
- [ ] El token **no se reusa** — segunda invocación de `firmar_consentimiento_por_token` con el mismo token falla.
- [ ] Un token de la clínica A **no firma** un consentimiento de la clínica B (cross-tenant).
- [ ] OTP vencido o con exceso de intentos (`intentos_otp` > 3) **rechaza** la verificación.
- [ ] `UPDATE` de `evidencia` (o de cualquiera de las 5 columnas protegidas) **después de la firma** falla por el trigger extendido.
- [ ] Ambient **bloqueado** cuando el único consentimiento vigente es `canal_otorgamiento='sesion_staff'` en un tipo donde ese canal está prohibido (`grabacion_ia`/`uso_ia`/`teleconsulta`).

---

## 12. Criterios de aceptación — núcleo

1. Cero rutas de escritura de consentimientos firmados originadas en sesión de staff, para los tipos donde el canal paciente es obligatorio (matriz §0bis).
2. Toda fila `firmado=true` nueva por canal paciente tiene `evidencia` completa (huellas, IP, UA, timestamps, canal) y `firmado_paciente_at` + `firmado_profesional_at` poblados.
3. `logAudit` de cada paso del ciclo de vida del token con `actor_tipo` correcto (`'paciente'` o staff solicitante), usando los `tipo_evento` de §7.
4. Token de un solo uso verificado por test; OTP con tope de intentos y rate limit por destino verificados por test.
5. `npm run build` 0 errores + tests de §11 (funciones puras + DB por rol).
6. Ambient no graba sin consentimiento vigente firmado por canal paciente (matriz §0bis) — nunca por `sesion_staff` en los tipos donde está prohibido.
7. El build de producción **falla** si `SMS_PROVIDER=mock` — `MockSmsProvider` no puede llegar a producción (§4).

Criterios de plantillas, PDF con certificado, revocación por link y representante legal: ver [`CI-1b-consentimiento-extensiones.md`](./CI-1b-consentimiento-extensiones.md).
