/**
 * test-sprint-o1-f1.ts — Validación Sprint O1 Fase 1: deuda técnica R1
 *
 * Verifica estáticamente:
 * a) crearProfesional valida especialidad contra catálogo ANTES del INSERT
 * b) especialidad inválida ("Kinesiologia") es rechazada — NUNCA normalizada
 * c) especialidad inactiva (activa=true requerida) es rechazada
 * d) src/lib/permissions.ts NO existe; 0 importaciones "from.*permissions" en src/
 * e) guards.ts usa "recepcionista" (nuevo) — no "recepcion" (legacy)
 *
 * USO: npx tsx scripts/test-sprint-o1-f1.ts
 * Sale con código 0 si OK, código 1 si hay errores.
 */

import * as fs from "fs";
import * as path from "path";

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

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ─────────────────────────────────────────────────────────────────────────────

section("a/b/c) Validación de especialidad en profesionales.ts");

const profPath = path.join(ROOT, "src/app/actions/profesionales.ts");
const profContent = readFile(profPath);

check(profContent !== null, "src/app/actions/profesionales.ts existe");

if (profContent) {
  // a) Función validarEspecialidad existe
  check(
    profContent.includes("validarEspecialidad"),
    "Función validarEspecialidad definida"
  );

  // a) Consulta especialidades_catalogo (no normaliza el string)
  check(
    profContent.includes('from("especialidades_catalogo")') ||
    profContent.includes(".from('especialidades_catalogo')"),
    "Consulta la tabla especialidades_catalogo"
  );

  // a) Filtra por el campo exacto — no modifica el string antes
  check(
    profContent.includes('.eq("codigo", especialidad)') ||
    profContent.includes(".eq('codigo', especialidad)"),
    "Compara por codigo exacto (sin normalizar)"
  );

  // c) Requiere activa = true
  check(
    profContent.includes('.eq("activa", true)') ||
    profContent.includes(".eq('activa', true)"),
    "Requiere activa = true (rechaza especialidades inactivas)"
  );

  // b) Mensaje de error menciona "inválida" (sin normalizar = rechaza "Kinesiologia")
  check(
    profContent.includes("inválida") || profContent.includes("inválido"),
    'Error message menciona "inválida" — rechazo explícito sin conversión'
  );

  // a) crearProfesional llama validarEspecialidad ANTES del .insert(
  const crearBlock = profContent.slice(
    profContent.indexOf("export async function crearProfesional"),
    profContent.indexOf("export async function actualizarProfesional")
  );
  const validarCallPos = crearBlock.indexOf("validarEspecialidad");
  const insertCallPos = crearBlock.indexOf(".insert(");
  check(
    validarCallPos !== -1 && insertCallPos !== -1 && validarCallPos < insertCallPos,
    "crearProfesional: validarEspecialidad se llama ANTES del INSERT"
  );

  // a) Retorna error cuando errorEsp es truthy, antes del INSERT
  check(
    crearBlock.includes("if (errorEsp)") &&
    crearBlock.includes("return { success: false"),
    "crearProfesional: retorna ActionResult error si especialidad inválida"
  );

  // a) actualizarProfesional también valida cuando se cambia la especialidad
  const actualizarBlock = profContent.slice(
    profContent.indexOf("export async function actualizarProfesional")
  );
  check(
    actualizarBlock.includes("input.especialidad !== undefined") &&
    actualizarBlock.includes("validarEspecialidad"),
    "actualizarProfesional: valida especialidad solo si se está cambiando"
  );

  check(
    actualizarBlock.includes("if (errorEsp)") &&
    actualizarBlock.includes("return { success: false"),
    "actualizarProfesional: retorna error si especialidad inválida"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

section("d) Ausencia de permissions.ts legacy");

const permissionsPath = path.join(ROOT, "src/lib/permissions.ts");
check(
  !fs.existsSync(permissionsPath),
  "src/lib/permissions.ts NO existe (ya eliminado o nunca fue necesario)"
);

// Escaneo completo de src/ buscando importaciones de permissions
const srcDir = path.join(ROOT, "src");
const allSrcFiles = getAllTsFiles(srcDir);
const importPattern = /from\s+['"]([^'"]*permissions)['"]/g;
const filesWithPermissions: string[] = [];

for (const filePath of allSrcFiles) {
  const content = readFile(filePath);
  if (content && importPattern.test(content)) {
    filesWithPermissions.push(path.relative(ROOT, filePath));
  }
  importPattern.lastIndex = 0; // reset regex state
}

check(
  filesWithPermissions.length === 0,
  `0 archivos importan desde "permissions" en src/ (encontrados: ${filesWithPermissions.length})`
);

if (filesWithPermissions.length > 0) {
  for (const f of filesWithPermissions) {
    console.error(`    → ${f}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

section("e) guards.ts no usa rol legacy 'recepcion'");

const guardsPath = path.join(ROOT, "src/lib/modules/guards.ts");
const guardsContent = readFile(guardsPath);

check(guardsContent !== null, "src/lib/modules/guards.ts existe");

if (guardsContent) {
  // El rol viejo era "recepcion"; el correcto es "recepcionista"
  // No debería aparecer "recepcion" como string aislado (sin "ista")
  const hasLegacyRol = /["']recepcion["']/.test(guardsContent);
  check(
    !hasLegacyRol,
    'guards.ts no referencia el rol legacy "recepcion" (sin "-ista")'
  );

  check(
    guardsContent.includes("requireAccesoFCE"),
    "guards.ts exporta requireAccesoFCE"
  );

  check(
    guardsContent.includes("assertPuedeFirmar"),
    "guards.ts exporta assertPuedeFirmar"
  );

  check(
    guardsContent.includes("ActionResult"),
    "guards.ts define y exporta ActionResult<T>"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

section("Cobertura total de src/app/actions/profesionales.ts");

if (profContent) {
  check(
    profContent.includes("export async function crearProfesional"),
    "crearProfesional exportada"
  );
  check(
    profContent.includes("export async function actualizarProfesional"),
    "actualizarProfesional exportada"
  );
  check(
    profContent.includes("logs_auditoria"),
    "Audit log presente en acciones de profesional"
  );
  check(
    profContent.includes("id_clinica"),
    "Filtrado por id_clinica presente"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(55));
if (errors === 0) {
  console.log("✅ Sprint O1-F1: todos los checks pasaron.\n");
  process.exit(0);
} else {
  console.error(`❌ ${errors} check(s) fallaron — ver detalle arriba.\n`);
  process.exit(1);
}
