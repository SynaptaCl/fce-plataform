#!/usr/bin/env tsx
/**
 * Sprint R11 — Tests estáticos: PDF + Timeline + Audit de prescripciones (M7 completo).
 *
 * Valida sin conexión a DB:
 *   - Helpers: pdf-renderer.ts + share-helpers.ts
 *   - Componente RecetaPdfView
 *   - Componente PrescripcionExpandedCard
 *   - Componente PrescripcionDetalleModal
 *   - Server actions: 3 audit actions + getPatientTimeline extendido
 *   - Timeline types: 'prescripcion' en TimelineEntryType
 *   - exportar-pdf.ts: prescripcionesRecientes en PdfPatientData
 *   - Build 0 errores
 *   - Lint 0 errores
 *
 * Ejecutar: npm run test:sprint-r11
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

console.log("\n🧪 Sprint R11 — PDF + Timeline + Audit de prescripciones (M7 completo)");
console.log(`   Root: ${ROOT}`);

// ── Test 1: Tipos Timeline ────────────────────────────────────────────────────
header("Test 1: Tipos Timeline — prescripcion en TimelineEntryType");

const timeline = readFile("src/app/actions/timeline.ts");
assert(
  timeline.includes('"prescripcion"'),
  'timeline.ts contiene "prescripcion" en TimelineEntryType'
);
assert(
  timeline.includes("prescripcionData"),
  "timeline.ts contiene prescripcionData"
);
assert(
  timeline.includes("fce_prescripciones"),
  "timeline.ts contiene fce_prescripciones (la query)"
);

// ── Test 2: Helpers ───────────────────────────────────────────────────────────
header("Test 2: Helpers — pdf-renderer.ts + share-helpers.ts");

assert(
  fileExists("src/lib/prescripciones/pdf-renderer.ts"),
  "src/lib/prescripciones/pdf-renderer.ts existe"
);
const pdfRenderer = readFile("src/lib/prescripciones/pdf-renderer.ts");
assert(
  pdfRenderer.includes("generarRecetaPdf"),
  "pdf-renderer.ts exporta generarRecetaPdf"
);
assert(
  pdfRenderer.includes('format: "letter"'),
  'pdf-renderer.ts contiene format: "letter" (jsPDF format)'
);

assert(
  fileExists("src/lib/prescripciones/share-helpers.ts"),
  "src/lib/prescripciones/share-helpers.ts existe"
);
const shareHelpers = readFile("src/lib/prescripciones/share-helpers.ts");
assert(
  shareHelpers.includes("buildMailtoLink"),
  "share-helpers.ts exporta buildMailtoLink"
);
assert(
  shareHelpers.includes("buildWhatsappLink"),
  "share-helpers.ts exporta buildWhatsappLink"
);
assert(
  shareHelpers.includes("wa.me/"),
  "share-helpers.ts contiene wa.me/ (WhatsApp URL)"
);
assert(
  shareHelpers.includes("encodeURIComponent"),
  "buildMailtoLink usa encodeURIComponent"
);

// ── Test 3: RecetaPdfView ─────────────────────────────────────────────────────
header("Test 3: RecetaPdfView — componente de impresión sin Tailwind");

assert(
  fileExists("src/components/shared/RecetaPdfView.tsx"),
  "src/components/shared/RecetaPdfView.tsx existe"
);
const recetaPdf = readFile("src/components/shared/RecetaPdfView.tsx");
assert(
  recetaPdf.includes('"use client"'),
  'RecetaPdfView.tsx contiene "use client"'
);
assert(
  recetaPdf.includes('id="receta-pdf"'),
  'RecetaPdfView.tsx contiene id="receta-pdf"'
);
assert(
  recetaPdf.includes("export function RecetaPdfView"),
  "RecetaPdfView.tsx contiene export function RecetaPdfView"
);
assert(
  recetaPdf.includes("folio_display"),
  "RecetaPdfView.tsx contiene folio_display"
);
assert(
  recetaPdf.includes("modo_firma"),
  "RecetaPdfView.tsx contiene modo_firma (firma section)"
);
assert(
  recetaPdf.includes("firma_canvas"),
  "RecetaPdfView.tsx contiene firma_canvas"
);
assert(
  !recetaPdf.includes("className="),
  "RecetaPdfView.tsx NO contiene clases Tailwind (sin className=)"
);

// ── Test 4: PrescripcionExpandedCard ─────────────────────────────────────────
header("Test 4: PrescripcionExpandedCard — tarjeta timeline");

assert(
  fileExists("src/components/modules/timeline/PrescripcionExpandedCard.tsx"),
  "src/components/modules/timeline/PrescripcionExpandedCard.tsx existe"
);
const expandedCard = readFile(
  "src/components/modules/timeline/PrescripcionExpandedCard.tsx"
);
assert(
  expandedCard.includes("export function PrescripcionExpandedCard"),
  "PrescripcionExpandedCard.tsx contiene export function PrescripcionExpandedCard"
);
assert(
  expandedCard.includes("onVerReceta"),
  "PrescripcionExpandedCard.tsx contiene onVerReceta"
);
assert(
  expandedCard.includes("firmadoLabel"),
  "PrescripcionExpandedCard.tsx contiene firmadoLabel"
);
assert(
  expandedCard.includes("./_shared"),
  'PrescripcionExpandedCard.tsx importa desde "./_shared"'
);

// ── Test 5: PrescripcionDetalleModal ─────────────────────────────────────────
header("Test 5: PrescripcionDetalleModal — modal completo");

assert(
  fileExists("src/components/shared/PrescripcionDetalleModal.tsx"),
  "src/components/shared/PrescripcionDetalleModal.tsx existe"
);
const detalleModal = readFile(
  "src/components/shared/PrescripcionDetalleModal.tsx"
);
assert(
  detalleModal.includes('"use client"'),
  'PrescripcionDetalleModal.tsx contiene "use client"'
);
assert(
  detalleModal.includes("getPrescripcionById"),
  "PrescripcionDetalleModal.tsx contiene getPrescripcionById"
);
assert(
  detalleModal.includes("RecetaPdfView"),
  "PrescripcionDetalleModal.tsx contiene RecetaPdfView"
);
assert(
  detalleModal.includes("generarRecetaPdf"),
  "PrescripcionDetalleModal.tsx contiene generarRecetaPdf"
);
assert(
  detalleModal.includes("buildMailtoLink"),
  "PrescripcionDetalleModal.tsx contiene buildMailtoLink"
);
assert(
  detalleModal.includes("logPrescripcionDownload"),
  "PrescripcionDetalleModal.tsx contiene logPrescripcionDownload"
);
assert(
  detalleModal.includes("sensible") || detalleModal.includes("sensibles"),
  'PrescripcionDetalleModal.tsx contiene advertencia de datos sensibles (tab "acciones")'
);

// ── Test 6: Server actions audit ──────────────────────────────────────────────
header("Test 6: Server actions audit — prescripciones.ts");

const prescripciones = readFile("src/app/actions/prescripciones.ts");
assert(
  prescripciones.includes("export async function logPrescripcionDownload"),
  "prescripciones.ts exporta logPrescripcionDownload"
);
assert(
  prescripciones.includes("export async function logPrescripcionPrint"),
  "prescripciones.ts exporta logPrescripcionPrint"
);
assert(
  prescripciones.includes("export async function logPrescripcionShare"),
  "prescripciones.ts exporta logPrescripcionShare"
);
assert(
  prescripciones.includes("descargar_prescripcion"),
  'prescripciones.ts contiene "descargar_prescripcion"'
);
assert(
  prescripciones.includes("imprimir_prescripcion"),
  'prescripciones.ts contiene "imprimir_prescripcion"'
);
assert(
  prescripciones.includes("compartir_prescripcion"),
  'prescripciones.ts contiene "compartir_prescripcion"'
);

// ── Test 7: ClinicalTimeline integración ──────────────────────────────────────
header("Test 7: ClinicalTimeline — integración R11");

const clinicalTimeline = readFile(
  "src/components/modules/ClinicalTimeline.tsx"
);
assert(
  clinicalTimeline.includes("PrescripcionExpandedCard"),
  "ClinicalTimeline.tsx importa PrescripcionExpandedCard"
);
assert(
  clinicalTimeline.includes("PrescripcionDetalleModal"),
  "ClinicalTimeline.tsx importa PrescripcionDetalleModal"
);
assert(
  clinicalTimeline.includes("paciente?: Patient"),
  "ClinicalTimeline.tsx contiene paciente?: Patient"
);
assert(
  clinicalTimeline.includes("clinica?: ClinicaConfig"),
  "ClinicalTimeline.tsx contiene clinica?: ClinicaConfig"
);
assert(
  !clinicalTimeline.includes("PrescripcionPlaceholder"),
  "ClinicalTimeline.tsx NO contiene PrescripcionPlaceholder (fue reemplazado)"
);
assert(
  clinicalTimeline.includes("PrescripcionDetalleModal"),
  "ClinicalTimeline.tsx contiene PrescripcionDetalleModal (renderizado)"
);

// ── Test 8: exportar-pdf ──────────────────────────────────────────────────────
header("Test 8: exportar-pdf.ts — prescripcionesRecientes");

const exportarPdf = readFile("src/app/actions/exportar-pdf.ts");
assert(
  exportarPdf.includes("prescripcionesRecientes"),
  "exportar-pdf.ts contiene prescripcionesRecientes"
);
assert(
  exportarPdf.includes("fce_prescripciones"),
  "exportar-pdf.ts contiene fce_prescripciones"
);

// ── Test 9: Build ─────────────────────────────────────────────────────────────
header("Test 9: npm run build — 0 errores");

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

// ── Test 10: Lint ─────────────────────────────────────────────────────────────
header("Test 10: npm run lint — 0 errores");

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
console.log(`  Sprint R11 — Resultado: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60));

if (failed > 0) {
  console.error("\n⚠️  Hay fallos. Revisar antes de continuar.\n");
  process.exit(1);
} else {
  console.log("\n✅ Todos los tests pasaron.");
  console.log(
    "   M7 Prescripciones completo. Próximos pasos: smoke tests manuales + aplicar migrations R9 en Supabase Production + deploy a preview.\n"
  );
}
