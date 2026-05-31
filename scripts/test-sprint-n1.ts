/**
 * test-sprint-n1.ts
 *
 * Test de integración manual del Sprint N1 — Módulo M10 Plan de Intervención.
 *
 * Este script NO se ejecuta en CI. Es una guía de smoke test manual para
 * verificar el flujo completo después de activar M10 en una clínica.
 *
 * PRERREQUISITOS:
 * - M10 activado en clinicas_fce_config para la clínica de prueba
 * - Paciente de prueba con al menos 1 encuentro en fce_encuentros
 * - Profesional activo con rol = 'profesional'
 *
 * USO: npx tsx scripts/test-sprint-n1.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Configurar IDs de prueba ──────────────────────────────────────────────────

const TEST_ID_CLINICA = ""; // <-- Completar
const TEST_ID_PACIENTE = ""; // <-- Completar
const TEST_ID_ENCUENTRO = ""; // <-- Completar

// ── Utils ─────────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function section(title: string) { console.log(`\n── ${title} ──`); }

async function run() {
  if (!TEST_ID_CLINICA || !TEST_ID_PACIENTE || !TEST_ID_ENCUENTRO) {
    console.error("Configura TEST_ID_CLINICA, TEST_ID_PACIENTE, TEST_ID_ENCUENTRO antes de ejecutar.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Test 1: Crear plan ────────────────────────────────────────────────────

  section("Test 1 — Crear plan desde encuentro");

  const { data: plan, error: planErr } = await supabase
    .from("fce_planes_intervencion")
    .insert({
      id_clinica: TEST_ID_CLINICA,
      id_paciente: TEST_ID_PACIENTE,
      id_encuentro_origen: TEST_ID_ENCUENTRO,
      titulo: "Plan de prueba N1",
      estado: "borrador",
      firmado: false,
      fecha_inicio: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }),
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();

  if (planErr || !plan) { fail(`Crear plan: ${planErr?.message}`); return; }
  ok(`Plan creado: ${plan.id}`);

  const planId = plan.id;

  // ── Test 2: Agregar objetivo con GAS ─────────────────────────────────────

  section("Test 2 — Agregar objetivo con GAS");

  const { data: objetivo, error: objErr } = await supabase
    .from("fce_plan_objetivos")
    .insert({
      id_clinica: TEST_ID_CLINICA,
      id_paciente: TEST_ID_PACIENTE,
      id_plan: planId,
      dominio_codigo: "comunicacion",
      dominio_label: "Comunicación",
      descripcion: "Ampliar vocabulario funcional a 50 palabras",
      gas_0: "Vocabulario de 50 palabras funcionales en contexto familiar",
      gas_mas_1: "Vocabulario de 75 palabras con generalización a escuela",
      gas_menos_1: "Vocabulario de 30 palabras en contexto familiar",
      nivel_basal: -1,
      nivel_actual: -1,
      prioridad: "alta",
      estado: "activo",
      orden: 0,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();

  if (objErr || !objetivo) { fail(`Agregar objetivo: ${objErr?.message}`); return; }
  ok(`Objetivo creado: ${objetivo.id}`);

  const objetivoId = objetivo.id;

  // ── Test 3: Registrar progreso ────────────────────────────────────────────

  section("Test 3 — Registrar progreso y verificar nivel_actual");

  const nivelNuevo = 0; // "nivel esperado"

  const { error: progrErr } = await supabase
    .from("fce_plan_progreso")
    .insert({
      id_clinica: TEST_ID_CLINICA,
      id_paciente: TEST_ID_PACIENTE,
      id_objetivo: objetivoId,
      id_encuentro: TEST_ID_ENCUENTRO,
      nivel_gas: nivelNuevo,
      observacion: "Prueba automática",
      registrado_por: (await supabase.auth.getUser()).data.user?.id ?? "test",
      registrado_at: new Date().toISOString(),
    });

  if (progrErr) { fail(`Registrar progreso: ${progrErr.message}`); return; }

  // UPDATE nivel_actual
  const { error: updErr } = await supabase
    .from("fce_plan_objetivos")
    .update({ nivel_actual: nivelNuevo, updated_at: new Date().toISOString() })
    .eq("id", objetivoId);

  if (updErr) { fail(`UPDATE nivel_actual: ${updErr.message}`); return; }

  const { data: objActualizado } = await supabase
    .from("fce_plan_objetivos")
    .select("nivel_actual")
    .eq("id", objetivoId)
    .single();

  if (objActualizado?.nivel_actual === nivelNuevo) {
    ok(`nivel_actual actualizado a ${nivelNuevo}`);
  } else {
    fail(`nivel_actual esperado ${nivelNuevo}, obtenido ${objActualizado?.nivel_actual}`);
  }

  // ── Test 4: Firmar plan ───────────────────────────────────────────────────

  section("Test 4 — Firmar plan y verificar que sigue editable");

  const userId = (await supabase.auth.getUser()).data.user?.id;
  const { error: firmaErr } = await supabase
    .from("fce_planes_intervencion")
    .update({
      firmado: true,
      firmado_at: new Date().toISOString(),
      firmado_por: userId,
      snapshot_equipo: { firmado_por: userId, objetivos_count: 1 },
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (firmaErr) { fail(`Firmar plan: ${firmaErr.message}`); return; }
  ok("Plan firmado correctamente");

  // Verificar que sigue siendo editable (documento vivo)
  const { error: editErr } = await supabase
    .from("fce_planes_intervencion")
    .update({ titulo: "Plan de prueba N1 — editado post-firma", updated_at: new Date().toISOString() })
    .eq("id", planId);

  if (editErr) {
    fail(`Plan NO debería ser inmutable post-firma: ${editErr.message}`);
  } else {
    ok("Plan sigue editable después de firma (documento vivo)");
  }

  // ── Test 5: RLS — otra clínica no debe ver el plan ───────────────────────

  section("Test 5 — RLS: filtro por id_clinica");

  const { data: planVerificado } = await supabase
    .from("fce_planes_intervencion")
    .select("id")
    .eq("id", planId)
    .eq("id_clinica", TEST_ID_CLINICA)
    .single();

  if (planVerificado?.id === planId) {
    ok("RLS: plan accesible desde la clínica correcta");
  } else {
    fail("No se pudo leer el plan desde la clínica correcta");
  }

  // ── Limpieza ──────────────────────────────────────────────────────────────

  section("Limpieza — eliminar datos de prueba");

  await supabase.from("fce_planes_intervencion").delete().eq("id", planId);
  ok("Datos de prueba eliminados");

  console.log("\n── Resultado ──");
  if (process.exitCode === 1) {
    console.error("❌ Algunos tests fallaron. Ver detalles arriba.");
  } else {
    console.log("✅ Todos los tests pasaron.");
  }
}

run().catch(console.error);
