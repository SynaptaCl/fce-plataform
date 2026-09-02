/**
 * test-sprint-amb1.ts
 * Sprint AMB-1 — Ambient Scribe (funciones puras, sin DB).
 *
 * Valida:
 *  - Gating por especialidad: tieneAmbientScribe solo true en Medicina General
 *    y Odontología (v1), off por defecto en el resto — sobre todo salud mental
 *    y neurodesarrollo (Psicología), fuera de alcance por riesgo clínico (§2).
 *  - esConsentimientoGrabacionVigente: lógica pura de assertConsentimientoGrabacion.
 *    Modelo versionado — "vigente" = la versión más alta de tipo='grabacion_ia'
 *    está firmada. Revocar = insertar nueva versión firmado=false (sin UPDATE
 *    sobre fila firmada, sin columna revocado_at — ver lib/ambient/consentimiento.ts).
 *
 * F0/F1 técnico. El resto de AMB-1 (rate limit por clínica, spike STT, DPA/DPIA)
 * está fuera de este script — ver AMB-1-ambient-scribe.md §3 y §6.
 */

import { getEspecialidadConfig, ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";
import { esConsentimientoGrabacionVigente, TIPO_CONSENTIMIENTO_GRABACION } from "../src/lib/ambient/consentimiento";

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

// ── Gating por especialidad ──────────────────────────────────────────────────
console.log("\nGating — tieneAmbientScribe");

check(
  getEspecialidadConfig("Medicina General").tieneAmbientScribe === true,
  "Medicina General habilitada",
  "Medicina General NO habilitada"
);
check(
  getEspecialidadConfig("Odontología").tieneAmbientScribe === true,
  "Odontología habilitada",
  "Odontología NO habilitada"
);

const HABILITADAS_V1 = new Set(["Medicina General", "Odontología"]);
for (const [nombre, cfg] of Object.entries(ESPECIALIDAD_CONFIG)) {
  if (HABILITADAS_V1.has(nombre)) continue;
  check(
    cfg.tieneAmbientScribe !== true,
    `${nombre} sin ambient scribe (off por defecto)`,
    `${nombre} tiene tieneAmbientScribe=true — fuera de alcance v1`
  );
}

// Regla dura del sprint: salud mental / neurodesarrollo nunca graba (§2, riesgo clínico).
check(
  getEspecialidadConfig("Psicología").tieneAmbientScribe !== true,
  "Psicología excluida (salud mental — riesgo clínico, no legal)",
  "Psicología habilitada — viola exclusión explícita de AMB-1 §2"
);

// No debe existir ningún `if (especialidad === '...')` disfrazado: getEspecialidadConfig
// es la única fuente de verdad (regla 18 CLAUDE.md) — este check confirma que el campo
// vive en la config y no en lógica de componente.
check(
  typeof getEspecialidadConfig("Kinesiología").tieneAmbientScribe !== "string",
  "el campo es boolean|undefined, no una condición ad-hoc",
  "tipo inesperado en tieneAmbientScribe"
);

// ── esConsentimientoGrabacionVigente (lógica pura del guard) ─────────────────
console.log("\nConsentimiento de grabación — lógica pura (versionado)");

check(
  esConsentimientoGrabacionVigente([{ tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 1 }]) === true,
  "v1 firmada → vigente",
  "v1 firmada no reconocida como vigente"
);
check(
  esConsentimientoGrabacionVigente([{ tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 1 }]) === false,
  "v1 sin firmar → no vigente",
  "v1 sin firmar tratada como vigente"
);
check(
  esConsentimientoGrabacionVigente([{ tipo: "clinico", firmado: true, version: 1 }]) === false,
  "consentimiento de otro tipo (clinico) → no cuenta como grabación",
  "consentimiento de otro tipo contó como vigente"
);
check(
  esConsentimientoGrabacionVigente([]) === false,
  "sin consentimientos → no vigente",
  "lista vacía tratada como vigente"
);
check(
  esConsentimientoGrabacionVigente([
    { tipo: "clinico", firmado: true, version: 1 },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 1 },
  ]) === true,
  "consentimiento de grabación entre varios tipos → vigente",
  "no detectó consentimiento de grabación mezclado con otros"
);

// Revocación = nueva versión firmado=false. La versión anterior firmada NO debe
// "ganar" — esto es lo que rompería si el guard mirara "existe alguna fila firmada"
// en vez de la versión más alta.
check(
  esConsentimientoGrabacionVigente([
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 1 },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 2 },
  ]) === false,
  "v1 firmada + v2 revocación (sin firma) → NO vigente (revocación gana)",
  "revocación no invalidó el consentimiento — BUG crítico"
);
check(
  esConsentimientoGrabacionVigente([
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 1 },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 2 },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 3 },
  ]) === true,
  "v1 firmada, v2 revocada, v3 nuevo consentimiento → vigente otra vez",
  "no detectó el re-consentimiento tras revocación (v3)"
);
check(
  esConsentimientoGrabacionVigente([
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 2 },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 1 },
  ]) === false,
  "orden de llegada no importa — toma la versión MÁS ALTA, no la última del array",
  "usó orden de array en vez de version numérica — BUG"
);

// Empate de versión (doble-submit concurrente, sin UNIQUE en DB — ver comentario
// en getUltimaVersionGrabacion) — el tiebreak por created_at debe ser determinista.
check(
  esConsentimientoGrabacionVigente([
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 2, created_at: "2026-08-19T10:00:00Z" },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 2, created_at: "2026-08-19T10:00:05Z" },
  ]) === false,
  "empate de versión → gana created_at más reciente (revocación 5s después)",
  "empate de versión no resuelto por created_at — BUG (guard no determinista)"
);
check(
  esConsentimientoGrabacionVigente([
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: false, version: 2, created_at: "2026-08-19T10:00:05Z" },
    { tipo: TIPO_CONSENTIMIENTO_GRABACION, firmado: true, version: 2, created_at: "2026-08-19T10:00:00Z" },
  ]) === false,
  "mismo empate en orden inverso del array → mismo resultado (created_at manda, no orden)",
  "resultado cambió según orden del array — tiebreak no es realmente por created_at"
);

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron. Sprint AMB-1 (gating + guard puro) validado.");
  process.exit(0);
}
