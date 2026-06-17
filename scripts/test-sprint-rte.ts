/**
 * test-sprint-rte.ts
 * Sprint RTE — Rich Text Editor transversal
 *
 * Valida (sin DB — funciones puras):
 *  - sanitizeRichText: whitelist de tags, eliminación de scripts/atributos
 *  - stripHtml: extracción de texto plano + passthrough legacy
 *  - isRichTextHtml: detección de HTML vs texto plano
 *  - textoPlanoAHtml: conversión segura de texto plano a HTML
 *  - sanitizeSeccionesEstructuradas: forma M10 (string raíz) + P2 (objeto anidado)
 *
 * Los checks de INSERT/UPDATE contra DB y la inmutabilidad post-firma se cubren
 * en el smoke manual (sección 6.2 del sprint) — requieren Supabase + IDs reales.
 */

import { sanitizeRichText } from "../src/lib/sanitize";
import { isRichTextHtml } from "../src/lib/utils";
import { stripHtml, textoPlanoAHtml } from "../src/lib/utils";

// Réplica de la lógica privada de nota-clinica.ts para validar su contrato.
function sanitizeSeccionesEstructuradas(
  secciones: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!secciones || typeof secciones !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [seccionId, contenidoSeccion] of Object.entries(secciones)) {
    if (typeof contenidoSeccion === "string") {
      out[seccionId] = sanitizeRichText(contenidoSeccion);
    } else if (contenidoSeccion && typeof contenidoSeccion === "object" && !Array.isArray(contenidoSeccion)) {
      const sub: Record<string, unknown> = {};
      for (const [campoId, valor] of Object.entries(contenidoSeccion as Record<string, unknown>)) {
        sub[campoId] = typeof valor === "string" ? sanitizeRichText(valor) : valor;
      }
      out[seccionId] = sub;
    } else {
      out[seccionId] = contenidoSeccion;
    }
  }
  return out;
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

// ── 1. sanitizeRichText elimina vectores peligrosos ───────────────────────────

console.log("\n[Test 1] sanitizeRichText elimina scripts, iframes, styles, handlers");

check(
  !/<script/i.test(sanitizeRichText("<p>hola</p><script>alert(1)</script>")),
  "elimina <script>",
  "NO eliminó <script>"
);
check(
  !/<iframe/i.test(sanitizeRichText('<iframe src="x"></iframe><p>ok</p>')),
  "elimina <iframe>",
  "NO eliminó <iframe>"
);
check(
  !/<style/i.test(sanitizeRichText("<style>body{display:none}</style><p>ok</p>")),
  "elimina <style>",
  "NO eliminó <style>"
);
check(
  !/onerror/i.test(sanitizeRichText('<img src=x onerror="alert(1)">')),
  "elimina handler onerror",
  "NO eliminó onerror"
);
check(
  !/onclick/i.test(sanitizeRichText('<p onclick="evil()">hola</p>')),
  "elimina handler onclick",
  "NO eliminó onclick"
);

// ── 2. sanitizeRichText preserva la whitelist ─────────────────────────────────

console.log("\n[Test 2] sanitizeRichText preserva tags de la whitelist");

const TAGS = ["strong", "em", "u", "ul", "ol", "li", "h2", "h3", "blockquote", "p"];
for (const tag of TAGS) {
  const input = tag === "li" ? "<ul><li>x</li></ul>" : `<${tag}>x</${tag}>`;
  const out = sanitizeRichText(input);
  check(
    new RegExp(`<${tag}\\b`, "i").test(out),
    `preserva <${tag}>`,
    `eliminó <${tag}> (out: ${out})`
  );
}
check(/<br\s*\/?>/i.test(sanitizeRichText("<p>a<br>b</p>")), "preserva <br>", "eliminó <br>");

// ── 3. sanitizeRichText elimina atributos ─────────────────────────────────────

console.log("\n[Test 3] sanitizeRichText elimina atributos style/class/id");

const conAttrs = sanitizeRichText('<p style="color:red" class="x" id="y">hola</p>');
check(!/style=/i.test(conAttrs), "elimina atributo style", `mantuvo style (${conAttrs})`);
check(!/class=/i.test(conAttrs), "elimina atributo class", `mantuvo class (${conAttrs})`);
check(!/id=/i.test(conAttrs), "elimina atributo id", `mantuvo id (${conAttrs})`);
check(/hola/.test(conAttrs), "preserva el texto interno", "perdió el texto interno");

// ── 4. sanitizeRichText con vacío/null ────────────────────────────────────────

console.log("\n[Test 4] sanitizeRichText maneja vacío/null");
check(sanitizeRichText("") === "", 'sanitizeRichText("") === ""', "no devolvió cadena vacía");
check(sanitizeRichText(null) === "", "sanitizeRichText(null) === ''", "no manejó null");
check(sanitizeRichText(undefined) === "", "sanitizeRichText(undefined) === ''", "no manejó undefined");

// ── 5. stripHtml ──────────────────────────────────────────────────────────────

console.log("\n[Test 5] stripHtml extrae texto plano");
check(
  stripHtml("<p>hola</p><p>mundo</p>") === "hola\nmundo",
  "stripHtml convierte párrafos en saltos de línea",
  `stripHtml resultado inesperado: ${JSON.stringify(stripHtml("<p>hola</p><p>mundo</p>"))}`
);
check(
  stripHtml("texto plano") === "texto plano",
  "stripHtml passthrough de texto legacy",
  "stripHtml alteró texto plano legacy"
);
check(stripHtml(null) === "", "stripHtml(null) === ''", "stripHtml no manejó null");
check(
  stripHtml("<ul><li>uno</li><li>dos</li></ul>").includes("uno") &&
    stripHtml("<ul><li>uno</li><li>dos</li></ul>").includes("dos"),
  "stripHtml extrae items de lista",
  "stripHtml perdió items de lista"
);
check(
  stripHtml("<p>a &amp; b</p>") === "a & b",
  "stripHtml decodifica entidades HTML",
  `stripHtml no decodificó entidades: ${JSON.stringify(stripHtml("<p>a &amp; b</p>"))}`
);

// ── 6. isRichTextHtml ─────────────────────────────────────────────────────────

console.log("\n[Test 6] isRichTextHtml detecta HTML vs texto plano");
check(isRichTextHtml("<p>hola</p>") === true, "detecta <p> como HTML", "no detectó <p>");
check(isRichTextHtml("<strong>x</strong>") === true, "detecta <strong> como HTML", "no detectó <strong>");
check(isRichTextHtml("hola") === false, "texto plano NO es HTML", "falso positivo en texto plano");
check(isRichTextHtml(null) === false, "isRichTextHtml(null) === false", "no manejó null");
check(
  isRichTextHtml("PA <120/80 mmHg") === false,
  "NO genera falso positivo con '<' literal seguido de número",
  "falso positivo con 'PA <120/80'"
);

// ── 7. textoPlanoAHtml ────────────────────────────────────────────────────────

console.log("\n[Test 7] textoPlanoAHtml convierte texto plano en HTML seguro");
check(
  textoPlanoAHtml("uno\n\ndos") === "<p>uno</p><p>dos</p>",
  "dos párrafos → dos <p>",
  `resultado: ${textoPlanoAHtml("uno\n\ndos")}`
);
check(
  textoPlanoAHtml("a\nb") === "<p>a<br>b</p>",
  "salto simple → <br>",
  `resultado: ${textoPlanoAHtml("a\nb")}`
);
check(
  !/<script/i.test(textoPlanoAHtml("<script>alert(1)</script>")),
  "escapa contenido peligroso (sin <script>)",
  "textoPlanoAHtml no escapó <script>"
);
check(textoPlanoAHtml("") === "", "textoPlanoAHtml('') === ''", "no manejó vacío");

// ── 8. sanitizeSeccionesEstructuradas (M10 + P2 mixto) ────────────────────────

console.log("\n[Test 8] sanitizeSeccionesEstructuradas maneja forma M10 y P2");
const mixto = sanitizeSeccionesEstructuradas({
  // M10: string plano en raíz
  conductas_observadas: "<p>ok</p><script>alert(1)</script>",
  // P2: objeto anidado
  contenido: {
    anamnesis: "<strong>relato</strong><iframe></iframe>",
    peso_kg: "70",
  },
});
check(
  typeof mixto?.conductas_observadas === "string" &&
    !/<script/i.test(mixto!.conductas_observadas as string),
  "M10 string raíz: script eliminado",
  "M10 string raíz NO sanitizado"
);
const contenidoSec = mixto?.contenido as Record<string, unknown> | undefined;
check(
  typeof contenidoSec?.anamnesis === "string" &&
    !/<iframe/i.test(contenidoSec!.anamnesis as string) &&
    /<strong/i.test(contenidoSec!.anamnesis as string),
  "P2 anidado: iframe eliminado, strong preservado",
  "P2 anidado NO sanitizado correctamente"
);
check(contenidoSec?.peso_kg === "70", "P2: valores no-narrativos intactos", "P2 alteró peso_kg");
check(sanitizeSeccionesEstructuradas(null) === null, "null → null", "no manejó null");

// ── Resumen ────────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.error("\nErrores:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log("✓ Todos los checks pasaron. Sprint RTE validado.");
  process.exit(0);
}
