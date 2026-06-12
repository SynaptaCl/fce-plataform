/**
 * test-sprint-n2-nutricion.ts
 * Valida z-score LMS OMS y clasificación Atalah gestacional.
 * Ejecutar: npx tsx scripts/test-sprint-n2-nutricion.ts
 */

import {
  getBMIDataset, getLMS, calcularZScore, calcularIndicadorPediatrico,
  clasificarZScoreIMC,
} from "../src/lib/nutricion/zscore";
import {
  clasificarIMCPregestacional, clasificarGestacional,
  calcularSemanaGestacional, getBandaLimites, GANANCIA_TOTAL,
} from "../src/lib/nutricion/atalah";

// ── Utils ─────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function near(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

function section(name: string) {
  console.log(`\n── ${name} ────────────────────────────────────────────`);
}

// ── 1. Z-score LMS: valores conocidos ────────────────────────────────────────

section("Z-score LMS OMS — casos conocidos");

// Niño 24 meses (2 años), IMC=16.5 → z ≈ 0 (normal)
// Valores OMS WHO 0-5 niños en 24 meses: M≈16.4, L≈-0.3, S≈0.09 (approx)
{
  const sexo = "M" as const;
  const ageMths = 24;
  const dataset = getBMIDataset(sexo, ageMths);
  ok("Dataset niño 0-5 retorna entradas", dataset.length > 0);

  const lms = getLMS(dataset, ageMths);
  ok("getLMS en 24 meses retorna objeto", lms !== null, `lms=${JSON.stringify(lms)}`);

  if (lms) {
    ok("LMS M razonable para niño 2 años (14-18)", lms.M >= 14 && lms.M <= 18, `M=${lms.M}`);
    ok("LMS S razonable (0.05-0.15)", lms.S >= 0.05 && lms.S <= 0.15, `S=${lms.S}`);

    // IMC = M → z debe ser ~0
    const z = calcularZScore(lms.M, lms);
    ok("IMC = M → z ≈ 0", near(z, 0, 0.01), `z=${z}`);

    // IMC 19 (sobrepeso probable) → z > 1
    const zHigh = calcularZScore(19, lms);
    ok("IMC 19 en niño 2 años → z > 1", zHigh > 1, `z=${zHigh.toFixed(2)}`);

    // IMC 13 (desnutrición) → z < -2
    const zLow = calcularZScore(13, lms);
    ok("IMC 13 en niño 2 años → z < -2", zLow < -2, `z=${zLow.toFixed(2)}`);
  }
}

// Niña 60 meses (5 años), dataset transición 0-5 → 5-19
{
  const sexo = "F" as const;
  const ageMths60 = 60;
  const ageMths72 = 72; // 6 años → debe usar dataset 5-19
  const d60 = getBMIDataset(sexo, ageMths60);
  const d72 = getBMIDataset(sexo, ageMths72);
  ok("Niña 60 meses usa dataset 0-5", d60.length > 0);
  ok("Niña 72 meses usa dataset 5-19", d72.length > 0);
  ok("Datasets distintos en límite 60 meses", d60 !== d72);
}

// Interpolación lineal
{
  const sexo = "M" as const;
  const dataset = getBMIDataset(sexo, 30);
  const lms30 = getLMS(dataset, 30);
  const lms36 = getLMS(dataset, 36);
  const lms33 = getLMS(dataset, 33); // debe ser interpolado entre 30 y 36
  if (lms30 && lms36 && lms33) {
    ok("Interpolación: M en 33 meses entre M30 y M36",
      lms33.M >= Math.min(lms30.M, lms36.M) - 0.01 &&
      lms33.M <= Math.max(lms30.M, lms36.M) + 0.01,
      `M30=${lms30.M.toFixed(2)}, M33=${lms33.M.toFixed(2)}, M36=${lms36.M.toFixed(2)}`
    );
  }
}

// calcularIndicadorPediatrico
section("calcularIndicadorPediatrico");

{
  const sexo = "M" as const;
  const ageMths = 48; // 4 años
  const dataset = getBMIDataset(sexo, ageMths);
  const lms = getLMS(dataset, ageMths);

  if (lms) {
    // Valor = M → z ≈ 0, clasificación Normal
    const res = calcularIndicadorPediatrico(lms.M, ageMths, dataset);
    ok("indicador con IMC=M retorna resultado", res !== null);
    if (res) {
      ok("z ≈ 0 cuando IMC=M", near(res.z, 0, 0.05), `z=${res.z}`);
      ok("percentil ≈ 50 cuando z=0", near(res.percentil, 50, 2), `p=${res.percentil}`);
      ok("clasificación Normal cuando z≈0", res.clasificacion === "Normal", `${res.clasificacion}`);
    }

    // Valor extremo alto → clasificación Obesidad
    const resHigh = calcularIndicadorPediatrico(22, ageMths, dataset);
    ok("IMC=22 en niño 4 años → z > 2", resHigh !== null && resHigh.z > 2, `z=${resHigh?.z.toFixed(2)}`);
    ok("IMC=22 en niño 4 años → clasificación sobrepeso/obesidad",
      resHigh !== null && ["Sobrepeso", "Obesidad", "Posible sobrepeso"].includes(resHigh.clasificacion),
      resHigh?.clasificacion
    );
  }
}

// clasificarZScoreIMC — 7 categorías
section("clasificarZScoreIMC — categorías OMS");

const CASOS_Z: [number, string][] = [
  [-3.5, "Desnutrición severa"],
  [-2.5, "Desnutrición"],
  [-1.5, "Riesgo bajo peso"],
  [0,    "Normal"],
  [1.5,  "Posible sobrepeso"],
  [2.5,  "Sobrepeso"],
  [3.5,  "Obesidad"],
];
for (const [z, expectedClasif] of CASOS_Z) {
  ok(`z=${z} → ${expectedClasif}`, clasificarZScoreIMC(z) === expectedClasif, clasificarZScoreIMC(z));
}

// ── 2. Atalah gestacional ─────────────────────────────────────────────────────

section("clasificarIMCPregestacional — categorías Atalah");

ok("IMC 17 → enflaquecida",  clasificarIMCPregestacional(17) === "enflaquecida");
ok("IMC 19.8 → normal",       clasificarIMCPregestacional(19.8) === "normal");
ok("IMC 22 → normal",          clasificarIMCPregestacional(22) === "normal");
ok("IMC 25.0 → sobrepeso",     clasificarIMCPregestacional(25.0) === "sobrepeso");
ok("IMC 28 → sobrepeso",       clasificarIMCPregestacional(28) === "sobrepeso");
ok("IMC 30 → obesa",           clasificarIMCPregestacional(30) === "obesa");
ok("IMC 35 → obesa",           clasificarIMCPregestacional(35) === "obesa");

section("GANANCIA_TOTAL — rangos razonables");

ok("enflaquecida: 12.5–18",  GANANCIA_TOTAL.enflaquecida.min === 12.5 && GANANCIA_TOTAL.enflaquecida.max === 18);
ok("normal: 11.5–16",         GANANCIA_TOTAL.normal.min === 11.5 && GANANCIA_TOTAL.normal.max === 16);
ok("sobrepeso: 7–11.5",        GANANCIA_TOTAL.sobrepeso.min === 7 && GANANCIA_TOTAL.sobrepeso.max === 11.5);
ok("obesa: 5–9",               GANANCIA_TOTAL.obesa.min === 5 && GANANCIA_TOTAL.obesa.max === 9);

section("clasificarGestacional — casos Atalah");

// Caso 1: mujer normal pregestacional, semana 22, IMC 25 → debe estar en normal
// (banda normal semana 22: inferior≈23.2, superior≈27.3)
{
  const res = clasificarGestacional(22, 25, 22);
  ok("Normal pregestacional, semana 22, IMC 23 → estado normal",
    res.estado === "normal",
    `estado=${res.estado}, descripcion=${res.descripcion}`
  );
  ok("Categoría base correcta: normal", res.categoria === "normal");
  ok("Semana en resultado = 22", res.semana === 22);
  ok("IMC actual en resultado", near(res.imcActual, 25, 0.01));
}

// Caso 2: mujer enflaquecida, semana 30, IMC bajo límite → bajo_peso
{
  const banda = getBandaLimites(17, 30); // enflaquecida, semana 30
  const imcBajo = banda.inferior - 1;
  const res = clasificarGestacional(17, imcBajo, 30);
  ok("Enflaquecida, IMC bajo límite → bajo_peso",
    res.estado === "bajo_peso",
    `estado=${res.estado}, imc=${imcBajo.toFixed(2)}, inf=${banda.inferior}`
  );
}

// Caso 3: mujer con sobrepeso pregestacional, semana 34, IMC muy alto → obesa
{
  const banda = getBandaLimites(27, 34); // sobrepeso, semana 34
  const imcAlto = banda.superior + 2;
  const res = clasificarGestacional(27, imcAlto, 34);
  ok("Sobrepeso pregestacional, IMC sobre límite sup → obesa",
    res.estado === "obesa",
    `estado=${res.estado}, imc=${imcAlto.toFixed(2)}, sup=${banda.superior}`
  );
}

// Caso 4: obesa pregestacional, semana 20, IMC dentro de banda → obesa (normal para su categoría)
{
  const banda = getBandaLimites(32, 20); // obesa, semana 20
  const imcDentro = (banda.inferior + banda.superior) / 2;
  const res = clasificarGestacional(32, imcDentro, 20);
  ok("Obesa pregestacional, IMC dentro de banda → obesa",
    res.estado === "obesa",
    `estado=${res.estado}, imc=${imcDentro.toFixed(2)}`
  );
}

// Caso 5: ganancia total en resultado
{
  const res = clasificarGestacional(22, 25, 26);
  ok("rangoGananciaTotal presente y razonable",
    res.rangoGananciaTotal.min > 0 && res.rangoGananciaTotal.max > res.rangoGananciaTotal.min,
    `min=${res.rangoGananciaTotal.min}, max=${res.rangoGananciaTotal.max}`
  );
}

section("getBandaLimites — límites razonables");

// Semana 22, todas las categorías: inferior < superior
const categoriasPre = [17, 22, 27, 32];
for (const imc_pre of categoriasPre) {
  const banda = getBandaLimites(imc_pre, 22);
  ok(`IMC pregest=${imc_pre}, semana 22: inferior < superior`,
    banda.inferior < banda.superior,
    `inf=${banda.inferior.toFixed(2)}, sup=${banda.superior.toFixed(2)}`
  );
}

// Bandas deben crecer con semanas (peso aumenta)
{
  const b20 = getBandaLimites(22, 20);
  const b30 = getBandaLimites(22, 30);
  ok("Banda normal semana 30 > semana 20 (peso aumenta)",
    b30.inferior > b20.inferior && b30.superior > b20.superior,
    `inf20=${b20.inferior.toFixed(2)}, inf30=${b30.inferior.toFixed(2)}`
  );
}

section("calcularSemanaGestacional");

// FUR hace exactamente 10 semanas (70 días)
{
  const hoyDate = new Date();
  const furDate = new Date(hoyDate.getTime() - 70 * 24 * 60 * 60 * 1000);
  const furStr = furDate.toISOString().slice(0, 10);
  const hoyStr = hoyDate.toISOString().slice(0, 10);
  const semanas = calcularSemanaGestacional(furStr, hoyStr);
  ok("FUR hace 70 días → 10 semanas", semanas === 10, `semanas=${semanas}`);
}

// FUR hace 28 semanas (196 días)
{
  const hoyDate = new Date();
  const furDate = new Date(hoyDate.getTime() - 196 * 24 * 60 * 60 * 1000);
  const semanas = calcularSemanaGestacional(
    furDate.toISOString().slice(0, 10),
    hoyDate.toISOString().slice(0, 10),
  );
  ok("FUR hace 196 días → 28 semanas", semanas === 28, `semanas=${semanas}`);
}

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Sprint N2 — Z-score OMS + Atalah gestacional`);
console.log(`✅ Pasados: ${passed}   ❌ Fallados: ${failed}   Total: ${passed + failed}`);
if (failed > 0) {
  console.log("\n⚠️  Revisar valores LMS y bandas Atalah — algunos pueden requerir ajuste fino.");
  process.exit(1);
} else {
  console.log("\nTodos los tests pasaron. ⚠️  PENDIENTE_CLINICA: verificar con nutricionista.");
}
