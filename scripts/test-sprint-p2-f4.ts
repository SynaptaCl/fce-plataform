/**
 * test-sprint-p2-f4.ts — Validación Sprint P2 Fase 4: Herramientas nutricionales
 *
 * Verifica:
 * 1. Los archivos SQL seed y antropometria.ts existen
 * 2. El SQL contiene los 3 instrumentos (mna, must, sga) y el WARNING de validación clínica
 * 3. Cálculos de IMC: 6 casos incluyendo casos borde
 * 4. Circunferencia cintura: diferenciación por sexo F y M
 *
 * Salida: exit 0 si OK, exit 1 si hay errores
 *
 * USO: npx tsx scripts/test-sprint-p2-f4.ts
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Archivos existen
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n── 1. Archivos requeridos ──");

const SQL_PATH = path.join(ROOT, "supabase", "migrations", "20260602_03_seed_instrumentos_nutricion.sql");
const ANTRO_PATH = path.join(ROOT, "src", "lib", "nutricion", "antropometria.ts");

const sqlContent = readFile(SQL_PATH);
const antroContent = readFile(ANTRO_PATH);

check(sqlContent !== null, `SQL seed existe: ${SQL_PATH}`);
check(antroContent !== null, `antropometria.ts existe: ${ANTRO_PATH}`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Contenido del SQL
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n── 2. Contenido SQL — instrumentos y WARNING ──");

if (sqlContent) {
  check(sqlContent.includes("'mna'"), "SQL contiene instrumento 'mna'");
  check(sqlContent.includes("'must'"), "SQL contiene instrumento 'must'");
  check(sqlContent.includes("'sga'"), "SQL contiene instrumento 'sga'");

  // WARNING de validación clínica (texto parcial del comentario requerido)
  check(
    sqlContent.includes("VALIDACIÓN CLÍNICA REQUERIDA"),
    "SQL contiene WARNING de validación clínica",
  );
  check(
    sqlContent.includes("nutricionista certificado"),
    "WARNING menciona nutricionista certificado",
  );

  // Atribuciones
  check(
    sqlContent.includes("Nestlé Nutrition Institute") || sqlContent.includes("Nestle Nutrition Institute"),
    "MNA incluye atribución a Nestlé Nutrition Institute",
  );
  check(
    sqlContent.includes("BAPEN"),
    "MUST incluye atribución a BAPEN",
  );
  check(
    sqlContent.includes("Detsky"),
    "SGA incluye atribución a Detsky et al.",
  );

  // Idempotencia
  check(
    (sqlContent.match(/ON CONFLICT \(codigo\) DO NOTHING/g) ?? []).length >= 3,
    "SQL tiene ON CONFLICT DO NOTHING en los 3 instrumentos",
  );

  // registro_externo para SGA
  check(
    sqlContent.includes("registro_externo"),
    "SQL incluye tipo_renderer 'registro_externo' para SGA",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cálculos de IMC — importar módulo directamente
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n── 3. Cálculos de IMC ──");

// Importar usando require (tsx transpila TS en runtime)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calcularIMC } = require(ANTRO_PATH) as typeof import("../src/lib/nutricion/antropometria");

interface CasoIMC {
  peso: number;
  talla: number;
  imcEsperado: number | null;
  clasificacionEsperada: string | null;
  descripcion: string;
}

const casosIMC: CasoIMC[] = [
  {
    peso: 70,
    talla: 170,
    imcEsperado: 24.22,
    clasificacionEsperada: "Normal",
    descripcion: "Peso 70 kg, talla 170 cm → IMC 24.22 → Normal",
  },
  {
    peso: 50,
    talla: 160,
    imcEsperado: 19.53,
    clasificacionEsperada: "Normal",
    descripcion: "Peso 50 kg, talla 160 cm → IMC 19.53 → Normal",
  },
  {
    peso: 100,
    talla: 170,
    imcEsperado: 34.60,
    clasificacionEsperada: "Obesidad I",
    descripcion: "Peso 100 kg, talla 170 cm → IMC 34.60 → Obesidad I",
  },
  {
    peso: 150,
    talla: 160,
    imcEsperado: 58.59,
    clasificacionEsperada: "Obesidad III",
    descripcion: "Peso 150 kg, talla 160 cm → IMC 58.59 → Obesidad III",
  },
  {
    peso: 45,
    talla: 165,
    imcEsperado: 16.53,
    clasificacionEsperada: "Bajo peso",
    descripcion: "Peso 45 kg, talla 165 cm → IMC 16.53 → Bajo peso",
  },
  {
    peso: 0,
    talla: 170,
    imcEsperado: null,
    clasificacionEsperada: null,
    descripcion: "Peso 0 kg (fuera de rango) → retornar null",
  },
];

for (const caso of casosIMC) {
  const resultado = calcularIMC(caso.peso, caso.talla);

  if (caso.imcEsperado === null) {
    // Caso borde: debe devolver null
    check(resultado === null, caso.descripcion);
  } else {
    check(resultado !== null, `${caso.descripcion} — resultado no es null`);
    if (resultado !== null) {
      // Tolerancia de ±0.02 por diferencias de redondeo
      const imcOk = Math.abs(resultado.imc - caso.imcEsperado) <= 0.02;
      check(imcOk, `  IMC: esperado ${caso.imcEsperado}, obtenido ${resultado.imc}`);
      check(
        resultado.clasificacion === caso.clasificacionEsperada,
        `  Clasificación: esperada "${caso.clasificacionEsperada}", obtenida "${resultado.clasificacion}"`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Circunferencia de cintura — diferenciación por sexo
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n── 4. Circunferencia de cintura ──");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { clasificarCircunferenciaCintura } = require(ANTRO_PATH) as typeof import("../src/lib/nutricion/antropometria");

interface CasoCintura {
  cm: number;
  sexo?: "M" | "F";
  esperadoContiene: string;
  descripcion: string;
}

const casosCintura: CasoCintura[] = [
  {
    cm: 90,
    sexo: "F",
    esperadoContiene: "Riesgo aumentado",
    descripcion: "Mujer 90 cm (>88) → Riesgo aumentado",
  },
  {
    cm: 84,
    sexo: "F",
    esperadoContiene: "Riesgo ligeramente aumentado",
    descripcion: "Mujer 84 cm (>80, ≤88) → Riesgo ligeramente aumentado",
  },
  {
    cm: 78,
    sexo: "F",
    esperadoContiene: "Sin riesgo aumentado",
    descripcion: "Mujer 78 cm (≤80) → Sin riesgo aumentado",
  },
  {
    cm: 105,
    sexo: "M",
    esperadoContiene: "Riesgo aumentado",
    descripcion: "Hombre 105 cm (>102) → Riesgo aumentado",
  },
  {
    cm: 96,
    sexo: "M",
    esperadoContiene: "Riesgo ligeramente aumentado",
    descripcion: "Hombre 96 cm (>94, ≤102) → Riesgo ligeramente aumentado",
  },
  {
    cm: 90,
    sexo: "M",
    esperadoContiene: "Sin riesgo aumentado",
    descripcion: "Hombre 90 cm (≤94) → Sin riesgo aumentado",
  },
  {
    cm: 0,
    sexo: "M",
    esperadoContiene: "fuera de rango",
    descripcion: "Cintura 0 cm (fuera de rango) → mensaje de error",
  },
];

for (const caso of casosCintura) {
  const resultado: string = clasificarCircunferenciaCintura(caso.cm, caso.sexo);
  check(
    resultado.toLowerCase().includes(caso.esperadoContiene.toLowerCase()),
    `${caso.descripcion} — obtenido: "${resultado}"`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen final
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n── Resultado ──`);
if (errors === 0) {
  console.log("  ✅ Todos los checks pasaron — Fase 4 OK\n");
  process.exit(0);
} else {
  console.error(`  ❌ ${errors} check(s) fallaron\n`);
  process.exit(1);
}
