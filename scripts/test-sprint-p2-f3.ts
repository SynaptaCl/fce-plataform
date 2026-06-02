/**
 * test-sprint-p2-f3.ts — Validación Sprint P2 Fase 3: TerapiaOcupacionalEval
 *
 * Verifica:
 * 1. El componente TerapiaOcupacionalEval.tsx existe en el path correcto
 * 2. Las 6 sub_areas esperadas están definidas en el componente
 * 3. El estado de TO en ESPECIALIDADES_REGISTRY es "beta" o "estable" (no "roadmap")
 * 4. TerapiaOcupacionalEval aparece en la lista de componentes de M3
 * 5. El workspace rehab importa y usa TerapiaOcupacionalEval
 * 6. El index rehab exporta TerapiaOcupacionalEval
 *
 * Salida: exit 0 si OK, exit 1 si hay errores
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

// ── 1. Componente existe ───────────────────────────────────────────────────

console.log("\n[P2-F3] Verificando TerapiaOcupacionalEval…\n");

const componentPath = path.join(ROOT, "src/components/rehab/TerapiaOcupacionalEval.tsx");
const componentContent = readFile(componentPath);

check(componentContent !== null, "TerapiaOcupacionalEval.tsx existe en src/components/rehab/");

// ── 2. Sub-áreas esperadas ─────────────────────────────────────────────────

const EXPECTED_SUB_AREAS = ["avd", "destrezas", "sensorial", "cognitivo", "contexto", "apoyo"];

if (componentContent) {
  console.log("\n  Sub-áreas definidas:");
  for (const subArea of EXPECTED_SUB_AREAS) {
    check(
      componentContent.includes(`"${subArea}"`),
      `Sub-área "${subArea}" definida en el componente`
    );
  }
}

// ── 3. Estado de TO en ESPECIALIDADES_REGISTRY ────────────────────────────

console.log("\n  Estado en registry:");

const registryPath = path.join(ROOT, "src/lib/modules/registry.ts");
const registryContent = readFile(registryPath);

if (registryContent) {
  // Buscar la línea de Terapia Ocupacional
  const toLine = registryContent
    .split("\n")
    .find((line) => line.includes('"Terapia Ocupacional"') && line.includes("estado:"));

  check(toLine !== null && toLine !== undefined, "Entrada de Terapia Ocupacional encontrada en registry");

  if (toLine) {
    const isRoadmap = toLine.includes('"roadmap"');
    check(!isRoadmap, 'Estado de TO NO es "roadmap"');
    const isBetaOrEstable = toLine.includes('"beta"') || toLine.includes('"estable"');
    check(isBetaOrEstable, 'Estado de TO es "beta" o "estable"');
  }
}

// ── 4. TerapiaOcupacionalEval en M3 componentes ───────────────────────────

console.log("\n  Registro en M3:");

if (registryContent) {
  // Find the M3_evaluacion block and check for TerapiaOcupacionalEval within it
  const m3Start = registryContent.indexOf("M3_evaluacion:");
  const m3End = registryContent.indexOf("M4_soap:", m3Start);
  const m3Block = m3Start !== -1 && m3End !== -1
    ? registryContent.slice(m3Start, m3End)
    : "";

  check(
    m3Block.includes("TerapiaOcupacionalEval"),
    '"TerapiaOcupacionalEval" incluido en M3_evaluacion.componentes'
  );
}

// ── 5. Workspace rehab usa TerapiaOcupacionalEval ─────────────────────────

console.log("\n  Integración en workspace rehab:");

const rehabPagePath = path.join(
  ROOT,
  "src/app/dashboard/pacientes/[id]/encuentro/[encuentroId]/rehab/page.tsx"
);
const rehabPageContent = readFile(rehabPagePath);

if (rehabPageContent) {
  check(
    rehabPageContent.includes("TerapiaOcupacionalEval"),
    "Workspace rehab importa TerapiaOcupacionalEval"
  );
  check(
    rehabPageContent.includes('"Terapia Ocupacional"') && rehabPageContent.includes("TerapiaOcupacionalEval"),
    'Case "Terapia Ocupacional" renderiza TerapiaOcupacionalEval'
  );
} else {
  check(false, "Archivo rehab/page.tsx encontrado");
}

// ── 6. Index rehab exporta TerapiaOcupacionalEval ─────────────────────────

console.log("\n  Export en index rehab:");

const indexPath = path.join(ROOT, "src/components/rehab/index.ts");
const indexContent = readFile(indexPath);

if (indexContent) {
  check(
    indexContent.includes('export { TerapiaOcupacionalEval }'),
    "index.ts exporta TerapiaOcupacionalEval"
  );
} else {
  check(false, "src/components/rehab/index.ts encontrado");
}

// ── Resultado final ────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(50));
if (errors === 0) {
  console.log("✅ Todos los checks pasaron — Sprint P2 Fase 3 OK\n");
  process.exit(0);
} else {
  console.error(`❌ ${errors} check(s) fallaron\n`);
  process.exit(1);
}
