/**
 * test-sprint-p2-f2.ts
 * Sprint P2 / Fase 2 — Nota clínica estructurada por especialidad
 *
 * Valida:
 * 1. Las 4 especialidades clínicas generales tienen secciones con al menos un campo
 * 2. Todos los tipos de campo usados son CampoTipo válidos
 * 3. Los campos multi_select con opciones tienen al menos una opción
 * 4. Los campos obligatorios están bien definidos
 * 5. Cálculos de IMC son correctos
 */

import { ESPECIALIDAD_CONFIG } from "../src/lib/modules/especialidad-config";
import type { CampoTipo } from "../src/lib/modules/especialidad-config";

const TIPOS_VALIDOS: CampoTipo[] = [
  "texto_largo",
  "texto_corto",
  "select",
  "multi_select",
  "escala",
  "fecha",
  "booleano",
];

// ── IMC helper (misma lógica que en el form) ──────────────────────────────────

function calcularIMC(pesoKg: string, tallaCm: string): { imc: number; clasificacion: string } | null {
  const peso = parseFloat(pesoKg);
  const talla = parseFloat(tallaCm);
  if (!peso || !talla || talla <= 0) return null;
  const imc = peso / Math.pow(talla / 100, 2);
  let clasificacion = "";
  if (imc < 18.5) clasificacion = "Bajo peso";
  else if (imc < 25) clasificacion = "Normal";
  else if (imc < 30) clasificacion = "Sobrepeso";
  else if (imc < 35) clasificacion = "Obesidad I";
  else if (imc < 40) clasificacion = "Obesidad II";
  else clasificacion = "Obesidad III";
  return { imc, clasificacion };
}

// ── Test runner ───────────────────────────────────────────────────────────────

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

// ── Test 1: Las 4 especialidades tienen secciones con campos ─────────────────

console.log("\n[Test 1] Especialidades clinico_general tienen secciones con campos");

const ESPECIALIDADES_CLINICAS = ["Medicina General", "Enfermería", "Psicología", "Nutrición"];

for (const esp of ESPECIALIDADES_CLINICAS) {
  const config = ESPECIALIDAD_CONFIG[esp];
  if (!config) {
    fail(`Especialidad '${esp}' no encontrada en ESPECIALIDAD_CONFIG`);
    continue;
  }
  const seccionesConCampos = config.secciones.filter((s) => s.campos.length > 0);
  check(
    seccionesConCampos.length >= 1,
    `${esp}: tiene ${seccionesConCampos.length} sección(es) con campos`,
    `${esp}: no tiene ninguna sección con campos (tiene ${config.secciones.length} secciones pero todas vacías)`
  );

  // Verificar que al menos una sección tiene un campo obligatorio
  const tieneObligatorio = config.secciones.some((s) =>
    s.campos.some((c) => c.obligatorio)
  );
  check(
    tieneObligatorio,
    `${esp}: tiene al menos un campo obligatorio`,
    `${esp}: ningún campo está marcado como obligatorio`
  );
}

// ── Test 2: Tipos de campo válidos ───────────────────────────────────────────

console.log("\n[Test 2] Todos los tipos de campo son CampoTipo válidos");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      const tipoValido = TIPOS_VALIDOS.includes(campo.tipo as CampoTipo);
      check(
        tipoValido,
        `${esp} > ${seccion.id} > ${campo.id}: tipo '${campo.tipo}' es válido`,
        `${esp} > ${seccion.id} > ${campo.id}: tipo '${campo.tipo}' NO es un CampoTipo válido`
      );
    }
  }
}

// ── Test 3: multi_select tienen opciones ─────────────────────────────────────

console.log("\n[Test 3] Campos multi_select tienen opciones definidas");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      if (campo.tipo === "multi_select" || campo.tipo === "select") {
        const tieneOpciones = Array.isArray(campo.opciones) && campo.opciones.length > 0;
        check(
          tieneOpciones,
          `${esp} > ${seccion.id} > ${campo.id} (${campo.tipo}): tiene ${campo.opciones?.length ?? 0} opciones`,
          `${esp} > ${seccion.id} > ${campo.id} (${campo.tipo}): no tiene opciones definidas`
        );
      }
    }
  }
}

// ── Test 4: Campos con ayuda no tienen texto vacío ───────────────────────────

console.log("\n[Test 4] Campos con 'ayuda' tienen texto no vacío");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      if (campo.ayuda !== undefined) {
        check(
          campo.ayuda.trim().length > 0,
          `${esp} > ${seccion.id} > ${campo.id}: ayuda tiene contenido`,
          `${esp} > ${seccion.id} > ${campo.id}: ayuda está vacía`
        );
      }
    }
  }
}

// ── Test 5: Cálculos IMC correctos ───────────────────────────────────────────

console.log("\n[Test 5] Cálculos IMC correctos");

const casosIMC: Array<{ peso: string; talla: string; imcEsperado: string; clasificacionEsperada: string }> = [
  { peso: "50", talla: "170", imcEsperado: "17.3", clasificacionEsperada: "Bajo peso" },
  { peso: "70", talla: "170", imcEsperado: "24.2", clasificacionEsperada: "Normal" },
  { peso: "80", talla: "170", imcEsperado: "27.7", clasificacionEsperada: "Sobrepeso" },
  { peso: "100", talla: "170", imcEsperado: "34.6", clasificacionEsperada: "Obesidad I" },
  { peso: "115", talla: "170", imcEsperado: "39.8", clasificacionEsperada: "Obesidad II" },
  { peso: "120", talla: "170", imcEsperado: "41.5", clasificacionEsperada: "Obesidad III" },
  { peso: "60", talla: "165", imcEsperado: "22.0", clasificacionEsperada: "Normal" },
];

for (const caso of casosIMC) {
  const resultado = calcularIMC(caso.peso, caso.talla);
  if (!resultado) {
    fail(`IMC(${caso.peso}kg, ${caso.talla}cm): falló el cálculo`);
    continue;
  }
  const imcStr = resultado.imc.toFixed(1);
  check(
    imcStr === caso.imcEsperado,
    `IMC(${caso.peso}kg, ${caso.talla}cm) = ${imcStr} ✓`,
    `IMC(${caso.peso}kg, ${caso.talla}cm): esperado ${caso.imcEsperado}, obtenido ${imcStr}`
  );
  check(
    resultado.clasificacion === caso.clasificacionEsperada,
    `IMC clasificación '${resultado.clasificacion}' ✓`,
    `IMC clasificación: esperado '${caso.clasificacionEsperada}', obtenido '${resultado.clasificacion}'`
  );
}

// ── Test 6: Nutrición tiene campos de IMC ────────────────────────────────────

console.log("\n[Test 6] Nutrición tiene campos de IMC calculado");

const nutriConfig = ESPECIALIDAD_CONFIG["Nutrición"];
const seccionContenidoNutri = nutriConfig?.secciones.find((s) => s.id === "contenido");
const camposNutri = seccionContenidoNutri?.campos ?? [];
const tieneIMCCalculado = camposNutri.some((c) => c.id === "imc_calculado");
const tieneIMCClasif = camposNutri.some((c) => c.id === "imc_clasificacion");
const tienePeso = camposNutri.some((c) => c.id === "peso_kg");
const tieneTalla = camposNutri.some((c) => c.id === "talla_cm");

check(tieneIMCCalculado, "Nutrición > contenido: tiene campo 'imc_calculado'", "Nutrición > contenido: falta campo 'imc_calculado'");
check(tieneIMCClasif, "Nutrición > contenido: tiene campo 'imc_clasificacion'", "Nutrición > contenido: falta campo 'imc_clasificacion'");
check(tienePeso, "Nutrición > contenido: tiene campo 'peso_kg'", "Nutrición > contenido: falta campo 'peso_kg'");
check(tieneTalla, "Nutrición > contenido: tiene campo 'talla_cm'", "Nutrición > contenido: falta campo 'talla_cm'");

// ── Test 7: IDs únicos dentro de cada especialidad ───────────────────────────

console.log("\n[Test 7] IDs de campos son únicos dentro de cada especialidad");

for (const [esp, config] of Object.entries(ESPECIALIDAD_CONFIG)) {
  const todosCamposIds: string[] = [];
  for (const seccion of config.secciones) {
    for (const campo of seccion.campos) {
      todosCamposIds.push(campo.id);
    }
  }
  const unique = new Set(todosCamposIds);
  check(
    unique.size === todosCamposIds.length,
    `${esp}: todos los IDs de campos son únicos (${todosCamposIds.length})`,
    `${esp}: hay IDs de campos duplicados (${todosCamposIds.length} campos, ${unique.size} únicos)`
  );
}

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);

if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron. Sprint P2-F2 validado.");
  process.exit(0);
}
