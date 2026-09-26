# Sprint CI-1 — Consentimiento por canal del paciente (índice)

> Estado: **PLAN — solo criterios de aceptación. Sin implementación.** Fase 0 (hotfix) está en `fce-plataform` (2026-09-21); CI-1 es la corrección estructural: la firma del consentimiento la hace el **paciente** desde su propio dispositivo, no el staff desde su sesión.
> Fecha: 2026-09-22 · Repo: `fce-plataform`
> Antecedentes: auditoría M5 (H1–H8), Fase 0 aplicada, `docs/AMB-1-ambient-scribe.md` (F1/§5).
> Datos verificados en prod (2026-09-22): `pacientes` — 7 en total, 7 con teléfono, 2 con email, 0 con `whatsapp_optin`. `fce_consentimientos` — 1 fila firmada.

Este documento es el índice. El contenido técnico vive en dos sprints:

- **[`CI-1a-consentimiento-nucleo.md`](./CI-1a-consentimiento-nucleo.md)** — modelo de datos, RPCs de lectura/escritura por token, OTP vía SMS (SMSMasivo.cl), evidencia del acto, matriz de canal por tipo, máquina de estados, `tipo_evento`, gating de Ambient, migración desde Fase 0, tests por rol. Es el camino crítico — sin esto, ningún consentimiento por canal paciente existe.
- **[`CI-1b-consentimiento-extensiones.md`](./CI-1b-consentimiento-extensiones.md)** — plantillas versionadas, PDF con certificado de evidencia, representante legal de menores, revocación por link, fallback tablet, WhatsApp. Depende de CI-1a completo + la respuesta `[LEGAL]` de este índice.

**v1 de branding**: dominio FCE con branding de la clínica vía `BrandingInjector` (`clinicas_fce_config`). Subdominio propio por clínica (ej. `fce.clinica.cl`) queda como deuda — requiere DNS por cliente, no está en el alcance de CI-1a/CI-1b.

---

## 3. ✅ DECIDIDO (2026-09-22) — la página pública vive en `fce-plataform`

**Decisión del dueño de producto**: la página pública de firma por token vive en ESTE repo (`fce-plataform`), ruta `/consentimiento/[token]` (ajustable). Se mantiene abajo la tabla de trade-offs evaluados como registro de la decisión.

> Consecuencias: (a) la excepción cross-repo de AMB-1 §5 (synapta escribiendo en `fce_consentimientos`) queda sin efecto — el canal paciente y su escritura viven aquí; (b) revisar CSP/proxy de `fce-plataform` para la nueva ruta pública anónima; (c) branding v1 resuelto vía `BrandingInjector` (ver nota arriba) — subdominio por clínica queda como deuda.

| Criterio | `fce-plataform` ✅ ELEGIDO | `synapta` (descartado) |
|---|---|---|
| Acceso a datos | RPC service-role igual de viable en ambos (DB compartida) | Ídem |
| Dominio/branding | Subdominio FCE (ej. `fce.clinica.cl`) — coherente con documento clínico | Dominio público de la clínica (ya tiene branding + WhatsApp + agendamiento) |
| Superficie pública | +1 ruta pública en la app que guarda la ficha (más CSP/proxy/endurecimiento a revisar) | La app "pública" ya existe; la FCE queda sin rutas anónimas |
| Deploy/velocity | Ciclo de releases del producto clínico | Ciclo del comercial/agenda (más ligero) |
| Riesgo de fuga | Un bug en la página pública toca el repo de la FCE | Aislado en el repo de cara al paciente |
| AMB-1 ya lo suponía | No | Sí (`POST /api/consentimiento/grabacion` en synapta) |

- [x] **Trade-off resumido** (registro de la evaluación): `synapta` ganaba en aislamiento y coherencia de canal paciente (AMB-1 ya lo diseñó así); `fce-plataform` ganaba si se quiere cerrar el loop legal del documento en el mismo producto — **se priorizó este último criterio**. La escritura a `fce_consentimientos` desde synapta (excepción de AMB-1 §5) queda descartada junto con la opción.

---

## §12 — Ítems `[LEGAL]` (consulta única al abogado)

Consolidado en un solo bloque para una sola consulta. Cada ítem indica qué queda bloqueado en CI-1a/CI-1b hasta la respuesta.

| # | Pregunta | Bloquea |
|---|---|---|
| 1 | **Firma electrónica simple vs. procedimientos invasivos**: ¿la firma electrónica simple (Ley 19.799) + evidencia de canal paciente cubre procedimientos invasivos bajo Ley 20.584 art. 14, o exigen FEA con PSP acreditado? | CI-1a §0bis — si la respuesta es "no cubre", la fila `general`/`procedimiento_estetico`/`menores` de la matriz pasa de "`sesion_staff` permitido transitoriamente" a exigir un mecanismo distinto (no solo canal paciente + OTP). |
| 2 | **`consentimiento_datos` vs. capa IA**: ¿`pacientes.consentimiento_datos` (Ley 21.719, ya poblado en los 7 pacientes) cubre el uso de IA/grabación, o hace falta una capa de consentimiento de datos separada del consentimiento clínico? | CI-1b §9 (revocación por link) — si son bases legales distintas, revocar una no revoca la otra; el flujo de revocación no puede diseñarse hasta resolver esto. |
| 3 | **¿OTP basta como verificación de identidad?** para consentimiento clínico por canal paciente. | CI-1a §4 (OTP) — la matriz §0bis es fija: la respuesta solo puede **agregar** requisitos (ej. segundo factor) al canal paciente para tipos de mayor riesgo, nunca eliminarlo donde es obligatorio. |
| 4 | **¿QR presencial sin OTP?** — ¿se puede prescindir del OTP en la modalidad QR presencial porque el profesional presencia el acto? | CI-1a §4 y §8 — si la respuesta es "sí", la modalidad QR presencial se simplifica (sin paso de verificación OTP), reduciendo fricción y costo de SMS. |
| 5 | **Identidad del representante legal** (menores): ¿OTP al teléfono del representante basta, o se exige verificación adicional (RUT físico, documento de parentesco)? | CI-1b §1.3 — condiciona si basta con columnas simples o si se requiere una tabla con histórico de verificación más robusto. |

---

## Estado de dependencias

- **Bloqueante de inicio para CI-1a**: ninguna — el desarrollo arranca con `MockSmsProvider` detrás de `lib/sms/` (detalle en `CI-1a-consentimiento-nucleo.md` §4).
- **Bloqueante de cierre para CI-1a**: cuenta SMSMasivo.cl activa + credenciales de API + DPA/contrato de tratamiento de datos firmado. El build de producción falla si `SMS_PROVIDER=mock` — no se puede dar por cerrado el sprint sin el proveedor real integrado.
- **Bloqueante para CI-1b**: CI-1a completo + respuesta `[LEGAL]` (tabla de arriba, ítems 2 y 5 en particular).
