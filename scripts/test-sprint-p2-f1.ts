/**
 * test-sprint-p2-f1.ts
 *
 * Script de validación del Sprint P2 Fase 1.
 * Verifica que todos los instrumentosSugeridos en especialidad-config.ts
 * y servicio-config.ts correspondan a códigos válidos en la DB.
 *
 * USO: npx tsx scripts/test-sprint-p2-f1.ts
 *
 * Sale con código 0 si todo OK, código 1 si hay errores.
 */

import { ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";
import { getServicioContexto } from "../src/lib/modules/servicio-config";

// ── Códigos válidos en DB ─────────────────────────────────────────────────────

const CODIGOS_VALIDOS = new Set([
  "eva", "barthel", "ados2", "adir", "cars2", "brief2", "vineland3",
  "sensory_profile", "wisc5", "wppsi", "conners3", "phq9", "gad7",
  "mmse", "glasgow", "downton", "lawton", "apgar", "braden",
  "corah_ansiedad", "cpod", "oleary", "indice_gingival", "ipc",
]);

// ── Palabras clave de servicios para probar todos los contextos ───────────────

const SERVICIO_KEYWORDS_TEST = [
  "autismo tea ados adi-r",
  "tdah déficit atencional",
  "wisc evaluación",
  "wais adultos",
  "nutricional nutrición",
  "kinesiológica rehabilitación",
  "plantillas ortopédicas",
  "terapia de pareja",
];

// ── Utils ─────────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function section(title: string) { console.log(`\n── ${title} ──`); }

// ── Main ──────────────────────────────────────────────────────────────────────

function run() {
  let errCount = 0;

  // ── Sección 1: especialidad-config.ts ─────────────────────────────────────

  section("especialidad-config.ts — instrumentosSugeridos");

  for (const [especialidad, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
    for (const codigo of config.instrumentosSugeridos) {
      if (CODIGOS_VALIDOS.has(codigo)) {
        ok(`[${especialidad}] ${codigo}`);
      } else {
        fail(`[${especialidad}] código inválido: "${codigo}"`);
        errCount++;
      }
    }
  }

  // ── Sección 2: servicio-config.ts ─────────────────────────────────────────

  section("servicio-config.ts — instrumentosSugeridos por servicio");

  const serviciosVistos = new Set<string>();

  for (const nombreServicio of SERVICIO_KEYWORDS_TEST) {
    const contexto = getServicioContexto(nombreServicio);
    if (!contexto) continue;

    // Deduplicar por lista de códigos para no repetir la misma entrada
    const clave = contexto.instrumentosSugeridos.join(",");
    if (serviciosVistos.has(clave)) continue;
    serviciosVistos.add(clave);

    for (const codigo of contexto.instrumentosSugeridos) {
      if (CODIGOS_VALIDOS.has(codigo)) {
        ok(`[servicio "${nombreServicio}"] ${codigo}`);
      } else {
        fail(`[servicio "${nombreServicio}"] código inválido: "${codigo}"`);
        errCount++;
      }
    }
  }

  // ── Resultado ─────────────────────────────────────────────────────────────

  console.log("\n── Resultado ──");

  if (errCount > 0) {
    console.error(`❌ Se encontraron ${errCount} código(s) inválido(s). Ver detalles arriba.`);
    process.exitCode = 1;
  } else {
    console.log("✅ Todos los códigos de instrumentos son válidos.");
  }
}

run();
