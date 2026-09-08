/**
 * test-sprint-m13-estetica.ts
 * Sprint M13 — Módulo Ficha Estética
 */

import { ZONAS_FACIALES, ZONAS_CORPORALES, getLabelZona, esZonaValida } from "../src/lib/estetica/zonas";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";

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

console.log("\n[Test 1] Catálogo de zonas estáticas");
check(ZONAS_FACIALES.length === 7, "7 zonas faciales definidas", `Se esperaban 7 zonas faciales, hay ${ZONAS_FACIALES.length}`);
check(ZONAS_CORPORALES.length === 6, "6 zonas corporales definidas", `Se esperaban 6 zonas corporales, hay ${ZONAS_CORPORALES.length}`);
check(getLabelZona("facial", "frente") === "Frente", "getLabelZona resuelve 'frente' → 'Frente'", "getLabelZona falló para 'frente'");
check(getLabelZona("facial", "codigo_inexistente") === "codigo_inexistente", "getLabelZona hace fallback al código si no existe", "getLabelZona no hizo fallback correctamente");
check(esZonaValida("facial", "labios") === true, "esZonaValida acepta 'labios' en facial", "esZonaValida rechazó 'labios' en facial");
check(esZonaValida("corporal", "labios") === false, "esZonaValida rechaza 'labios' en corporal", "esZonaValida aceptó 'labios' en corporal incorrectamente");
check(esZonaValida("corporal", "abdomen") === true, "esZonaValida acepta 'abdomen' en corporal", "esZonaValida rechazó 'abdomen' en corporal");

console.log("\n[Test 2] Wiring de módulo M13 en registry.ts");
check(MODULE_REGISTRY.M13_estetica !== undefined, "MODULE_REGISTRY tiene entrada M13_estetica", "MODULE_REGISTRY no tiene M13_estetica");
check(MODULE_REGISTRY.M13_estetica?.obligatorio === false, "M13_estetica no es obligatorio", "M13_estetica no debería ser obligatorio");
check(
  MODULE_REGISTRY.M13_estetica?.tablasSupabase.includes("fce_fichas_esteticas") ?? false,
  "M13_estetica declara fce_fichas_esteticas",
  "M13_estetica no declara fce_fichas_esteticas en tablasSupabase"
);

// ── Test 3: Inmutabilidad post-firma de fce_fichas_esteticas (requiere Supabase) ──
//
// Solo se ejecuta si están disponibles las variables de entorno de Supabase.
// Valida que los triggers trg_block_update_signed_ficha_estetica y
// trg_block_write_zonas_signed_ficha_estetica bloquean escrituras post-firma.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runInmutabilidadTests() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("\n[Test 3] Inmutabilidad ficha estética — OMITIDO (variables de entorno no disponibles)");
    console.log("  ℹ Para ejecutar los tests de inmutabilidad:");
    console.log("    NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-sprint-m13-estetica.ts");
    return;
  }

  console.log("\n[Test 3] Inmutabilidad ficha estética (con Supabase)");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Obtener IDs reales para respetar FK constraints
  const { data: refData } = await supabase
    .from("fce_encuentros")
    .select("id, id_clinica, id_paciente, created_by")
    .limit(1)
    .single();

  if (!refData) {
    console.log("  ℹ Test 3 omitido: no hay encuentros en DB para referenciar en tests de FK");
    return;
  }

  const TEST_ID_CLINICA = refData.id_clinica;
  const TEST_ID_PACIENTE = refData.id_paciente;
  const TEST_ID_ENCUENTRO = refData.id;
  const TEST_CREATED_BY = refData.created_by;

  // Verificar que no hay ficha existente para este encuentro (o limpiar previamente)
  await supabase.from("fce_fichas_esteticas").delete()
    .eq("id_encuentro", TEST_ID_ENCUENTRO)
    .eq("firmado", false);

  // ── 3a: INSERT de ficha estética ───────────────────────────────────────────
  const { data: insertada, error: errInsert } = await supabase
    .from("fce_fichas_esteticas")
    .insert({
      id_clinica: TEST_ID_CLINICA,
      id_paciente: TEST_ID_PACIENTE,
      id_encuentro: TEST_ID_ENCUENTRO,
      tipo_ficha: "facial",
      motivo: "Test sprint M13 — inmutabilidad (borrar si aparece)",
      created_by: TEST_CREATED_BY,
      firmado: false,
    })
    .select("id")
    .single();

  if (errInsert || !insertada) {
    fail(`3a INSERT ficha estética: ${errInsert?.message ?? "sin respuesta"}`);
    return;
  }
  pass(`3a INSERT ficha estética OK (id: ${insertada.id})`);

  const fichaId = insertada.id;

  // ── 3b: UPDATE del motivo con firmado=false (debe funcionar) ───────────────
  const { error: errUpdate } = await supabase
    .from("fce_fichas_esteticas")
    .update({ motivo: "Motivo editado pre-firma" })
    .eq("id", fichaId);

  if (errUpdate) {
    fail(`3b UPDATE motivo con firmado=false: lanzó error inesperado — ${errUpdate.message}`);
  } else {
    pass("3b UPDATE motivo con firmado=false: OK");
  }

  // ── 3c: INSERT de zona pre-firma (debe funcionar) ──────────────────────────
  const { data: zona, error: errZona } = await supabase
    .from("fce_ficha_estetica_zonas")
    .insert({
      id_ficha_estetica: fichaId,
      region: "facial",
      zona_codigo: "frente",
      producto_comercial: null,
      lote: null,
    })
    .select("id")
    .single();

  if (errZona || !zona) {
    fail(`3c INSERT zona pre-firma: ${errZona?.message ?? "sin respuesta"}`);
  } else {
    pass("3c INSERT zona pre-firma: OK");
  }

  // ── Firmar la ficha ─────────────────────────────────────────────────────────
  const { error: errFirmar } = await supabase
    .from("fce_fichas_esteticas")
    .update({ firmado: true, firmado_at: new Date().toISOString(), firmado_por: TEST_CREATED_BY })
    .eq("id", fichaId);

  if (errFirmar) {
    fail(`3d (previo) Firmar ficha de test: ${errFirmar.message}`);
  } else {
    // ── 3d: UPDATE del motivo con firmado=true (debe lanzar excepción del trigger) ──
    const { error: errPostFirma } = await supabase
      .from("fce_fichas_esteticas")
      .update({ motivo: "Intento post-firma" })
      .eq("id", fichaId);

    if (errPostFirma && /ficha estética firmada/i.test(errPostFirma.message)) {
      pass("3d UPDATE motivo con firmado=true: trigger bloqueó correctamente");
    } else if (errPostFirma) {
      fail(`3d UPDATE post-firma lanzó error inesperado: ${errPostFirma.message}`);
    } else {
      fail("3d UPDATE post-firma NO lanzó excepción — el trigger NO está funcionando");
    }

    // ── 3e: INSERT de zona post-firma (debe lanzar excepción del trigger) ─────
    if (zona) {
      const { error: errZonaPost } = await supabase
        .from("fce_ficha_estetica_zonas")
        .update({ lote: "X" })
        .eq("id", zona.id);

      if (errZonaPost && /ficha estética firmada/i.test(errZonaPost.message)) {
        pass("3e UPDATE zona con ficha firmada: trigger bloqueó correctamente");
      } else if (errZonaPost) {
        fail(`3e UPDATE zona post-firma lanzó error inesperado: ${errZonaPost.message}`);
      } else {
        fail("3e UPDATE zona post-firma NO lanzó excepción — el trigger de zonas NO está funcionando");
      }
    }
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────
  await supabase.from("fce_fichas_esteticas").delete().eq("id", fichaId);
}

runInmutabilidadTests()
  .catch((e) => {
    fail(`Test 3 lanzó excepción inesperada: ${e instanceof Error ? e.message : String(e)}`);
  })
  .finally(() => {
    // ── Resumen ────────────────────────────────────────────────────────────────
    console.log("\n" + "─".repeat(60));
    console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);

    if (errors.length > 0) {
      console.error("\nErrores:");
      errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    } else {
      console.log("✓ Todos los checks pasaron. Sprint M13 validado.");
      process.exit(0);
    }
  });
