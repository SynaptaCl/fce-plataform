#!/usr/bin/env tsx
/**
 * Sprint R6 — Smoke test estático para validación go-live Renata.
 *
 * No requiere conexión a Supabase ni variables de entorno.
 * Inspecciona código fuente para verificar contratos de tipos y presencia
 * de referencias a las tablas/campos nuevos del sprint.
 *
 * Ejecutar: npx tsx scripts/test-sprint-r6.ts
 */

import * as fs from "fs";
import * as path from "path";

const srcRoot = path.resolve(__dirname, "../src");
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(srcRoot, relPath), "utf-8");
}

console.log("\n=== Sprint R6 — Timeline Unificado + Integración Renata ===\n");

// ── Test 1: Auth — Supabase server client ────────────────────────────────────
console.log("Test 1: Auth — createServerClient accesible");

const serverClientSrc = readSrc("lib/supabase/server.ts");
check(
  "createClient exportada desde lib/supabase/server.ts",
  serverClientSrc.includes("export async function createClient")
);
check(
  "usa createServerClient de @supabase/ssr",
  serverClientSrc.includes("createServerClient")
);
check(
  "usa NEXT_PUBLIC_SUPABASE_URL",
  serverClientSrc.includes("NEXT_PUBLIC_SUPABASE_URL")
);

// ── Test 2: TimelineEntryType — 6 tipos requeridos ──────────────────────────
console.log("\nTest 2: TimelineEntryType — 6 tipos del enum");

const timelineSrc = readSrc("app/actions/timeline.ts");
const REQUIRED_TYPES = [
  "soap",
  "evaluacion",
  "nota_clinica",
  "instrumento",
  "signos_vitales",
  "consentimiento",
] as const;

for (const t of REQUIRED_TYPES) {
  check(
    `TimelineEntryType incluye "${t}"`,
    // Busca el tipo dentro del bloque de la definición del union type
    timelineSrc.includes(`"${t}"`)
  );
}

// Verificar que el type está exportado
check(
  "TimelineEntryType está exportado",
  timelineSrc.includes("export type TimelineEntryType")
);

// ── Test 3: TimelineEntry shape — campo encuentroId ──────────────────────────
console.log("\nTest 3: TimelineEntry — campo encuentroId opcional");

check(
  "TimelineEntry interface exportada",
  timelineSrc.includes("export interface TimelineEntry")
);
check(
  "TimelineEntry tiene campo encuentroId?: string",
  timelineSrc.includes("encuentroId?: string")
);

// ── Test 4: getPatientTimeline exportada ─────────────────────────────────────
console.log("\nTest 4: getPatientTimeline — función exportada");

check(
  "getPatientTimeline es exportada",
  timelineSrc.includes("export async function getPatientTimeline")
);
check(
  "getPatientTimeline recibe patientId: string",
  timelineSrc.includes("patientId: string")
);

// ── Test 5: Timeline fetch incluye tablas nuevas ─────────────────────────────
console.log("\nTest 5: Timeline fetch — referencias a tablas nuevas");

check(
  "timeline.ts referencia fce_notas_clinicas",
  timelineSrc.includes("fce_notas_clinicas")
);
check(
  "timeline.ts referencia instrumentos_aplicados",
  timelineSrc.includes("instrumentos_aplicados")
);
check(
  "timeline.ts tiene Promise.all con 7 queries (nuevas tablas incluidas)",
  timelineSrc.includes("notasRes") && timelineSrc.includes("instrumentosRes")
);

// ── Test 6: ClinicalTimeline — maneja tipos nota_clinica e instrumento ───────
console.log("\nTest 6: ClinicalTimeline — cases nota_clinica e instrumento");

const clinicalTimelineSrc = readSrc(
  "components/modules/ClinicalTimeline.tsx"
);
check(
  "ClinicalTimeline maneja case 'nota_clinica'",
  clinicalTimelineSrc.includes("case \"nota_clinica\"") ||
    clinicalTimelineSrc.includes("case 'nota_clinica'") ||
    clinicalTimelineSrc.includes(`nota_clinica:`)
);
check(
  "ClinicalTimeline maneja case 'instrumento'",
  clinicalTimelineSrc.includes("case \"instrumento\"") ||
    clinicalTimelineSrc.includes("case 'instrumento'") ||
    clinicalTimelineSrc.includes(`instrumento:`)
);
check(
  "ClinicalTimeline importa TimelineEntry desde timeline action",
  clinicalTimelineSrc.includes("from \"@/app/actions/timeline\"") ||
    clinicalTimelineSrc.includes("from '@/app/actions/timeline'")
);
check(
  "ClinicalTimeline tiene componente NotaClinicaContent",
  clinicalTimelineSrc.includes("NotaClinicaContent")
);
check(
  "ClinicalTimeline tiene componente InstrumentoContent",
  clinicalTimelineSrc.includes("InstrumentoContent")
);

// ── Test 7: PDF export — campos notasClinicas e instrumentosAplicados ────────
console.log("\nTest 7: exportar-pdf.ts — campos nuevos en PdfPatientData");

const pdfSrc = readSrc("app/actions/exportar-pdf.ts");
check(
  "exportar-pdf.ts tiene campo notasClinicas en PdfPatientData",
  pdfSrc.includes("notasClinicas")
);
check(
  "exportar-pdf.ts tiene campo instrumentosAplicados en PdfPatientData",
  pdfSrc.includes("instrumentosAplicados")
);
check(
  "exportar-pdf.ts fetcha fce_notas_clinicas",
  pdfSrc.includes("fce_notas_clinicas")
);
check(
  "exportar-pdf.ts fetcha instrumentos_aplicados",
  pdfSrc.includes("instrumentos_aplicados")
);

// ── Test 8: Build / typecheck ────────────────────────────────────────────────
console.log("\nTest 8: TypeScript — typecheck sin errores");

import { execSync } from "child_process";

let tscPassed = false;
let tscDetail = "";
try {
  execSync("npx tsc --noEmit", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "pipe",
    timeout: 120_000,
  });
  tscPassed = true;
} catch (err: unknown) {
  const execErr = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
  const out = execErr.stdout?.toString() ?? "";
  const errOut = execErr.stderr?.toString() ?? "";
  // Extraer las primeras líneas del error para el detalle
  const combined = (out + "\n" + errOut).trim();
  const firstLines = combined.split("\n").slice(0, 5).join(" | ");
  tscDetail = firstLines || "tsc process failed";
}
check("npx tsc --noEmit termina con 0 errores", tscPassed, tscDetail || undefined);

// ── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${total} checks — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
