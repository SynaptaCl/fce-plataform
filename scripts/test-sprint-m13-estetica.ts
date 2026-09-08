/**
 * test-sprint-m13-estetica.ts
 * Sprint M13 — Módulo Ficha Estética
 */

import { ZONAS_FACIALES, ZONAS_CORPORALES, getLabelZona, esZonaValida } from "../src/lib/estetica/zonas";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";

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

console.log("\n[Test 1] Catálogo de zonas estáticas");
check(ZONAS_FACIALES.length === 7, "7 zonas faciales definidas", `Se esperaban 7 zonas faciales, hay ${ZONAS_FACIALES.length}`);
check(ZONAS_CORPORALES.length === 6, "6 zonas corporales definidas", `Se esperaban 6 zonas corporales, hay ${ZONAS_CORPORALES.length}`);
check(getLabelZona("facial", "frente") === "Frente", "getLabelZona resuelve 'frente' → 'Frente'", "getLabelZona falló para 'frente'");
check(getLabelZona("facial", "codigo_inexistente") === "codigo_inexistente", "getLabelZona hace fallback al código si no existe", "getLabelZona no hizo fallback correctamente");
check(esZonaValida("facial", "labios") === true, "esZonaValida acepta 'labios' en facial", "esZonaValida rechazó 'labios' en facial");
check(esZonaValida("corporal", "labios") === false, "esZonaValida rechaza 'labios' en corporal", "esZonaValida aceptó 'labios' en corporal incorrectamente");
check(esZonaValida("corporal", "abdomen") === true, "esZonaValida acepta 'abdomen' en corporal", "esZonaValida rechazó 'abdomen' en corporal");

console.log("\n[Test 2] Wiring de módulo M13 en registry.ts");
check(MODULE_REGISTRY.M13_estetica !== undefined, "MODULE_REGISTRY tiene entrada M13_estetica", "MODULE_REGISTRY no tiene M13_estetica");
check(MODULE_REGISTRY.M13_estetica?.obligatorio === false, "M13_estetica no es obligatorio", "M13_estetica no debería ser obligatorio");
check(
  MODULE_REGISTRY.M13_estetica?.tablasSupabase.includes("fce_fichas_esteticas") ?? false,
  "M13_estetica declara fce_fichas_esteticas",
  "M13_estetica no declara fce_fichas_esteticas en tablasSupabase"
);

console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron.");
  process.exit(0);
}
