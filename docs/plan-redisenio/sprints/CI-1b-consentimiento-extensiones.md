# Sprint CI-1b — Consentimiento por canal del paciente: extensiones

> Estado: **PLAN — solo criterios de aceptación. Sin implementación.**
> Fecha: 2026-09-22 · Repo: `fce-plataform`
> Parte de: [`CI-1-consentimiento-canal-paciente.md`](./CI-1-consentimiento-canal-paciente.md) (índice).
> **Dependencias**: [`CI-1a-consentimiento-nucleo.md`](./CI-1a-consentimiento-nucleo.md) completo (modelo de datos, RPCs, OTP, evidencia, gating ambient) + respuesta `[LEGAL]` del índice §12 (ítem 2, "consentimiento_datos vs. capa IA", bloquea §9 de este doc; ítem 5, "identidad del representante legal", bloquea §1.3 de este doc).

---

## 1.3 Representante legal (menores)

**EVALUAR** (decisión de diseño, presentar ambas opciones en el sprint):

- **a) Columnas en `fce_consentimientos`**: `representante_nombre`, `representante_rut`, `representante_parentesco`, `representante_otp_verificado`.
- **b) Tabla aparte `fce_representantes_legales`**: reuso entre consentimientos, histórico de verificaciones.

**Criterio de decisión**: si el mismo representante firma recurrentemente (ej. tutor de un paciente con múltiples atenciones), la tabla aparte evita re-verificación de OTP en cada consentimiento. Si el caso de uso es mayoritariamente 1-shot (un representante, un consentimiento puntual), las columnas bastan y evitan un join adicional.

Bloqueado por `[LEGAL]` (índice §12, ítem 5): identidad del representante — ¿OTP al teléfono del representante basta, o se exige verificación adicional (RUT físico, documento que acredite parentesco)? La respuesta condiciona qué campos son obligatorios en cualquiera de las dos opciones.

---

## 6. Plantillas versionadas por clínica

- [ ] Tabla `fce_plantillas_consentimiento` (`id_clinica`, `tipo`, `version`, `texto`, `vigente`) — reemplaza el hardcode de `CONSENT_TEMPLATES` en `ConsentManager.tsx`.
- [ ] Cada consentimiento firmado guarda `plantilla_version` (columna definida en CI-1a §1.2) + snapshot del texto (inmutabilidad del trigger extendido lo protege).
- [ ] Edición de plantilla = nueva versión; la fila firmada referencia la versión exacta.
- [ ] **Plantillas globales** (`id_clinica NULL`), aprobadas **una sola vez** por abogado de Synapta, como default para toda clínica nueva. Override por clínica opcional.
- [ ] Criterio explícito: una clínica nueva opera desde el día 1 sin revisión legal propia — el default global ya viene aprobado.
- [ ] `[LEGAL]` flujo de aprobación de cambios de texto por abogado antes de publicar nueva versión (mismo P4 de AMB-1) — aplica tanto a plantillas globales como a overrides por clínica.

---

## 7. PDF con certificado de evidencia

- [ ] PDF del consentimiento firmado con página final de **certificado de evidencia**: huellas SHA-256 completas, canal, IP, UA, timestamps, resultado OTP, telemetría, y quién/qué originó cada evento.
- [ ] Generado server-side (patrón `pdf-renderer.ts` de ficha clínica), no modificable post-emisión (huella del PDF en el certificado).

---

## 8bis. Fallback tablet en box

- [ ] Tablet entregada al paciente, misma página por token (`/consentimiento/[token]`, CI-1a §2), mismo flujo QR/tablet.
- [ ] OTP al teléfono del paciente como factor de verificación — el OTP viaja al teléfono del paciente, **no** a la pantalla de la tablet.
- [ ] Nunca una sesión del staff para el acto de firma — mismo principio que CI-1a §8.

---

## WhatsApp (canal OTP v2)

- [ ] Canal adicional de envío de OTP y/o de link remoto, sobre la misma interfaz `lib/sms/` o una análoga (`lib/whatsapp/`) — decidir en implementación si comparte contrato con `enviarSMS()` o requiere uno propio (WhatsApp Business API tiene plantillas pre-aprobadas, distinto de SMS libre).
- [ ] Mismas reglas de CI-1a §4: sin datos clínicos en el mensaje, solo logs de resultado (ok/error + id), rate limit por destino compartido con SMS (mismo `destino_hash`).
- [ ] Requiere WABA (WhatsApp Business Account) propia o de terceros — evaluar proveedor y DPA por separado del de SMSMasivo, sumar a marco legal §3.4 si se confirma.

---

## 9. Revocación iniciada por el paciente

- [ ] Link de revocación incluido en el consentimiento (token de un solo uso, propio, mismo modelo que `consentimiento_tokens`).
- [ ] Revocación = INSERT de fila nueva `firmado=false` (append-only — patrón AMB-1, ya soportado por el trigger endurecido).
- [ ] `logAudit` con `actor_tipo='paciente'`, `tipoEvento='consent_revocado'` (CI-1a §7).
- [ ] Efecto inmediato sobre `assertConsentimientoGrabacion()`.

**Bloqueado por `[LEGAL]`** (índice §12, ítem 2): "Relación con `pacientes.consentimiento_datos`" — si el consentimiento de datos (Ley 21.719) y el consentimiento clínico de uso de IA son bases legales distintas, revocar uno no revoca el otro automáticamente. No diseñar el flujo de revocación por link hasta que esto se resuelva — podría requerir revocar ambos consentimientos en el mismo acto, o mostrar al paciente que solo está revocando uno de los dos.

---

## Criterios de aceptación — extensiones

1. Plantilla vigente por tipo y clínica resuelta correctamente (global si no hay override, override si existe); versión y snapshot de texto guardados en cada firma.
2. PDF con certificado de evidencia reproducible y con huella verificable, generado server-side.
3. Representante legal: campos (columnas o tabla, según decisión) completos y validados server-side antes de permitir firma en consentimientos de menores.
4. Revocación por el paciente = fila nueva append-only, efecto inmediato en `assertConsentimientoGrabacion()`, y comportamiento consistente con la resolución `[LEGAL]` sobre `consentimiento_datos`.
5. Fallback tablet funcional con OTP al teléfono del paciente, nunca a la tablet.
6. `npm run build` 0 errores + tests de funciones puras de plantillas/certificado.
