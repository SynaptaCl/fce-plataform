# Handoff — Sprint PRE-1 (tarificación y presupuestos)

> Sesión origen: 2026-08-20. Estado: **planificación cerrada, cero código, cero DDL aplicado.**
> Documento del sprint: `sprints/PRE-1-tarificacion-presupuestos.md` (en este mismo proyecto). Leerlo completo antes de continuar — este handoff no lo reemplaza.

---

## 1. Qué se hizo

Se planificó cómo se calculan los presupuestos (M11) y cómo se tarifica y cobra cada prestación. Se verificó el schema real vía MCP Supabase (`vigyhfpwyxihrjiygfsa`, proyecto **Synapta Product**) y el repo local. No se escribió código ni se aplicó ninguna migration.

## 2. Contexto necesario para retomar

- **Repo local**: `C:\Users\alexi\fce-plataform` en el device `pc-alexis`. Requiere `device_request_folder_access` — el usuario aprueba en su máquina.
- **MCP Supabase**: en el primer intento devolvió solo la org de HFBC (`gestion_hfbc`, `felixbot`) y falló con "You do not have permission". Tras reintentar apareció la org correcta (`ywxmcmtfuxaiqagkmamn` → `Synapta Product` = `vigyhfpwyxihrjiygfsa`). **Si falla, reintentar antes de asumir que no hay acceso.**
- **Hallazgo que sostiene todo el plan**: cero data transaccional en producción. `servicios` tiene 33 filas (todas de `clinica-renacer`) con **0 precios cargados**; `procedimientos_catalogo`, `fce_presupuestos`, `fce_presupuesto_items`, `fce_plan_tratamiento(_items)`, `pagos`, `citas`, `precios_abono` están en 0 filas. Rediseñar ahora no requiere migrar nada. Verificar que siga así antes de aplicar DDL.

## 3. Decisiones cerradas por el fundador (2026-08-20)

| # | Decisión |
|---|---|
| 1 | Catálogo nuevo `prestaciones_catalogo` + `profesional_prestaciones` en **dominio synapta**; `fce-plataform` los lee en SOLO READ. `procedimientos_catalogo` se deprecia (DROP en sprint aparte). |
| 2 | `modelo_precio` por clínica: `centralizado` \| `base_mas_recargo` \| `por_profesional`. |
| 3 | **Dos capas separadas**: `recargo_pct` afecta lo que paga el paciente; `honorario_tipo/valor` es reparto interno y nunca se renderiza al paciente. |
| 4 | Liquidación: **solo snapshot** en el ítem al firmar. Sin UI ni reportes en PRE-1. |
| 5 | Catálogo de la clínica + override por profesional (no catálogos individuales). |
| 6 | Administración de precios en el **admin de synapta**. |
| 7 | IVA: `afecta_iva` por prestación, exento + afecto. Totales `neto/iva/total` persistidos y calculados server-side. |
| 8 | **M11 es única fuente de presupuesto**; el plan dental lo genera. `fce_plan_tratamiento.presupuesto_total` / `monto_pagado` pasan a derivados. |
| 9 | El pago se registra en `pagos` de synapta con `id_presupuesto` nuevo; FCE solo lee el saldo. Argumento: cobrar es acto de caja y el recepcionista no accede al FCE. |
| 10 | Fuera de alcance: vigencia/vencimiento del presupuesto, convenios y bonificación previsional (Fonasa/Isapre), UI de liquidación, boleta electrónica. |

## 4. Bloqueantes antes de escribir código

1. **D-1 sin confirmar** — `precio_base` es precio final al público con IVA incluido (el IVA se desagrega para la boleta). Alternativa: precio neto + IVA sumado. Cambiarlo después obliga a recargar el catálogo completo. **Pedir confirmación explícita.**
2. **F1 y F4 son DDL sobre DB compartida** con el repo `synapta`. Regla 15 del CLAUDE.md: Claude genera SQL, no lo aplica. Requiere aprobación humana y conviene probar en un branch de Supabase antes de main.
3. Confirmar con el fundador el flujo de **reasignación de profesional** en modelo `base_mas_recargo`: el precio depende de quién atiende, así que un presupuesto firmado con uno y ejecutado por otro queda desalineado. El plan lo resuelve con `id_profesional` en el ítem + adenda obligatoria, pero es fricción operativa real.

## 5. Próximo paso concreto

**F1** — redactar la migration de synapta (sin aplicar): `prestaciones_catalogo`, `profesional_prestaciones`, columnas `modelo_precio` / `permite_descuento_item` / `descuento_max_pct` en `clinicas_pagos_config`, más RLS (`SELECT` authenticated por `get_clinica_ids_for_user`, escritura `admin|director|superadmin`). El DDL propuesto está completo en la sección 3.1 del documento del sprint — revisarlo, no reinventarlo.

Después: F2 (admin synapta) y F3 (`lib/tarificacion/` con `resolverPrecio` + `calcular`, funciones puras testeables sin DB). Fases y dependencias completas en la sección 9 del sprint.

## 6. Deuda detectada de paso (no arreglada)

- `fce_presupuestos.estado` CHECK solo admite `borrador | enviado`. Falta `aceptado | rechazado | anulado` para poder cobrar.
- `fce_adendas.tipo_documento` CHECK no incluye `presupuesto` → el presupuesto no es corregible por adenda.
- `fce_presupuestos` sin trigger de inmutabilidad; el bloqueo post-firma es solo application-layer (confirmado en `actions/presupuestos.ts`).
- Tipos CLP inconsistentes: `fce_presupuesto_items.precio_unitario` es `integer`, pero `fce_plan_tratamiento_items.valor_unitario` y `procedimientos_catalogo.precio_base` son `numeric`.
- `PresupuestoForm.tsx` calcula el total en el cliente (`calcularTotal`); el server no valida ni persiste. Se elimina en F5.
- Los 33 servicios de `clinica-renacer` sin precio bloquean su onboarding hasta mapearlos a `prestaciones_catalogo` (tarea de F2, requiere al director).
