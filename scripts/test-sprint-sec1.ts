/**
 * test-sprint-sec1.ts
 * Sprint SEC-1 — Fixes de auditoría de seguridad (funciones puras, sin DB).
 *
 * Valida:
 *  - FIX 2: seudonimizarTexto — nombre/RUT/teléfono/email del paciente + genéricos.
 *           Casos con tilde ("José Muñoz") y RUT con/sin puntos.
 *  - FIX 3: sanitizeJsonbStrings — strips onerror/<img> en strings HTML anidados,
 *           preserva valores no-HTML.
 *
 * Los checks de aislamiento multi-tenant (FIX 1) y errores DB genéricos (FIX 4)
 * requieren Supabase/HTTP y se validan por revisión + build.
 */

import { seudonimizarTexto, type PIIPaciente } from "../src/lib/ia/sanitize-pii";
import { sanitizeJsonbStrings } from "../src/lib/sanitize";

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

// ── FIX 2: seudonimizarTexto ─────────────────────────────────────────────────
console.log("\nFIX 2 — seudonimización PII");

const pii: PIIPaciente = {
  nombre: "José",
  apellido_paterno: "Muñoz",
  apellido_materno: "Paz",
  rut: "12.345.678-9",
  telefono: "+56 9 8765 4321",
  email: "jose@mail.com",
};

const conTilde = seudonimizarTexto(
  "Paciente José Muñoz Paz, RUT 12.345.678-9, tel +56 9 8765 4321, mail jose@mail.com. Refiere dolor.",
  pii
);
check(!/Jos[eé]/i.test(conTilde), "nombre con tilde eliminado", "nombre con tilde SOBREVIVE");
check(!/Mu[nñ]oz/i.test(conTilde), "apellido con ñ eliminado", "apellido con ñ SOBREVIVE");
check(!/12\.?345\.?678/i.test(conTilde), "RUT con puntos eliminado", "RUT con puntos SOBREVIVE");
check(!/8765\s?4321/.test(conTilde), "teléfono eliminado", "teléfono SOBREVIVE");
check(!/jose@mail/i.test(conTilde), "email eliminado", "email SOBREVIVE");
check(/\[NOMBRE\]/.test(conTilde) && /\[RUT\]/.test(conTilde), "placeholders presentes", "placeholders faltan");

const sinTilde = seudonimizarTexto("Jose Munoz consulta. RUT 5432109-K sin puntos.", pii);
check(!/Jos[eé]|Mu[nñ]oz/i.test(sinTilde), "nombre/apellido sin tilde eliminado", "nombre sin tilde SOBREVIVE");
check(!/5432109-K/i.test(sinTilde), "RUT sin puntos eliminado", "RUT sin puntos SOBREVIVE");

const terceros = seudonimizarTexto("Derivado por dr@clinica.cl, RUT tercero 9.876.543-2.", {});
check(!/dr@clinica/i.test(terceros), "email de tercero (genérico) eliminado", "email tercero SOBREVIVE");
check(!/9\.?876\.?543/.test(terceros), "RUT de tercero (genérico) eliminado", "RUT tercero SOBREVIVE");

check(seudonimizarTexto("", pii) === "", "string vacío → vacío", "no manejó vacío");
const sinPii = seudonimizarTexto("Texto clínico sin identificadores.", {});
check(sinPii === "Texto clínico sin identificadores.", "texto sin PII intacto", "alteró texto sin PII");

// ── FIX 3: sanitizeJsonbStrings ──────────────────────────────────────────────
console.log("\nFIX 3 — sanitizeJsonbStrings");

const payload = {
  campoRich: "<ul><li>eval</li></ul><img src=x onerror=alert(1)>",
  nested: { obs: "<p>ok</p><script>steal()</script>", num: 42, plano: "sin html < 10" },
  arr: ["<strong>bold</strong><iframe src=evil>", "texto plano"],
};
const limpio = sanitizeJsonbStrings(payload);

check(!/onerror/i.test(limpio.campoRich) && !/<img/i.test(limpio.campoRich), "onerror/<img> eliminado", "onerror SOBREVIVE");
check(/<ul>|<li>/i.test(limpio.campoRich), "tags whitelisted preservados", "tags válidos eliminados");
check(!/<script/i.test(limpio.nested.obs) && /<p>/i.test(limpio.nested.obs), "script anidado eliminado, <p> preservado", "script anidado SOBREVIVE");
check(limpio.nested.num === 42, "número intacto", "alteró número");
check(limpio.nested.plano === "sin html < 10", "string plano no-HTML intacto", "alteró string plano");
check(!/<iframe/i.test(limpio.arr[0]) && /<strong>/i.test(limpio.arr[0]), "iframe en array eliminado, strong preservado", "iframe en array SOBREVIVE");
check(limpio.arr[1] === "texto plano", "string plano en array intacto", "alteró string plano en array");

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron. Sprint SEC-1 (FIX 2 + FIX 3) validado.");
  process.exit(0);
}
