# Sprint CI-1 — Consentimiento por canal del paciente

> Estado: **PLAN — solo criterios de aceptación. Sin implementación.** Fase 0 (hotfix) está en `fce-plataform` (2026-09-21); CI-1 es la corrección estructural: la firma del consentimiento la hace el **paciente** desde su propio dispositivo, no el staff desde su sesión.
> Fecha: 2026-09-21 · Repos: `fce-plataform` (+ `synapta`, decisión de ubicación pendiente — ver §3)
> Antecedentes: auditoría M5 (H1–H8), Fase 0 aplicada, `docs/AMB-1-ambient-scribe.md` (F1/§5).

---

## 0. Principio rector

Un consentimiento con `firmado=true` solo puede originarse en una acción autenticada del **paciente** (o su representante legal). El staff puede **solicitar**, nunca **firmar por**. El sistema debe poder demostrarlo: evidencia técnica + audit trail con `actor_tipo='paciente'`.

---

## 1. Modelo de datos — reuso, no tablas nuevas

### 1.1 `consentimiento_tokens` (AMB-1, ya existe — 0 filas, RLS sin policies = solo service role)

Reusar tal cual; agregar por migration **solo si falta**:

- [ ] `destino` — texto enmascarado del canal: `+56 9 ****789` o `u***@***.cl` (nunca el dato crudo en esta tabla).
- [ ] `canal` — `'link_remoto' | 'qr_presencial' | 'tablet_box' | 'whatsapp'`.
- [ ] `intentos_otp` — entero, default 0.
- [ ] `estado` — `'pendiente' | 'otp_enviado' | 'firmado' | 'expirado' | 'anulado'`.
- [ ] El token en claro jamás se persiste ni se loguea (solo `token_hash` SHA-256 — igual que AMB-1 §5).
- [ ] Un solo uso + expiración (TTL configurable por canal; sugerido 72h link remoto, 15 min QR/tablet).

### 1.2 `fce_consentimientos` — columnas que AMB-1 §5 planeó y nunca aplicó

- [ ] `canal_otorgamiento` — CHECK contra los valores de canal de 1.1 (nullable solo para filas presencial-profesional Fase 0).
- [ ] `evidencia jsonb` — estructura documentada y versionada (ver §5): huellas, IP, UA, timestamps, canal enmascarado, telemetría del trazo, resultado OTP.
- [ ] `plantilla_version` — versión de la plantilla usada (ver §6).
- [ ] `firmado_paciente_at` + `firmado_profesional_at` — separación real de actos (hoy `firmado_at` es un solo acto simultáneo — hallazgo H1/firma_profesional de la auditoría).
- [ ] Sin columnas de revocación: la revocación sigue siendo **append-only** (fila nueva `firmado=false`), como quedó decidido en AMB-1 §0 y en el trigger endurecido `20260921_02`.

### 1.3 Representante legal (menores)

- [ ] **EVALUAR** (decisión de diseño, presentar ambas opciones en el sprint):
  - a) Columnas `representante_nombre/rut/parentesco/otp_verificado` en `fce_consentimientos`, o
  - b) Tabla aparte `fce_representantes_legales` (reuso entre consentimientos, histórico de verificaciones).
  - Criterio de decisión: si el mismo representante firma recurrentemente, tabla aparte evita re-verificación de OTP en cada consentimiento; si es 1-shot, columnas bastan.

---

## 2. Página pública por token — sin login

- [ ] Ruta `/consentimiento/[token]` (o la que decida §3): muestra clínica (branding), texto completo de la plantilla, identidad del paciente **parcialmente enmascarada** (ej: "María G.", RUT `12.***.***-5`), y no revela más datos clín­icos que el título del consentimiento solicitado.
- [ ] El token no autentica: solo autoriza **ese** consentimiento, **ese** paciente, **esa** ventana temporal. Un solo uso.
- [ ] El tenant se resuelve por una **RPC `SECURITY DEFINER` acotada**: recibe el token (hash), retorna exclusivamente `{ id_clinica, nombre_clinica, tipo_consentimiento, texto, id_paciente_enmascarado, estado_token }`. Nada de SELECT genérico sobre `fce_consentimientos` desde contexto público.
- [ ] La RPC marca `usado_at` de forma atómica con la firma (o invalida el token al validar OTP) — sin ventana de reuso.
- [ ] Fallback tablet en box: mismo flujo QR/tablet, nunca una sesión del staff.

## 3. DECISIÓN PENDIENTE (para el dueño de producto) — ¿dónde vive la página pública?

| Criterio | `fce-plataform` | `synapta` (como dice AMB-1 §5/nota cross-repo) |
|---|---|---|
| Acceso a datos | RPC service-role igual de viable en ambos (DB compartida) | Ídem |
| Dominio/branding | Subdominio FCE (ej. `fce.clinica.cl`) — coherente con documento clínico | Dominio público de la clínica (ya tiene branding + WhatsApp + agendamiento) |
| Superficie pública | +1 ruta pública en la app que guarda la ficha (más CSP/proxy/endurecimiento a revisar) | La app "pública" ya existe; la FCE queda sin rutas anónimas |
| Deploy/velocity | Ciclo de releases del producto clínico | Ciclo del comercial/agenda (más ligero) |
| Riesgo de fuga | Un bug en la página pública toca el repo de la FCE | Aislado en el repo de cara al paciente |
| AMB-1 ya lo suponía | No | Sí (`POST /api/consentimiento/grabacion` en synapta) |

- [ ] **Trade-off resumido**: `synapta` gana en aislamiento y coherencia de canal paciente (AMB-1 ya lo diseñó así); `fce-plataform` gana si se quiere cerrar el loop legal del documento en el mismo producto. La escritura a `fce_consentimientos` desde synapta ya está declarada como excepción deliberada en AMB-1 §5 — solo aplica si se decide synapta.

## 4. OTP al paciente

- [ ] Destino: `pacientes.telefono` o `pacientes.email` (el que exista; si ambos, preferir el que la clínica declaró).
- [ ] Código de 6 dígitos, TTL 5 min, **hash del código almacenado** (nunca en claro).
- [ ] Máximo 3 intentos por token (`intentos_otp`), luego `estado='anulado'` y se debe emitir token nuevo.
- [ ] Rate limit: máximo 3 envíos de OTP por token y por número/email en 30 min (protege contra bombeo SMS/WhatsApp — costo y acoso).
- [ ] Email vía **Resend** (DPA ya existe en la lista de proveedores §3.4 marco legal). SMS/WhatsApp: proveedor a definir `[LEGAL]`.
- [ ] Canal mostrado siempre enmascarado en UI del staff y del paciente.
- [ ] `[LEGAL]` verificar con abogado si OTP a teléfono/email basta como verificación de identidad para consentimiento clínico, o si se exige identificación presencial (RUT físico) para procedimientos de alto riesgo.

## 5. Evidencia del acto (`evidencia` jsonb)

- [ ] `huella_contenido_sha256` — sobre el canónico de Fase 0 (`tipo|contenido|id_paciente|id_clinica|firma.data_url|firma.timestamp`).
- [ ] `huella_firma_sha256` — de la imagen PNG de la firma.
- [ ] `ip`, `user_agent`, `timestamps servidor` (emisión token, envío OTP, verificación OTP, firma).
- [ ] `canal_destino_enmascarado`.
- [ ] Telemetría del trazo: nº de trazos, duración total de dibujo, tiempos primera/última — insumo de autenticidad (no biométrico, declararlo como tal).
- [ ] `logAudit` con `actor_tipo='paciente'` (ya aceptado por el CHECK en prod) en: emisión de token, envío OTP, verificación, firma, expiración/anulación.
- [ ] PII prohibido en `logs_auditoria` (regla 23): solo UUIDs + eventos.

## 6. Plantillas versionadas por clínica

- [ ] Tabla `fce_plantillas_consentimiento` (id_clinica, tipo, version, texto, vigente) — reemplaza el hardcode de `CONSENT_TEMPLATES` en `ConsentManager.tsx`.
- [ ] Cada consentimiento firmado guarda `plantilla_version` + snapshot del texto (inmutabilidad del trigger lo protege).
- [ ] Edición de plantilla = nueva versión; la fila firmada referencia la versión exacta.
- [ ] `[LEGAL]` flujo de aprobación de cambios de texto por abogado antes de publicar nueva versión (mismo P4 de AMB-1).

## 7. PDF con certificado de evidencia

- [ ] PDF del consentimiento firmado con página final de **certificado de evidencia**: huellas SHA-256 completas, canal, IP, UA, timestamps, resultado OTP, telemetría, y quién/qué originó cada evento.
- [ ] Generado server-side (patrón `pdf-renderer.ts` de ficha clínica), no modificable post-emisión (huella del PDF en el certificado).

## 8. Modalidades de otorgamiento

- [ ] **Link remoto** (WhatsApp/email al paciente antes o después de la consulta).
- [ ] **QR en el teléfono del paciente** — el staff muestra QR, el paciente escanea, firma en SU dispositivo.
- [ ] **Fallback tablet en box** — tablet entregada al paciente, misma página por token, OTP al teléfono del paciente como factor de verificación (el OTP viaja al teléfono del paciente, no a la pantalla de la tablet).
- [ ] En NINGUNA modalidad la sesión autenticada es del staff para el acto de firma.

## 9. Revocación iniciada por el paciente

- [ ] Link de revocación incluido en el consentimiento (token de un solo uso, propio).
- [ ] Revocación = INSERT de fila nueva `firmado=false` (append-only — patrón AMB-1, ya soportado por el trigger endurecido).
- [ ] `logAudit` con `actor_tipo='paciente'`, tipoEvento `consent_grabacion_revocado` (o equivalente por tipo).
- [ ] Efecto inmediato sobre `assertConsentimientoGrabacion()`.

## 10. Gating Ambient (AMB-1)

- [ ] La grabación ambient NO inicia sin consentimiento vigente: `assertConsentimientoGrabacion()` sigue siendo el hard-stop de F2/F3 — sin cambios de forma, ahora alimentado por consentimientos firmados por canal paciente.
- [ ] Corregir criterio de aceptación F1 de AMB-1: **"la recepcionista puede enviar la solicitud de consentimiento (link/QR), nunca firmarlo ni crear filas con firmado=true"**. Documentar el cambio en AMB-1 §0 (la redacción actual "puede escribir consentimiento" quedó obsoleta con la corrección T4 de Fase 0).

## 11. Migración desde Fase 0

- [ ] Las filas firmadas en Fase 0 (canal presencial-profesional, con declaración del profesional) quedan marcadas como `canal_otorgamiento='presencial_profesional'` — válidas pero distinguibles de las firmadas por canal paciente.
- [ ] La UI del staff deja de ofrecer "captura de firma del paciente en mi sesión" para los tipos que exijan canal paciente; el canvas de Fase 0 queda como deprecado/limitado según decisión `[LEGAL]`.

## 12. Ítems [LEGAL] (no resolubles por código)

- [ ] **Relación con `pacientes.consentimiento_datos`** (Ley 21.719, ya poblado en los 7 pacientes): ¿ese campo cubre el uso de IA/grabación o hace falta una capa de consentimiento de datos separada del consentimiento clínico? El marco legal §3.2 ya lo deja abierto — cerrar con abogado ANTES de diseñar el flujo de revocación (si son bases legales distintas, revocar una no revoca la otra).
- [ ] **Firma electrónica simple y procedimientos invasivos**: validar con abogado que la firma electrónica simple (Ley 19.799) + evidencia de canal paciente cubre procedimientos invasivos bajo Ley 20.584 art. 14, o si esos casos exigen FEA con PSP acreditado (integración de pago/contrato aparte).
- [ ] Textos de plantillas revisados por abogado antes de publicar versiones por clínica.
- [ ] Menores: verificación de identidad del representante (OTP basta / se exige RUT físico presencial).

---

## 13. Criterios de aceptación globales (resumen ejecutable)

1. Cero rutas de escritura de consentimientos firmados originadas en sesión de staff.
2. Toda fila `firmado=true` nueva tiene `evidencia` completa (huellas, IP, UA, timestamps, canal) y `firmado_paciente_at` poblado desde canal paciente.
3. `logAudit` de cada paso del ciclo de vida del token con `actor_tipo` correcto ('paciente' o staff solicitante).
4. Token de un solo uso verificado por test; OTP con tope de intentos y rate limit verificados por test.
5. Revocación por el paciente = fila nueva append-only, efecto inmediato en `assertConsentimientoGrabacion()`.
6. PDF con certificado de evidencia reproducible y con huella verificable.
7. `npm run build` 0 errores + tests de sprint CI-1 (funciones puras: tokens, enmascaramiento, rate limit, canonicalización de evidencia).
8. Ambient no graba sin consentimiento vigente firmado por canal paciente o presencial Fase 0 marcado como tal.
