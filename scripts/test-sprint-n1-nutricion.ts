/**
 * scripts/test-sprint-n1-nutricion.ts
 *
 * Valida cálculos antropométricos contra valores de referencia conocidos.
 * No requiere conexión a DB — lógica pura.
 *
 * Ejecutar: npx tsx scripts/test-sprint-n1-nutricion.ts
 */

import { calcularIMC, clasificarCircunferenciaCintura } from "../src/lib/nutricion/antropometria";
import {
  calcularGrasaCorporal,
  calcularMasaMagra,
  getSitiosRequeridos,
  FORMULAS_PLIEGUES,
} from "../src/lib/nutricion/pliegues";

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown, tolerance = 0) {
  const ok =
    tolerance > 0
      ? typeof actual === "number" && typeof expected === "number"
        ? Math.abs(actual - expected) <= tolerance
        : actual === expected
      : actual === expected;

  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    esperado: ${JSON.stringify(expected)}`);
    console.log(`    obtenido: ${JSON.stringify(actual)}`);
    failed++;
  }
}

function checkNull(label: string, actual: unknown) {
  if (actual === null) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — esperaba null, obtuvo: ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── calcularIMC ───────────────────────────────────────────────────────────────

console.log("\n=== calcularIMC ===");

const imc1 = calcularIMC(70, 170);
check("IMC 70kg/170cm valor",          imc1?.imc,          24.22, 0.01);
check("IMC 70kg/170cm clasificacion",  imc1?.clasificacion, "Normal");

const imc2 = calcularIMC(50, 170);
check("IMC 50kg/170cm — Bajo peso",    imc2?.clasificacion, "Bajo peso");

const imc3 = calcularIMC(80, 170);
check("IMC 80kg/170cm — Sobrepeso",    imc3?.clasificacion, "Sobrepeso");

const imc4 = calcularIMC(100, 170);
check("IMC 100kg/170cm — Obesidad I",  imc4?.clasificacion, "Obesidad I");

const imc5 = calcularIMC(120, 170);
check("IMC 120kg/170cm — Obesidad III (41.5)", imc5?.clasificacion, "Obesidad III");

const imc6 = calcularIMC(145, 170);
check("IMC 145kg/170cm — Obesidad III",imc6?.clasificacion, "Obesidad III");

checkNull("IMC peso=0 → null",  calcularIMC(0, 170));
checkNull("IMC talla=0 → null", calcularIMC(70, 0));
checkNull("IMC peso>500 → null", calcularIMC(501, 170));

// ── clasificarCircunferenciaCintura ───────────────────────────────────────────

console.log("\n=== clasificarCircunferenciaCintura ===");

check("F 70cm — sin riesgo",              clasificarCircunferenciaCintura(70, "F"), "Sin riesgo aumentado");
check("F 82cm — ligeramente aumentado",   clasificarCircunferenciaCintura(82, "F"), "Riesgo ligeramente aumentado");
check("F 90cm — riesgo aumentado",        clasificarCircunferenciaCintura(90, "F"), "Riesgo aumentado");
check("M 90cm — sin riesgo (umbral M es 94)", clasificarCircunferenciaCintura(90, "M"), "Sin riesgo aumentado");
check("M 96cm — ligeramente aumentado",      clasificarCircunferenciaCintura(96, "M"), "Riesgo ligeramente aumentado");
check("M 103cm — riesgo aumentado",       clasificarCircunferenciaCintura(103, "M"), "Riesgo aumentado");
check("Sin sexo 95cm — ref masculina",    clasificarCircunferenciaCintura(95),
  "Riesgo ligeramente aumentado (referencia masculina — informar sexo para mayor precisión)");

// ── Durnin-Womersley ──────────────────────────────────────────────────────────

console.log("\n=== Durnin-Womersley ===");

// Referencia: hombre 25 años, ΣS4=60mm → D = 1.1631 - 0.0632×log10(60)
// log10(60) ≈ 1.7782 → D ≈ 1.1631 - 0.0632×1.7782 = 1.1631 - 0.1124 = 1.0507
// %grasa = (4.95/1.0507 - 4.50) × 100 = (4.7111 - 4.50) × 100 = 21.11%
const dw1 = calcularGrasaCorporal({
  formula: "durnin_womersley",
  pliegues: { biceps: 10, triceps: 15, subescapular: 18, suprailiaco: 17 }, // suma=60
  sexo: "M",
  edad: 25,
});
check("D-W hombre 25a Σ60mm %grasa ≈ 21.1", dw1?.percGrasa, 21.11, 0.5);
check("D-W densidad presente",              dw1?.densidadCorporal !== null, true);

// Faltando pliegue → null
const dw2 = calcularGrasaCorporal({
  formula: "durnin_womersley",
  pliegues: { biceps: 10, triceps: 15, subescapular: 18 }, // falta suprailiaco
  sexo: "M",
  edad: 25,
});
checkNull("D-W pliegue faltante → null", dw2);

// ── Jackson-Pollock 3 ─────────────────────────────────────────────────────────

console.log("\n=== Jackson-Pollock 3 ===");

// Referencia: hombre 30 años, pecho=10 abdomen=15 muslo=12, suma=37
// D = 1.10938 - 0.0008267×37 + 0.0000016×37² - 0.0002574×30
// = 1.10938 - 0.030588 + 0.002190 - 0.007722 = 1.07426
// %grasa = (4.95/1.07426 - 4.50) × 100 = (4.6077 - 4.50) × 100 = 10.77%
const jp3m = calcularGrasaCorporal({
  formula: "jackson_pollock_3",
  pliegues: { pecho: 10, abdomen: 15, muslo: 12 },
  sexo: "M",
  edad: 30,
});
check("JP3 hombre 30a Σ37mm %grasa ≈ 10.8", jp3m?.percGrasa, 10.77, 0.5);

// Mujer 28 años, tríceps=18 suprailiaco=15 muslo=20, suma=53
// D = 1.0994921 - 0.0009929×53 + 0.0000023×53² - 0.0001392×28
// = 1.0994921 - 0.0526237 + 0.0064607 - 0.0038976 = 1.0494315
// %grasa = (4.95/1.0494315 - 4.50) × 100 = (4.7166 - 4.50) × 100 = 21.66%
const jp3f = calcularGrasaCorporal({
  formula: "jackson_pollock_3",
  pliegues: { triceps: 18, suprailiaco: 15, muslo: 20 },
  sexo: "F",
  edad: 28,
});
check("JP3 mujer 28a Σ53mm %grasa ≈ 21.7", jp3f?.percGrasa, 21.66, 0.5);

// Sin sexo → null
const jp3null = calcularGrasaCorporal({
  formula: "jackson_pollock_3",
  pliegues: { pecho: 10, abdomen: 15, muslo: 12 },
  edad: 30,
});
checkNull("JP3 sin sexo → null", jp3null);

// ── Jackson-Pollock 7 ─────────────────────────────────────────────────────────

console.log("\n=== Jackson-Pollock 7 ===");

// Hombre 35a, 7 pliegues = 8+10+12+15+20+13+14 = 92
// D = 1.112 - 0.00043499×92 + 0.00000055×92² - 0.00028826×35
// = 1.112 - 0.04002 + 0.004659 - 0.010089 = 1.06655
// %grasa = (4.95/1.06655 - 4.50)×100 = (4.6413 - 4.50)×100 = 14.13%
const jp7 = calcularGrasaCorporal({
  formula: "jackson_pollock_7",
  pliegues: { pecho: 8, axilar_medio: 10, triceps: 12, subescapular: 15, abdomen: 20, suprailiaco: 13, muslo: 14 },
  sexo: "M",
  edad: 35,
});
check("JP7 hombre 35a Σ92mm %grasa ≈ 14.1", jp7?.percGrasa, 14.13, 0.5);

// ── Faulkner ──────────────────────────────────────────────────────────────────

console.log("\n=== Faulkner ===");

// Σ4 = 10+12+15+18=55 → %grasa = 0.153×55 + 5.783 = 8.415 + 5.783 = 14.198
const faulkner1 = calcularGrasaCorporal({
  formula: "faulkner",
  pliegues: { triceps: 10, subescapular: 12, suprailiaco: 15, abdomen: 18 },
});
check("Faulkner Σ55mm %grasa ≈ 14.20", faulkner1?.percGrasa, 14.20, 0.01);
checkNull("Faulkner densidad = null", faulkner1?.densidadCorporal ?? null);

// Faulkner no requiere sexo/edad
const faulknerNoSexo = calcularGrasaCorporal({
  formula: "faulkner",
  pliegues: { triceps: 10, subescapular: 12, suprailiaco: 15, abdomen: 18 },
});
check("Faulkner sin sexo funciona igual", faulknerNoSexo?.percGrasa, 14.20, 0.01);

// ── calcularMasaMagra ─────────────────────────────────────────────────────────

console.log("\n=== calcularMasaMagra ===");

check("Masa magra 70kg 20%grasa = 56kg", calcularMasaMagra(70, 20), 56.0, 0.01);
check("Masa magra 80kg 25%grasa = 60kg", calcularMasaMagra(80, 25), 60.0, 0.01);

// ── getSitiosRequeridos ───────────────────────────────────────────────────────

console.log("\n=== getSitiosRequeridos ===");

const sitiosDW = getSitiosRequeridos("durnin_womersley", "M");
check("D-W sitios M = 4",     sitiosDW.length,    4);
check("D-W incluye biceps",   sitiosDW.includes("biceps"), true);

const sitiosJP3M = getSitiosRequeridos("jackson_pollock_3", "M");
check("JP3 M: pecho presente", sitiosJP3M.includes("pecho"), true);
check("JP3 M: muslo presente", sitiosJP3M.includes("muslo"), true);

const sitiosJP3F = getSitiosRequeridos("jackson_pollock_3", "F");
check("JP3 F: triceps presente",    sitiosJP3F.includes("triceps"),    true);
check("JP3 F: suprailiaco presente", sitiosJP3F.includes("suprailiaco"), true);
check("JP3 F: pecho NO presente",   sitiosJP3F.includes("pecho"),     false);

// ── FORMULAS_PLIEGUES metadata ────────────────────────────────────────────────

console.log("\n=== FORMULAS_PLIEGUES metadata ===");

check("4 fórmulas registradas", Object.keys(FORMULAS_PLIEGUES).length, 4);
check("D-W requiere edad",  FORMULAS_PLIEGUES.durnin_womersley.requiereEdad,  true);
check("Faulkner no requiere edad", FORMULAS_PLIEGUES.faulkner.requiereEdad,   false);
check("Faulkner no requiere sexo", FORMULAS_PLIEGUES.faulkner.requiereSexo,   false);

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Sprint N1 Nutrición — ${passed + failed} checks: ${passed} ✓  ${failed} ✗`);
if (failed > 0) {
  console.log("FALLÓ");
  process.exit(1);
} else {
  console.log("OK");
}
