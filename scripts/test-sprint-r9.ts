#!/usr/bin/env tsx
/**
 * Sprint R9 — Tests estáticos: fundamentos módulo prescripciones.
 *
 * Valida sin conexión a DB:
 *   - Archivos de migration generados
 *   - M7 en registry (ModuleId + MODULE_REGISTRY)
 *   - Tipos Prescripcion y MedicamentoCatalogo compilados y exportados
 *   - Helper buscarMedicamentos existe y tiene la firma correcta
 *   - Build 0 errores
 *
 * Los tests de comportamiento en DB (RLS, triggers, folio correlativo) se
 * validan manualmente en Supabase Dashboard después de aplicar las migrations.
 *
 * Ejecutar: npm run test:sprint-r9
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

console.log("\n🧪 Sprint R9 — Fundamentos módulo prescripciones");
console.log(`   Root: ${ROOT}`);

// ── Test 1: Migrations ────────────────────────────────────────────────────
header("Test 1: Archivos de migration generados");

const migrations = [
  "supabase/migrations/20260422_01_medicamentos_catalogo.sql",
  "supabase/migrations/20260422_02_alter_profesionales_prescripcion.sql",
  "supabase/migrations/20260422_03_fce_prescripciones.sql",
  "supabase/migrations/20260422_04_seed_modulo_m7.sql",
];

for (const m of migrations) {
  assert(fileExists(m), `${m.split("/").pop()} existe`);
}

const m1 = readFile("supabase/migrations/20260422_01_medicamentos_catalogo.sql");
assert(m1.includes("CREATE TABLE medicamentos_catalogo"), "Migration 1 crea tabla medicamentos_catalogo");
assert(m1.includes("ENABLE ROW LEVEL SECURITY"), "Migration 1 habilita RLS");
assert(m1.includes("idx_medic_search"), "Migration 1 incluye índice full-text GIN");
assert(m1.includes("select_catalogo"), "Migration 1 define policy select_catalogo");

const m2 = readFile("supabase/migrations/20260422_02_alter_profesionales_prescripcion.sql");
assert(m2.includes("puede_prescribir"), "Migration 2 agrega columna puede_prescribir");
assert(m2.includes("numero_registro"), "Migration 2 agrega columna numero_registro");
assert(m2.includes("DEFAULT false"), "Migration 2 — puede_prescribir default false");

const m3 = readFile("supabase/migrations/20260422_03_fce_prescripciones.sql");
assert(m3.includes("CREATE TABLE fce_prescripciones"), "Migration 3 crea tabla fce_prescripciones");
assert(m3.includes("folio_display"), "Migration 3 incluye columna folio_display generada");
assert(m3.includes("pg_advisory_xact_lock"), "Migration 3 incluye advisory lock para folio");
assert(m3.includes("block_update_signed_prescripcion"), "Migration 3 incluye trigger de inmutabilidad");
assert(m3.includes("assign_folio_prescripcion"), "Migration 3 incluye trigger de folio correlativo");
assert(m3.includes("tenant_isolation_presc"), "Migration 3 define policy tenant isolation");

const m4 = readFile("supabase/migrations/20260422_04_seed_modulo_m7.sql");
assert(m4.includes("M7_prescripciones"), "Migration 4 activa M7 en clinicas");
assert(m4.includes("slug = 'renata'"), "Migration 4 activa en Renata");
assert(m4.includes("slug = 'nuvident'"), "Migration 4 activa en Nuvident");

// ── Test 2: Registry ──────────────────────────────────────────────────────
header("Test 2: Registry — M7 integrado");

const registry = readFile("src/lib/modules/registry.ts");
assert(registry.includes('"M7_prescripciones"'), "ModuleId incluye M7_prescripciones");
assert(registry.includes("M7_prescripciones:"), "MODULE_REGISTRY contiene entrada M7");
assert(registry.includes("Prescripciones e Indicaciones"), "M7 tiene label correcto");
assert(registry.includes('"M1_identificacion"') && registry.includes("dependeDe"), "M7 depende de M1 (dependeDe presente)");
assert(registry.includes("fce_prescripciones"), "M7 lista tablas Supabase de prescripciones");
assert(registry.includes("medicamentos_catalogo"), "M7 lista tabla de catálogo de medicamentos");

// ── Test 3: Tipos TypeScript ──────────────────────────────────────────────
header("Test 3: Tipos TS — prescripcion.ts y medicamento.ts");

assert(fileExists("src/types/prescripcion.ts"), "src/types/prescripcion.ts existe");
assert(fileExists("src/types/medicamento.ts"), "src/types/medicamento.ts existe");

const prescTipo = readFile("src/types/prescripcion.ts");
assert(prescTipo.includes("export interface Prescripcion"), "Prescripcion interfaz exportada");
assert(prescTipo.includes("export interface MedicamentoPrescrito"), "MedicamentoPrescrito interfaz exportada");
assert(prescTipo.includes("export type ModoFirma"), "ModoFirma type exportado");
assert(prescTipo.includes("export type TipoPrescripcion"), "TipoPrescripcion type exportado");
assert(prescTipo.includes("export type ViaAdministracion"), "ViaAdministracion type exportado");
assert(prescTipo.includes("folio_display"), "Prescripcion incluye folio_display");
assert(prescTipo.includes("prof_nombre_snapshot"), "Prescripcion incluye snapshots del profesional");
assert(prescTipo.includes('"impresa" | "canvas"'), "ModoFirma tiene valores correctos");

const medTipo = readFile("src/types/medicamento.ts");
assert(medTipo.includes("export interface MedicamentoCatalogo"), "MedicamentoCatalogo interfaz exportada");
assert(medTipo.includes("principio_activo"), "MedicamentoCatalogo incluye principio_activo");
assert(medTipo.includes("es_controlado"), "MedicamentoCatalogo incluye es_controlado");
assert(medTipo.includes('"seed" | "clinica" | "admin"'), "origen tiene valores correctos");

const indexTs = readFile("src/types/index.ts");
assert(indexTs.includes("Prescripcion"), "index.ts re-exporta Prescripcion");
assert(indexTs.includes("MedicamentoCatalogo"), "index.ts re-exporta MedicamentoCatalogo");
assert(indexTs.includes("ViaAdministracion"), "index.ts re-exporta ViaAdministracion");

// ── Test 4: Helper de catálogo ────────────────────────────────────────────
header("Test 4: Helper src/lib/medicamentos/catalogo.ts");

assert(fileExists("src/lib/medicamentos/catalogo.ts"), "src/lib/medicamentos/catalogo.ts existe");

const catalogo = readFile("src/lib/medicamentos/catalogo.ts");
assert(catalogo.includes("export async function buscarMedicamentos"), "buscarMedicamentos exportada");
assert(catalogo.includes("export async function getMedicamentoPorId"), "getMedicamentoPorId exportada");
assert(catalogo.includes("query.trim().length < 2"), "buscarMedicamentos valida mínimo 2 caracteres");
assert(catalogo.includes(".maybeSingle()"), "getMedicamentoPorId usa maybeSingle");
assert(catalogo.includes("MedicamentoCatalogo"), "helper importa tipo MedicamentoCatalogo");

// ── Test 5: package.json registra el comando ──────────────────────────────
header("Test 5: package.json — comando test:sprint-r9");

const pkg = readFile("package.json");
assert(pkg.includes("test:sprint-r9"), "package.json tiene comando test:sprint-r9");
assert(pkg.includes("test-sprint-r9.ts"), "comando apunta a test-sprint-r9.ts");

// ── Test 6: Build ─────────────────────────────────────────────────────────
header("Test 6: npm run build — 0 errores");

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

// ── Test 7: Lint ──────────────────────────────────────────────────────────
header("Test 7: npm run lint — 0 errores");

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

// ── Resultado ─────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`  Sprint R9 — Resultado: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60));

if (failed > 0) {
  console.error("\n⚠️  Hay fallos. Revisar antes de aplicar migrations en Supabase.\n");
  process.exit(1);
} else {
  console.log("\n✅ Todos los tests pasaron.");
  console.log("   Próximo paso: aplicar las 4 migrations en Supabase Production");
  console.log("   (una a la vez, con verificación entre cada una).\n");
}
