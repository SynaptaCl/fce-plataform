#!/usr/bin/env tsx
/**
 * Sprint R10 — Tests estáticos: UI de prescripciones.
 *
 * Valida sin conexión a DB:
 *   - ProfesionalPerfil extendido con campos de prescripción
 *   - lib/prescripciones (validations, snapshot, plantillas)
 *   - Server actions de prescripciones (4 funciones exportadas)
 *   - Componentes shared de prescripción (8 componentes)
 *   - Integración en páginas de encuentro (clinico + rehab)
 *   - Build 0 errores
 *   - Lint 0 errores
 *
 * Ejecutar: npm run test:sprint-r10
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = resolve(process.cwd());

// ============================================================================
// Helpers
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

// ============================================================================
// MAIN
// ============================================================================

console.log("\n🧪 Sprint R10 — UI de prescripciones");
console.log(`   Root: ${ROOT}`);

// ── Test 1: ProfesionalPerfil extensions ─────────────────────────────────────
header("Test 1: ProfesionalPerfil — campos de prescripción");

const profesional = readFile("src/lib/fce/profesional.ts");
assert(fileExists("src/lib/fce/profesional.ts"), "src/lib/fce/profesional.ts existe");
assert(profesional.includes("puede_prescribir"), "ProfesionalPerfil tiene puede_prescribir");
assert(profesional.includes("numero_registro"), "ProfesionalPerfil tiene numero_registro");
assert(profesional.includes("tipo_registro"), "ProfesionalPerfil tiene tipo_registro");
assert(profesional.includes("rut"), "ProfesionalPerfil tiene rut");
assert(profesional.includes("export async function getProfesionalActivo"), "getProfesionalActivo exportada");
assert(
  profesional.includes("puede_prescribir") && profesional.includes("numero_registro") && profesional.includes("tipo_registro"),
  "SELECT en getProfesionalesDelUsuario incluye puede_prescribir, numero_registro, tipo_registro"
);

// ── Test 2: lib/prescripciones ────────────────────────────────────────────────
header("Test 2: lib/prescripciones — validations, snapshot, plantillas");

assert(fileExists("src/lib/prescripciones/validations.ts"), "src/lib/prescripciones/validations.ts existe");
const validations = readFile("src/lib/prescripciones/validations.ts");
assert(validations.includes("export const MedicamentoPrescritoSchema"), "MedicamentoPrescritoSchema exportado");
assert(
  validations.includes("export const PrescripcionInputSchema") && validations.includes("discriminatedUnion"),
  "PrescripcionInputSchema exportado con discriminatedUnion"
);

assert(fileExists("src/lib/prescripciones/snapshot.ts"), "src/lib/prescripciones/snapshot.ts existe");
const snapshot = readFile("src/lib/prescripciones/snapshot.ts");
assert(snapshot.includes("export function buildProfesionalSnapshot"), "buildProfesionalSnapshot exportada");
assert(snapshot.includes("export interface ProfesionalSnapshot"), "ProfesionalSnapshot exportada");

assert(fileExists("src/lib/prescripciones/plantillas.ts"), "src/lib/prescripciones/plantillas.ts existe");
const plantillas = readFile("src/lib/prescripciones/plantillas.ts");
assert(plantillas.includes("export const PLANTILLAS_GENERALES"), "PLANTILLAS_GENERALES exportado");
// Count entries: each entry has an `id: "..."` string value (not the interface `id: string;`)
const plantillaEntries = (plantillas.match(/\bid:\s+"[^"]+"/g) ?? []).length;
assert(plantillaEntries === 7, `PLANTILLAS_GENERALES tiene 7 entradas (encontradas: ${plantillaEntries})`);

// ── Test 3: Server action ──────────────────────────────────────────────────────
header("Test 3: Server action — src/app/actions/prescripciones.ts");

assert(fileExists("src/app/actions/prescripciones.ts"), "src/app/actions/prescripciones.ts existe");
const actions = readFile("src/app/actions/prescripciones.ts");
assert(actions.includes("export async function createAndSignPrescripcion"), "createAndSignPrescripcion exportada");
assert(actions.includes("export async function getPrescripcionesByPatient"), "getPrescripcionesByPatient exportada");
assert(actions.includes("export async function getPrescripcionById"), "getPrescripcionById exportada");
assert(actions.includes("export async function searchMedicamentos"), "searchMedicamentos exportada");
assert(
  actions.includes("assertPuedeFirmar"),
  "Valida assertPuedeFirmar (importado de guards)"
);
assert(actions.includes("revalidatePath"), "Usa revalidatePath");
assert(
  actions.includes("PrescripcionInputSchema") && actions.includes(".safeParse"),
  "Usa PrescripcionInputSchema para validar input"
);

// ── Test 4: Componentes ───────────────────────────────────────────────────────
header("Test 4: Componentes shared de prescripción");

assert(fileExists("src/components/shared/PrescripcionLauncher.tsx"), "PrescripcionLauncher.tsx existe");
const launcher = readFile("src/components/shared/PrescripcionLauncher.tsx");
assert(
  launcher.includes("session.profesionalActivo"),
  "PrescripcionLauncher usa session.profesionalActivo"
);
assert(
  launcher.includes("M7_prescripciones"),
  "PrescripcionLauncher chequea M7_prescripciones"
);

assert(fileExists("src/components/shared/PrescripcionForm.tsx"), "PrescripcionForm.tsx existe");
const form = readFile("src/components/shared/PrescripcionForm.tsx");
assert(
  form.includes("createAndSignPrescripcion"),
  "PrescripcionForm llama createAndSignPrescripcion"
);

assert(fileExists("src/components/shared/MedicamentoSelector.tsx"), "MedicamentoSelector.tsx existe");
const selector = readFile("src/components/shared/MedicamentoSelector.tsx");
assert(
  selector.includes("300"),
  "MedicamentoSelector tiene debounce 300"
);

assert(fileExists("src/components/shared/MedicamentoCard.tsx"), "MedicamentoCard.tsx existe");
assert(fileExists("src/components/shared/MedicamentoEditor.tsx"), "MedicamentoEditor.tsx existe");

assert(fileExists("src/components/shared/IndicacionGeneralEditor.tsx"), "IndicacionGeneralEditor.tsx existe");
const indicacionEditor = readFile("src/components/shared/IndicacionGeneralEditor.tsx");
assert(
  indicacionEditor.includes("PLANTILLAS_GENERALES"),
  "IndicacionGeneralEditor usa PLANTILLAS_GENERALES"
);

assert(fileExists("src/components/shared/PrescripcionFirmaPanel.tsx"), "PrescripcionFirmaPanel.tsx existe");
assert(fileExists("src/components/shared/PrescripcionList.tsx"), "PrescripcionList.tsx existe");

// ── Test 5: Integración en páginas de encuentro ────────────────────────────────
header("Test 5: Integración — PrescripcionLauncher en páginas de encuentro");

const clinicoPage = readFile(
  "src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/clinico/page.tsx"
);
assert(
  clinicoPage.includes("PrescripcionLauncher"),
  "clinico/page.tsx tiene PrescripcionLauncher"
);

const rehabPage = readFile(
  "src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/rehab/page.tsx"
);
assert(
  rehabPage.includes("PrescripcionLauncher"),
  "rehab/page.tsx tiene PrescripcionLauncher"
);

// ── Test 6: dashboard/layout.tsx usa getProfesionalActivo + pasa profesionalActivo ──
header("Test 6: dashboard/layout.tsx — integración R10");

const dashLayout = readFile("src/app/dashboard/layout.tsx");
assert(
  dashLayout.includes("getProfesionalActivo"),
  "dashboard/layout.tsx importa y usa getProfesionalActivo"
);
assert(
  dashLayout.includes("profesionalActivo"),
  "dashboard/layout.tsx pasa profesionalActivo al provider"
);

// ── Test 7: Build ─────────────────────────────────────────────────────────────
header("Test 7: npm run build — 0 errores");

try {
  execSync("npm run build", {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  assert(true, "npm run build exitoso");
} catch (e: unknown) {
  const err = e as { stdout?: string; stderr?: string };
  const output = (err.stdout ?? "") + (err.stderr ?? "");
  assert(false, "npm run build exitoso", output.slice(-800));
}

// ── Test 8: Lint ──────────────────────────────────────────────────────────────
header("Test 8: npm run lint — 0 errores");

try {
  execSync("npm run lint", {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  assert(true, "npm run lint exitoso");
} catch (e: unknown) {
  const err = e as { stdout?: string; stderr?: string };
  const output = (err.stdout ?? "") + (err.stderr ?? "");
  assert(false, "npm run lint exitoso", output.slice(-800));
}

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`  Sprint R10 — Resultado: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60));

if (failed > 0) {
  console.error("\n⚠️  Hay fallos. Revisar antes de continuar con R11.\n");
  process.exit(1);
} else {
  console.log("\n✅ Todos los tests pasaron.");
  console.log("   Próximo paso: aplicar las 4 migrations R9 en Supabase Production");
  console.log("   y luego continuar con R11 (PDF + timeline de prescripciones).\n");
}
