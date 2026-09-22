/**
 * test-m5-consentimientos.ts
 * Fase 0 hotfix M5 — validación del endurecimiento del trigger de inmutabilidad
 * y de los helpers de firma/hash (src/lib/consentimientos/firma.ts).
 *
 * Dos secciones:
 *
 *  A) Funciones puras (sin DB): validarFirmaDataUrl (MIME PNG, tamaño máx/mín,
 *     canvas vacío) y determinismo de hashConsentimiento/canonicalizarConsentimiento.
 *
 *  B) DB (requiere NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en el
 *     entorno; se omite con mensaje si faltan): contra la DB real, usando
 *     service_role (bypasa RLS — apropiado para fixtures de test; los TRIGGERS
 *     de DB se disparan igual para cualquier rol):
 *       1. INSERT consentimiento de prueba (paciente existente cualquiera)
 *       2. UPDATE firmado = true            → debe pasar
 *       3. UPDATE firmado = true → false    → DEBE FALLAR (hueco T1 cerrado)
 *       4. UPDATE contenido estando firmado → DEBE FALLAR
 *       5. UPDATE version estando firmado   → DEBE FALLAR
 *       6. DELETE del fixture (limpieza)
 *
 *  ⚠️ La sección B REQUIERE que 20260921_02_harden_trigger_consentimientos.sql
 *  esté aplicada. Si el paso 3 NO falla, la migración aún no está aplicada
 *  (o el trigger fue revertido) — el script lo reporta explícitamente.
 *
 * Uso: npm run test:m5-consentimientos
 * (cargar env antes si se quiere la sección DB, ej:
 *  npx tsx --env-file=.env.local scripts/test-m5-consentimientos.ts)
 */

import {
  validarFirmaDataUrl,
  canonicalizarConsentimiento,
  hashConsentimiento,
  FIRMA_MIN_BYTES,
  FIRMA_MAX_BYTES,
  type InputHashConsentimiento,
} from "../src/lib/consentimientos/firma";

const errors: string[] = [];
let passCount = 0;

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
  passCount++;
}
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  errors.push(msg);
}
function check(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) pass(passMsg);
  else fail(failMsg);
}

// ── A) Funciones puras ───────────────────────────────────────────────────────

console.log("\nA) validarFirmaDataUrl — validación server-side de la firma");

const pngPrefix = "data:image/png;base64,";
const b64Relleno = "A".repeat(Math.ceil((FIRMA_MIN_BYTES + 2000) / 3) * 4);

check(validarFirmaDataUrl("data:image/jpeg;base64,AAAA").ok === false, "rechaza MIME distinto de image/png", "aceptó MIME image/jpeg");
check(validarFirmaDataUrl("no-es-un-data-url").ok === false, "rechaza string que no es data URL", "aceptó string sin prefijo data:");
check(validarFirmaDataUrl(pngPrefix).ok === false, "rechaza base64 vacío", "aceptó base64 vacío");
check(validarFirmaDataUrl(pngPrefix + "####").ok === false, "rechaza caracteres fuera de base64", "aceptó caracteres inválidos");

// Canvas vacío: payload menor al mínimo (canvas 600×180 en blanco comprime a <2 KB).
const b64Vacio = "A".repeat(Math.ceil((FIRMA_MIN_BYTES - 1000) / 3) * 4);
const resVacio = validarFirmaDataUrl(pngPrefix + b64Vacio);
check(resVacio.ok === false, `rechaza canvas vacío (< ${FIRMA_MIN_BYTES} bytes decodificados)`, "aceptó firma bajo el mínimo");

const resValida = validarFirmaDataUrl(pngPrefix + b64Relleno);
check(resValida.ok === true, `acepta firma dentro de rango (${FIRMA_MIN_BYTES}–${FIRMA_MAX_BYTES} bytes)`, "rechazó firma válida");

const b64Gigante = "A".repeat(Math.ceil((FIRMA_MAX_BYTES + 100000) / 3) * 4);
check(validarFirmaDataUrl(pngPrefix + b64Gigante).ok === false, "rechaza firma sobre el tamaño máximo", "aceptó firma sobre el máximo");

console.log("\nA) hashConsentimiento — determinismo y contenido canónico");

const inputA: InputHashConsentimiento = {
  tipo: "general",
  contenido: "CONTENIDO DE PRUEBA",
  id_paciente: "11111111-1111-1111-1111-111111111111",
  id_clinica: "22222222-2222-2222-2222-222222222222",
  firma_paciente: { data_url: pngPrefix + b64Relleno, timestamp: "2026-09-21T12:00:00.000Z" },
};

check(hashConsentimiento(inputA) === hashConsentimiento(inputA), "hash determinista para el mismo input", "hash NO determinista");
check(hashConsentimiento(inputA).length === 64, "huella SHA-256 hex de 64 caracteres", "longitud de huella inesperada");
check(/^[0-9a-f]{64}$/.test(hashConsentimiento(inputA)), "huella es hex lowercase", "huella con caracteres inesperados");

const inputContenidoDistinto = { ...inputA, contenido: "CONTENIDO ALTERADO" };
check(hashConsentimiento(inputA) !== hashConsentimiento(inputContenidoDistinto), "cambio de contenido cambia la huella", "huella idéntica tras alterar contenido");

const inputFirmaDistinta = { ...inputA, firma_paciente: { ...inputA.firma_paciente, timestamp: "2026-09-21T12:00:01.000Z" } };
check(hashConsentimiento(inputA) !== hashConsentimiento(inputFirmaDistinta), "cambio de firma cambia la huella", "huella idéntica tras alterar firma");

const inputClinicaNull = { ...inputA, id_clinica: null };
check(
  canonicalizarConsentimiento(inputClinicaNull) ===
    ["general", "CONTENIDO DE PRUEBA", inputA.id_paciente, "", inputA.firma_paciente.data_url, inputA.firma_paciente.timestamp].join("|"),
  "id_clinica null se serializa como string vacío en el canónico",
  "serialización de id_clinica null no coincide con la documentada"
);

// ── B) Trigger de inmutabilidad (DB real) ────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Nota: sin top-level await (este repo compila los scripts a CJS vía tsx) —
// toda la sección DB vive en main() async.
async function main(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(
      "\nB) Trigger de inmutabilidad — OMITIDO (sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno).\n" +
        "   Para ejecutarlo: npx tsx --env-file=.env.local scripts/test-m5-consentimientos.ts\n" +
        "   Requiere la migración 20260921_02_harden_trigger_consentimientos.sql APLICADA."
    );
    return;
  }

  console.log("\nB) Trigger de inmutabilidad — DB real (fixture efímero, se limpia al final)");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Fixture: usar un paciente existente (la tabla tiene pacientes reales; solo
  // agregamos una fila de consentimiento de prueba que se elimina al final).
  // Nota: en prod id_clinica es NOT NULL en fce_consentimientos (el archivo
  // 20260411_create_fce_consentimientos.sql del repo quedó desactualizado) —
  // se toma la clínica del propio paciente.
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, id_clinica")
    .limit(1)
    .maybeSingle();

  if (!paciente || !paciente.id_clinica) {
    fail("no hay pacientes (con id_clinica) en la DB para montar el fixture del test");
  } else {
    const { data: fixture, error: insertErr } = await supabase
      .from("fce_consentimientos")
      .insert({
        id_paciente: paciente.id,
        id_clinica: paciente.id_clinica,
        tipo: "general",
        contenido: "TEST FASE 0 M5 — fila efímera de validación de trigger",
        version: 1,
        firmado: false,
      })
      .select("id")
      .single();

    if (insertErr || !fixture) {
      fail(`no se pudo insertar el fixture: ${JSON.stringify(insertErr?.message ?? insertErr)}`);
    } else {
      const fixtureId = fixture.id;
      try {
        // 1. Firmar (firmado true→) debe pasar.
        const { error: errFirmar } = await supabase
          .from("fce_consentimientos")
          .update({ firmado: true, firmado_at: new Date().toISOString() })
          .eq("id", fixtureId);
        check(!errFirmar, "firmar una fila no firmada pasa", `firmar falló inesperadamente: ${errFirmar?.message}`);

        // 2. Revertir firmado true→false DEBE FALLAR (el hueco que cierra T1).
        const { error: errRevertir } = await supabase
          .from("fce_consentimientos")
          .update({ firmado: false })
          .eq("id", fixtureId);
        check(
          !!errRevertir,
          "revertir firmado=true→false sobre fila firmada es BLOQUEADO por el trigger",
          "ALERTA: revertir firmado PASÓ — ¿la migración 20260921_02 está aplicada?"
        );

        // 3. Editar contenido en fila firmada DEBE FALLAR.
        const { error: errContenido } = await supabase
          .from("fce_consentimientos")
          .update({ contenido: "CONTENIDO ALTERADO POST-FIRMA" })
          .eq("id", fixtureId);
        check(!!errContenido, "editar contenido post-firma es BLOQUEADO", "ALERTA: edición de contenido post-firma PASÓ");

        // 4. Cambiar version en fila firmada DEBE FALLAR.
        const { error: errVersion } = await supabase
          .from("fce_consentimientos")
          .update({ version: 99 })
          .eq("id", fixtureId);
        check(!!errVersion, "cambiar version post-firma es BLOQUEADO", "ALERTA: cambio de version post-firma PASÓ");

        // 5. updated_at sí debe poder cambiar (única columna permitida).
        const { error: errTouch } = await supabase
          .from("fce_consentimientos")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", fixtureId);
        check(!errTouch, "updated_at puede actualizarse en fila firmada (única excepción)", `update de updated_at falló: ${errTouch?.message}`);
      } finally {
        // Limpieza: DELETE del fixture (service_role; sin policy DELETE para usuarios).
        const { error: delErr } = await supabase
          .from("fce_consentimientos")
          .delete()
          .eq("id", fixtureId);
        if (delErr) console.error(`  ⚠ fixture ${fixtureId} no pudo eliminarse — limpiar manualmente: ${delErr.message}`);
        else console.log(`  · fixture ${fixtureId} eliminado (limpieza OK)`);
      }
    }
  }
}

// ── Resumen ──────────────────────────────────────────────────────────────────

main()
  .then(() => {
    console.log(`\n${"-".repeat(60)}`);
    if (errors.length === 0) {
      console.log(`✅ M5 Fase 0 — ${passCount} checks pasaron`);
      process.exit(0);
    } else {
      console.error(`❌ M5 Fase 0 — ${errors.length} check(s) fallaron de ${passCount + errors.length}:`);
      for (const e of errors) console.error(`   - ${e}`);
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(`\n❌ M5 Fase 0 — error inesperado:`, e);
    process.exit(1);
  });
