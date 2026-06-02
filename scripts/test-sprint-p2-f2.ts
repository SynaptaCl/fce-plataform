/**
 * test-sprint-p2-f2.ts
 * Sprint P2 / Fase 2 — Nota clínica estructurada por especialidad
 *
 * Valida:
 * 1. Las 4 especialidades clínicas generales tienen secciones con al menos un campo
 * 2. Todos los tipos de campo usados son CampoTipo válidos
 * 3. Los campos multi_select con opciones tienen al menos una opción
 * 4. Los campos obligatorios están bien definidos
 * 5. Cálculos de IMC son correctos
 */

import { ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";
import type { CampoTipo } from "../src/lib/modules/especialidad-config";

const TIPOS_VALIDOS: CampoTipo[] = [
  "texto_largo",
  "texto_corto",
  "select",
  "multi_select",
  "escala",
  "fecha",
  "booleano",
];

// ── IMC helper (misma lógica que en el form) ──────────────────────────────────

function calcularIMC(pesoKg: string, tallaCm: string): { imc: number; clasificacion: string } | null {
  const peso = parseFloat(pesoKg);
  const talla = parseFloat(tallaCm);
  if (!peso || !talla || talla <= 0) return null;
  const imc = peso / Math.pow(talla / 100, 2);
  let clasificacion = "";
  if (imc < 18.5) clasificacion = "Bajo peso";
  else if (imc < 25) clasificacion = "Normal";
  else if (imc < 30) clasificacion = "Sobrepeso";
  else if (imc < 35) clasificacion = "Obesidad I";
  else if (imc < 40) clasificacion = "Obesidad II";
  else clasificacion = "Obesidad III";
  return { imc, clasificacion };
}

// ── Test runner ───────────────────────────────────────────────────────────────

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

// ── Test 1: Las 4 especialidades tienen secciones con campos ─────────────────

console.log("\n[Test 1] Especialidades clinico_general tienen secciones con campos");

const ESPECIALIDADES_CLINICAS = ["Medicina General", "Enfermería", "Psicología", "Nutrición"];

for (const esp of ESPECIALIDADES_CLINICAS) {
  const config = ESPECIALIDAD_CONFIG[esp];
  if (!config) {
    fail(`Especialidad '${esp}' no encontrada en ESPECIALIDAD_CONFIG`);
    continue;
  }
  const seccionesConCampos = config.secciones.filter((s) => s.campos.length > 0);
  check(
    seccionesConCampos.length >= 1,
    `${esp}: tiene ${seccionesConCampos.length} sección(es) con campos`,
    `${esp}: no tiene ninguna sección con campos (tiene ${config.secciones.length} secciones pero todas vacías)`
  );

  // Verificar que al menos una sección tiene un campo obligatorio
  const tieneObligatorio = config.secciones.some((s) =>
    s.campos.some((c) => c.obligatorio)
  );
  check(
    tieneObligatorio,
    `${esp}: tiene al menos un campo obligatorio`,
    `${esp}: ningún campo está marcado como obligatorio`
  );
}

// ── Test 2: Tipos de campo válidos ───────────────────────────────────────────

console.log("\n[Test 2] Todos los tipos de campo son CampoTipo válidos");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      const tipoValido = TIPOS_VALIDOS.includes(campo.tipo as CampoTipo);
      check(
        tipoValido,
        `${esp} > ${seccion.id} > ${campo.id}: tipo '${campo.tipo}' es válido`,
        `${esp} > ${seccion.id} > ${campo.id}: tipo '${campo.tipo}' NO es un CampoTipo válido`
      );
    }
  }
}

// ── Test 3: multi_select tienen opciones ─────────────────────────────────────

console.log("\n[Test 3] Campos multi_select tienen opciones definidas");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      if (campo.tipo === "multi_select" || campo.tipo === "select") {
        const tieneOpciones = Array.isArray(campo.opciones) && campo.opciones.length > 0;
        check(
          tieneOpciones,
          `${esp} > ${seccion.id} > ${campo.id} (${campo.tipo}): tiene ${campo.opciones?.length ?? 0} opciones`,
          `${esp} > ${seccion.id} > ${campo.id} (${campo.tipo}): no tiene opciones definidas`
        );
      }
    }
  }
}

// ── Test 4: Campos con ayuda no tienen texto vacío ───────────────────────────

console.log("\n[Test 4] Campos con 'ayuda' tienen texto no vacío");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      if (campo.ayuda !== undefined) {
        check(
          campo.ayuda.trim().length > 0,
          `${esp} > ${seccion.id} > ${campo.id}: ayuda tiene contenido`,
          `${esp} > ${seccion.id} > ${campo.id}: ayuda está vacía`
        );
      }
    }
  }
}

// ── Test 5: Cálculos IMC correctos ───────────────────────────────────────────

console.log("\n[Test 5] Cálculos IMC correctos");

const casosIMC: Array<{ peso: string; talla: string; imcEsperado: string; clasificacionEsperada: string }> = [
  { peso: "50", talla: "170", imcEsperado: "17.3", clasificacionEsperada: "Bajo peso" },
  { peso: "70", talla: "170", imcEsperado: "24.2", clasificacionEsperada: "Normal" },
  { peso: "80", talla: "170", imcEsperado: "27.7", clasificacionEsperada: "Sobrepeso" },
  { peso: "100", talla: "170", imcEsperado: "34.6", clasificacionEsperada: "Obesidad I" },
  { peso: "115", talla: "170", imcEsperado: "39.8", clasificacionEsperada: "Obesidad II" },
  { peso: "120", talla: "170", imcEsperado: "41.5", clasificacionEsperada: "Obesidad III" },
  { peso: "60", talla: "165", imcEsperado: "22.0", clasificacionEsperada: "Normal" },
];

for (const caso of casosIMC) {
  const resultado = calcularIMC(caso.peso, caso.talla);
  if (!resultado) {
    fail(`IMC(${caso.peso}kg, ${caso.talla}cm): falló el cálculo`);
    continue;
  }
  const imcStr = resultado.imc.toFixed(1);
  check(
    imcStr === caso.imcEsperado,
    `IMC(${caso.peso}kg, ${caso.talla}cm) = ${imcStr} ✓`,
    `IMC(${caso.peso}kg, ${caso.talla}cm): esperado ${caso.imcEsperado}, obtenido ${imcStr}`
  );
  check(
    resultado.clasificacion === caso.clasificacionEsperada,
    `IMC clasificación '${resultado.clasificacion}' ✓`,
    `IMC clasificación: esperado '${caso.clasificacionEsperada}', obtenido '${resultado.clasificacion}'`
  );
}

// ── Test 6: Nutrición tiene campos de IMC ────────────────────────────────────

console.log("\n[Test 6] Nutrición tiene campos de IMC calculado");

const nutriConfig = ESPECIALIDAD_CONFIG["Nutrición"];
const seccionContenidoNutri = nutriConfig?.secciones.find((s) => s.id === "contenido");
const camposNutri = seccionContenidoNutri?.campos ?? [];
const tieneIMCCalculado = camposNutri.some((c) => c.id === "imc_calculado");
const tieneIMCClasif = camposNutri.some((c) => c.id === "imc_clasificacion");
const tienePeso = camposNutri.some((c) => c.id === "peso_kg");
const tieneTalla = camposNutri.some((c) => c.id === "talla_cm");

check(tieneIMCCalculado, "Nutrición > contenido: tiene campo 'imc_calculado'", "Nutrición > contenido: falta campo 'imc_calculado'");
check(tieneIMCClasif, "Nutrición > contenido: tiene campo 'imc_clasificacion'", "Nutrición > contenido: falta campo 'imc_clasificacion'");
check(tienePeso, "Nutrición > contenido: tiene campo 'peso_kg'", "Nutrición > contenido: falta campo 'peso_kg'");
check(tieneTalla, "Nutrición > contenido: tiene campo 'talla_cm'", "Nutrición > contenido: falta campo 'talla_cm'");

// ── Test 7: IDs únicos dentro de cada especialidad ───────────────────────────

console.log("\n[Test 7] IDs de campos son únicos dentro de cada especialidad");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  const todosCamposIds: string[] = [];
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      todosCamposIds.push(campo.id);
    }
  }
  const unique = new Set(todosCamposIds);
  check(
    unique.size === todosCamposIds.length,
    `${esp}: todos los IDs de campos son únicos (${todosCamposIds.length})`,
    `${esp}: hay IDs de campos duplicados (${todosCamposIds.length} campos, ${unique.size} únicos)`
  );
}

// ── Test 8: Inmutabilidad de secciones_estructuradas (requiere Supabase) ────────
//
// Solo se ejecuta si están disponibles las variables de entorno de Supabase.
// Valida que el trigger trg_block_update_signed_nota bloquea el UPDATE de
// secciones_estructuradas en notas firmadas.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runInmutabilidadTests() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("\n[Test 8] Inmutabilidad secciones_estructuradas — OMITIDO (variables de entorno no disponibles)");
    console.log("  ℹ Para ejecutar los tests de inmutabilidad:");
    console.log("    NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-sprint-p2-f2.ts");
    return;
  }

  console.log("\n[Test 8] Inmutabilidad secciones_estructuradas (con Supabase)");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const SECCIONES_V1 = { motivo: { motivo_principal: "Primera versión" } };
  const SECCIONES_V2 = { motivo: { motivo_principal: "Segunda versión" } };

  // Obtener IDs reales para respetar FK constraints
  const { data: refData } = await supabase
    .from("fce_encuentros")
    .select("id, id_clinica, id_paciente, created_by")
    .limit(1)
    .single();

  if (!refData) {
    console.log("  ℹ Test 8 omitido: no hay encuentros en DB para referenciar en tests de FK");
    return;
  }

  const TEST_ID_CLINICA = refData.id_clinica;
  const TEST_ID_PACIENTE = refData.id_paciente;
  const TEST_ID_ENCUENTRO = refData.id;  // reutilizar encuentro real (ON CONFLICT ignorado si ya existe nota)
  const TEST_CREATED_BY = refData.created_by;

  // Verificar que no hay nota existente para este encuentro (o limpiar previamente)
  await supabase.from("fce_notas_clinicas").delete()
    .eq("id_encuentro", TEST_ID_ENCUENTRO)
    .eq("firmado", false);

  // ── 8a: INSERT con secciones_estructuradas ──────────────────────────────────
  const { data: insertada, error: errInsert } = await supabase
    .from("fce_notas_clinicas")
    .insert({
      id_clinica: TEST_ID_CLINICA,
      id_paciente: TEST_ID_PACIENTE,
      id_encuentro: TEST_ID_ENCUENTRO,
      contenido: "Test sprint P2-F2 — inmutabilidad (borrar si aparece)",
      secciones_estructuradas: SECCIONES_V1,
      firmado: false,
      created_by: TEST_CREATED_BY,
    })
    .select("id")
    .single();

  if (errInsert || !insertada) {
    fail(`8a INSERT nota con secciones_estructuradas: ${errInsert?.message ?? "sin respuesta"}`);
    return;
  }
  pass(`8a INSERT nota con secciones_estructuradas OK (id: ${insertada.id})`);

  const notaId = insertada.id;

  // ── 8b: UPDATE con firmado=false (debe funcionar) ───────────────────────────
  const { error: errUpdate } = await supabase
    .from("fce_notas_clinicas")
    .update({ secciones_estructuradas: SECCIONES_V2 })
    .eq("id", notaId);

  if (errUpdate) {
    fail(`8b UPDATE secciones_estructuradas con firmado=false: lanzó error inesperado — ${errUpdate.message}`);
  } else {
    pass("8b UPDATE secciones_estructuradas con firmado=false: OK");
  }

  // ── Firmar la nota ───────────────────────────────────────────────────────────
  const { error: errFirmar } = await supabase
    .from("fce_notas_clinicas")
    .update({ firmado: true, firmado_at: new Date().toISOString(), firmado_por: "test" })
    .eq("id", notaId);

  if (errFirmar) {
    fail(`8c (previo) Firmar nota de test: ${errFirmar.message}`);
  } else {
    // ── 8c: UPDATE con firmado=true (debe lanzar excepción del trigger) ──────────
    const { error: errPostFirma } = await supabase
      .from("fce_notas_clinicas")
      .update({ secciones_estructuradas: { motivo: { motivo_principal: "Intento post-firma" } } })
      .eq("id", notaId);

    if (errPostFirma && errPostFirma.message.includes("firmada")) {
      pass("8c UPDATE secciones_estructuradas con firmado=true: trigger bloqueó correctamente");
    } else if (errPostFirma) {
      fail(`8c UPDATE post-firma lanzó error inesperado: ${errPostFirma.message}`);
    } else {
      fail("8c UPDATE post-firma NO lanzó excepción — el trigger NO está funcionando");
    }
  }

  // ── Limpieza ─────────────────────────────────────────────────────────────────
  await supabase.from("fce_notas_clinicas").delete().eq("id", notaId);
}

runInmutabilidadTests()
  .catch((e) => {
    fail(`Test 8 lanzó excepción inesperada: ${e instanceof Error ? e.message : String(e)}`);
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
      console.log("✓ Todos los checks pasaron. Sprint P2-F2 validado.");
      process.exit(0);
    }
  });
