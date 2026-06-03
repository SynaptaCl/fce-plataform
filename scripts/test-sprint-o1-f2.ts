/**
 * test-sprint-o1-f2.ts — Validación Sprint O1 Fase 2: CLI onboarding con templates
 *
 * Verifica:
 * 1. Los 4 templates existen y tienen estructura válida
 * 2. Todas las especialidades de cada template están en ESPECIALIDADES_REGISTRY
 * 3. Generación de SQL con --dry-run para cada template (sintaxis básica)
 * 4. El archivo onboard-clinica.ts existe con las funciones esperadas
 * 5. package.json tiene el script onboard:clinica
 *
 * USO: npx tsx scripts/test-sprint-o1-f2.ts
 * Sale con código 0 si OK, código 1 si hay errores.
 */

import * as fs from "fs";
import * as path from "path";
import { TEMPLATES, TEMPLATE_NAMES } from "./onboarding-templates/index";
import { ESPECIALIDADES_REGISTRY } from "../src/lib/modules/registry";
import { generarSQL } from "./onboard-clinica";

const ROOT = path.resolve(__dirname, "..");
let errors = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    errors++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ── 1. Templates registrados ───────────────────────────────────────────────────

section("Registro de templates");

const EXPECTED_TEMPLATE_NAMES = [
  "multidisciplinaria-rehab-psi",
  "medica-general",
  "dental",
  "mixta-completa",
];

for (const name of EXPECTED_TEMPLATE_NAMES) {
  check(TEMPLATE_NAMES.includes(name), `Template "${name}" registrado en TEMPLATES`);
  check(TEMPLATES[name] !== undefined, `Template "${name}" importable`);
}

// ── 2. Estructura de cada template ────────────────────────────────────────────

section("Estructura de cada template");

for (const [name, template] of Object.entries(TEMPLATES)) {
  console.log(`\n  [${name}]`);

  check(typeof template.nombre === "string" && template.nombre.length > 0, "tiene nombre");
  check(typeof template.descripcion === "string" && template.descripcion.length > 0, "tiene descripcion");
  check(Array.isArray(template.modulos) && template.modulos.length > 0, "tiene módulos");
  check(Array.isArray(template.especialidades) && template.especialidades.length > 0, "tiene especialidades");
  check(typeof template.permisosPorEspecialidad === "object", "tiene permisosPorEspecialidad");
  check(Array.isArray(template.notas) && template.notas.length > 0, "tiene notas");

  // Módulos obligatorios
  check(template.modulos.includes("M1_identificacion"), "incluye M1_identificacion (obligatorio)");
  check(template.modulos.includes("M6_auditoria"), "incluye M6_auditoria (obligatorio)");
}

// ── 3. Especialidades válidas en cada template ─────────────────────────────────

section("Especialidades en catálogo (ESPECIALIDADES_REGISTRY)");

for (const [name, template] of Object.entries(TEMPLATES)) {
  console.log(`\n  [${name}]`);
  for (const esp of template.especialidades) {
    const enRegistry = esp in ESPECIALIDADES_REGISTRY;
    check(enRegistry, `"${esp}" existe en ESPECIALIDADES_REGISTRY`);
    if (!enRegistry) {
      console.error(`    → Especialidades válidas: ${Object.keys(ESPECIALIDADES_REGISTRY).join(", ")}`);
    }
  }
}

// ── 4. Generación de SQL (sintaxis básica) ────────────────────────────────────

section("Generación de SQL — sintaxis básica");

const FECHA_TEST = "2026-06-03T12:00:00.000Z";

for (const [name, template] of Object.entries(TEMPLATES)) {
  console.log(`\n  [${name}]`);
  const testSlug = `test-${name}`;

  let sql: string;
  try {
    sql = generarSQL(testSlug, template, FECHA_TEST);
  } catch (err) {
    check(false, `generarSQL() no lanza excepción: ${String(err)}`);
    continue;
  }

  check(typeof sql === "string" && sql.length > 0, "generarSQL() retorna string no vacío");
  check(sql.includes("BEGIN;"), "SQL contiene BEGIN;");
  check(sql.includes("COMMIT;"), "SQL contiene COMMIT;");
  check(sql.includes("UPDATE clinicas_fce_config"), "SQL contiene UPDATE clinicas_fce_config");
  check(sql.includes(`slug = '${testSlug}'`), `SQL referencia slug '${testSlug}'`);
  check(sql.includes("modulos_activos"), "SQL incluye modulos_activos");
  check(sql.includes("especialidades_activas"), "SQL incluye especialidades_activas");
  check(sql.includes("SELECT"), "SQL incluye SELECT de verificación");

  // Verificar que cada especialidad del template aparece en el SQL generado
  for (const esp of template.especialidades) {
    check(sql.includes(`'${esp}'`), `SQL incluye especialidad '${esp}'`);
  }

  // Verificar que cada módulo aparece en el SQL
  for (const mod of template.modulos) {
    check(sql.includes(`'${mod}'`), `SQL incluye módulo '${mod}'`);
  }
}

// ── 5. Archivo CLI existe y exporta generarSQL ────────────────────────────────

section("Archivo onboard-clinica.ts");

const cliPath = path.join(ROOT, "scripts", "onboard-clinica.ts");
const cliContent = fs.existsSync(cliPath) ? fs.readFileSync(cliPath, "utf-8") : null;

check(cliContent !== null, "scripts/onboard-clinica.ts existe");

if (cliContent) {
  check(cliContent.includes("export function generarSQL"), "exporta generarSQL()");
  check(cliContent.includes("--dry-run"), "soporta --dry-run");
  check(cliContent.includes("--force"), "soporta --force");
  check(cliContent.includes("--slug"), "soporta --slug");
  check(cliContent.includes("--template"), "soporta --template");
  check(cliContent.includes("clinicas_fce_config"), "genera SQL para clinicas_fce_config");
  check(
    cliContent.includes("NUNCA aplica DDL") || cliContent.includes("NO aplica DDL"),
    "documenta que no aplica DDL"
  );
}

// ── 6. npm script registrado ──────────────────────────────────────────────────

section("package.json scripts");

const pkgPath = path.join(ROOT, "package.json");
const pkgContent = fs.existsSync(pkgPath) ? fs.readFileSync(pkgPath, "utf-8") : null;

if (pkgContent) {
  const pkg = JSON.parse(pkgContent) as { scripts?: Record<string, string> };
  check(
    "onboard:clinica" in (pkg.scripts ?? {}),
    'package.json tiene script "onboard:clinica"'
  );
  check(
    "test:sprint-o1-f2" in (pkg.scripts ?? {}),
    'package.json tiene script "test:sprint-o1-f2"'
  );
}

// ── 7. Documentación ─────────────────────────────────────────────────────────

section("Documentación");

const docPath = path.join(ROOT, "docs", "onboarding-clinica.md");
check(fs.existsSync(docPath), "docs/onboarding-clinica.md existe");

if (fs.existsSync(docPath)) {
  const docContent = fs.readFileSync(docPath, "utf-8");
  check(docContent.includes("--slug"), "doc menciona --slug");
  check(docContent.includes("--template"), "doc menciona --template");
  check(docContent.includes("--dry-run"), "doc menciona --dry-run");
  check(
    EXPECTED_TEMPLATE_NAMES.every((n) => docContent.includes(n)),
    "doc menciona los 4 templates"
  );
}

// ── Resultado final ────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(55));
if (errors === 0) {
  console.log("✅ Sprint O1-F2: todos los checks pasaron.\n");
  process.exit(0);
} else {
  console.error(`❌ ${errors} check(s) fallaron — ver detalle arriba.\n`);
  process.exit(1);
}
