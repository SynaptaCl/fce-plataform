#!/usr/bin/env tsx
/**
 * Sprint R7 — Regression tests para migración Korporis + no-regresión Renata.
 *
 * Tests de sistema de archivos (sin DB ni HTTP).
 * Valida: existencia de archivos, exports, redirects en next.config, ausencia de imports stale.
 *
 * Ejecutar: npm run test:sprint-r7
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, "src");

// ============================================================================
// Helpers de test
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? `\n     ${detail}` : ""}`);
    failed++;
  }
}

function header(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function fileExists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath));
}

function readFile(relativePath: string): string {
  try {
    return readFileSync(resolve(ROOT, relativePath), "utf-8");
  } catch {
    return "";
  }
}

function grepSrc(pattern: string): number {
  try {
    const result = execSync(
      `grep -r "${pattern}" "${SRC}" --include="*.ts" --include="*.tsx" -l`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const lines = result.trim().split("\n").filter(Boolean);
    return lines.length;
  } catch {
    // grep exits with code 1 when no matches — that's 0 hits
    return 0;
  }
}

// ============================================================================
// MAIN
// ============================================================================

console.log("\n🧪 Sprint R7 — Tests de regresión: Korporis rehab + Renata clinico");
console.log(`   Root: ${ROOT}`);

// ── Test 1 ────────────────────────────────────────────────────────────────
header("Test 1: rehab/page.tsx existe");
const rehabPagePath =
  "src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/rehab/page.tsx";
assert(
  fileExists(rehabPagePath),
  "rehab/page.tsx existe",
  `Buscado en: ${rehabPagePath}`
);

// ── Test 2 ────────────────────────────────────────────────────────────────
header("Test 2: components/rehab/ contiene los 6 archivos");
const rehabComponents = [
  "SoapForm.tsx",
  "CifMapper.tsx",
  "KinesiologiaEval.tsx",
  "FonoaudiologiaEval.tsx",
  "MasoterapiaEval.tsx",
  "GenericEval.tsx",
];
for (const file of rehabComponents) {
  const path = `src/components/rehab/${file}`;
  assert(fileExists(path), `components/rehab/${file} existe`, `Buscado en: ${path}`);
}

// ── Test 3 ────────────────────────────────────────────────────────────────
header("Test 3: components/rehab/index.ts existe y exporta los 6 componentes");
const indexPath = "src/components/rehab/index.ts";
assert(fileExists(indexPath), "components/rehab/index.ts existe");

const indexContent = readFile(indexPath);
const expectedExports = [
  "SoapForm",
  "CifMapper",
  "KinesiologiaEval",
  "FonoaudiologiaEval",
  "MasoterapiaEval",
  "GenericEval",
];
for (const name of expectedExports) {
  assert(
    indexContent.includes(name),
    `index.ts exporta ${name}`,
    `No se encontró "${name}" en index.ts`
  );
}

// ── Test 4 ────────────────────────────────────────────────────────────────
header("Test 4: actions/rehab/soap.ts existe y exporta las funciones esperadas");
const soapPath = "src/app/actions/rehab/soap.ts";
assert(fileExists(soapPath), "actions/rehab/soap.ts existe");

const soapContent = readFile(soapPath);
for (const fn of ["getSoapNotes", "upsertSoapNote", "signSoapNote"]) {
  assert(
    soapContent.includes(fn),
    `actions/rehab/soap.ts exporta ${fn}`,
    `No se encontró "${fn}" en soap.ts`
  );
}

// ── Test 5 ────────────────────────────────────────────────────────────────
header("Test 5: actions/rehab/evaluacion.ts existe y exporta las funciones esperadas");
const evalPath = "src/app/actions/rehab/evaluacion.ts";
assert(fileExists(evalPath), "actions/rehab/evaluacion.ts existe");

const evalContent = readFile(evalPath);
for (const fn of ["getEvaluaciones", "upsertEvaluacion"]) {
  assert(
    evalContent.includes(fn),
    `actions/rehab/evaluacion.ts exporta ${fn}`,
    `No se encontró "${fn}" en evaluacion.ts`
  );
}

// ── Test 6 ────────────────────────────────────────────────────────────────
header("Test 6: rutas legacy eliminadas (evolucion/page.tsx y evaluacion/page.tsx)");
const legacyEvolucion =
  "src/app/dashboard/pacientes/[id]/evolucion/page.tsx";
const legacyEvaluacion =
  "src/app/dashboard/pacientes/[id]/evaluacion/page.tsx";

assert(
  !fileExists(legacyEvolucion),
  "evolucion/page.tsx NO existe (eliminada)",
  `Encontrada en: ${legacyEvolucion}`
);
assert(
  !fileExists(legacyEvaluacion),
  "evaluacion/page.tsx NO existe (eliminada)",
  `Encontrada en: ${legacyEvaluacion}`
);

// ── Test 7 ────────────────────────────────────────────────────────────────
header("Test 7: next.config.ts contiene redirects de /evolucion y /evaluacion con permanent: false");
const nextConfigContent = readFile("next.config.ts");

assert(
  nextConfigContent.includes("/evolucion"),
  "next.config.ts contiene redirect de /evolucion",
  'No se encontró "/evolucion" en next.config.ts'
);
assert(
  nextConfigContent.includes("/evaluacion"),
  "next.config.ts contiene redirect de /evaluacion",
  'No se encontró "/evaluacion" en next.config.ts'
);
assert(
  nextConfigContent.includes("permanent: false"),
  "next.config.ts usa permanent: false",
  'No se encontró "permanent: false" en next.config.ts'
);

// ── Test 8 ────────────────────────────────────────────────────────────────
header('Test 8: sin imports estale a rutas antiguas (actions/soap y actions/evaluacion sin rehab/)');

const staleImportsSoap = grepSrc('from "@/app/actions/soap"');
assert(
  staleImportsSoap === 0,
  `0 hits de 'from "@/app/actions/soap"' en src/`,
  `Encontrados ${staleImportsSoap} archivo(s) con import estale a actions/soap`
);

const staleImportsEval = grepSrc('from "@/app/actions/evaluacion"');
assert(
  staleImportsEval === 0,
  `0 hits de 'from "@/app/actions/evaluacion"' en src/`,
  `Encontrados ${staleImportsEval} archivo(s) con import estale a actions/evaluacion`
);

// ── Test 9 ────────────────────────────────────────────────────────────────
header("Test 9: sin nav links estale a /evolucion o /evaluacion");

const staleNavEvolucion = grepSrc("href=.*evolucion");
assert(
  staleNavEvolucion === 0,
  '0 hits de href=.*evolucion en src/',
  `Encontrados ${staleNavEvolucion} archivo(s) con link estale a /evolucion`
);

const staleNavEvaluacion = grepSrc("href=.*evaluacion");
assert(
  staleNavEvaluacion === 0,
  '0 hits de href=.*evaluacion en src/',
  `Encontrados ${staleNavEvaluacion} archivo(s) con link estale a /evaluacion`
);

// ── Test 10 ────────────────────────────────────────────────────────────────
header("Test 10: Renata no-regresión — clinico/page.tsx existe");
const clinicoPagePath =
  "src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/clinico/page.tsx";
assert(
  fileExists(clinicoPagePath),
  "clinico/page.tsx existe",
  `Buscado en: ${clinicoPagePath}`
);

// ── Test 11 ────────────────────────────────────────────────────────────────
header("Test 11: Renata no-regresión — componentes clinico intactos");
const notaClinicaPath = "src/components/clinico/NotaClinicaForm.tsx";
const instrumentosPanelPath = "src/components/clinico/InstrumentosPanel.tsx";

assert(
  fileExists(notaClinicaPath),
  "src/components/clinico/NotaClinicaForm.tsx existe",
  `Buscado en: ${notaClinicaPath}`
);
assert(
  fileExists(instrumentosPanelPath),
  "src/components/clinico/InstrumentosPanel.tsx existe",
  `Buscado en: ${instrumentosPanelPath}`
);

// ── Resultado final ────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
const total = passed + failed;
if (failed === 0) {
  console.log(`\n✅ TODOS LOS TESTS PASARON: ${passed}/${total}\n`);
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} test(s) fallaron de ${total}\n`);
  process.exit(1);
}
