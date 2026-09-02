/**
 * test-sprint-pre1.ts
 *
 * Script de validación del Sprint PRE-1 (tarificación y presupuestos).
 * Casos 1–12 de la sección 10 del doc del sprint:
 * docs/plan-redisenio/sprints/PRE-1-tarificacion-presupuestos.md
 *
 * Funciones puras, sin DB. El caso 12 (PDF sin honorario_*) vive aquí mismo
 * y se activa con el builder HTML de F6 (src/lib/presupuestos/pdf-html.ts).
 *
 * USO: npm run test:sprint-pre1
 *
 * Sale con código 0 si todo OK, código 1 si hay errores.
 */

import {
  resolverPrecio,
  calcular,
  calcularHonorarioClp,
  calcularSaldo,
  puedeFirmar,
  validarLineas,
} from "../src/lib/tarificacion";
import type {
  LineaCalculada,
  LineaInput,
  PoliticaDescuento,
  PrestacionCatalogo,
  ProfesionalPrestacion,
} from "../src/lib/tarificacion";

// ── Utils ─────────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
let errCount = 0;
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; errCount++; }
function section(title: string) { console.log(`\n── ${title} ──`); }

function assert(cond: boolean, msgExito: string, msgFallo: string) {
  if (cond) ok(msgExito); else fail(msgFallo);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function prestacion(over: Partial<PrestacionCatalogo> = {}): PrestacionCatalogo {
  return {
    id: "prest-0001",
    codigo: "DEN-001",
    nombre: "Evaluación dental",
    precio_base: 30_000,
    afecta_iva: false,
    ...over,
  };
}

function override(over: Partial<ProfesionalPrestacion> = {}): ProfesionalPrestacion {
  return {
    precio_override: null,
    recargo_pct: null,
    honorario_tipo: null,
    honorario_valor: null,
    ...over,
  };
}

function linea(over: Partial<LineaInput> = {}): LineaInput {
  return {
    prestacion: prestacion(),
    override: null,
    cantidad: 1,
    ...over,
  };
}

const POLITICA_MAX_20: PoliticaDescuento = { permite_descuento_item: true, descuento_max_pct: 20 };

// ── Main ──────────────────────────────────────────────────────────────────────

function run() {
  // ── Caso 1: centralizado ignora override ──────────────────────────────────

  section("Caso 1 — centralizado ignora precio_override y recargo_pct");

  {
    const r = resolverPrecio(
      prestacion(),
      override({ precio_override: 50_000, recargo_pct: 50 }),
      "centralizado",
    );
    assert(r.precio_unitario === 30_000, "precio = 30.000 (precio_base)", `esperaba 30000, got ${r.precio_unitario}`);
    assert(r.origen === "clinica", "origen = 'clinica'", `esperaba 'clinica', got ${r.origen}`);
    assert(r.recargo_pct === 0, "recargo_pct = 0", `esperaba 0, got ${r.recargo_pct}`);
  }

  // ── Caso 2: base_mas_recargo 20% ──────────────────────────────────────────

  section("Caso 2 — base_mas_recargo: base 30.000 + recargo 20% → 36.000");

  {
    const r = resolverPrecio(prestacion(), override({ recargo_pct: 20 }), "base_mas_recargo");
    assert(r.precio_unitario === 36_000, "precio = 36.000", `esperaba 36000, got ${r.precio_unitario}`);
    assert(r.origen === "recargo", "origen = 'recargo'", `esperaba 'recargo', got ${r.origen}`);
  }

  // ── Caso 3: base_mas_recargo sin recargo no falla ─────────────────────────

  section("Caso 3 — base_mas_recargo sin recargo_pct → 30.000, no falla");

  {
    const rSinOverride = resolverPrecio(prestacion(), null, "base_mas_recargo");
    assert(rSinOverride.precio_unitario === 30_000, "sin override: precio = 30.000", `got ${rSinOverride.precio_unitario}`);
    const rConNull = resolverPrecio(prestacion(), override({ recargo_pct: null }), "base_mas_recargo");
    assert(rConNull.precio_unitario === 30_000, "recargo_pct null: precio = 30.000", `got ${rConNull.precio_unitario}`);
  }

  // ── Caso 4: por_profesional sin override cae a base ───────────────────────

  section("Caso 4 — por_profesional sin override → precio_base, origen 'clinica'");

  {
    const r = resolverPrecio(prestacion(), null, "por_profesional");
    assert(r.precio_unitario === 30_000, "precio = 30.000", `got ${r.precio_unitario}`);
    assert(r.origen === "clinica", "origen = 'clinica'", `got ${r.origen}`);
    const rCon = resolverPrecio(prestacion(), override({ precio_override: 45_000 }), "por_profesional");
    assert(rCon.precio_unitario === 45_000 && rCon.origen === "profesional", "con override 45.000 → 45.000, origen 'profesional'", `got ${rCon.precio_unitario}/${rCon.origen}`);
  }

  // ── Caso 5: precio_base = 0 bloquea firma ─────────────────────────────────

  section("Caso 5 — precio_base = 0 → pendiente de tarificar, no se firma");

  {
    const r = resolverPrecio(prestacion({ precio_base: 0 }), null, "centralizado");
    assert(r.pendiente_tarificar === true, "ítem marcado pendiente_tarificar", "esperaba pendiente_tarificar=true");
    const calc = calcular([linea({ prestacion: prestacion({ precio_base: 0 }) })], "centralizado");
    assert(calc.pendiente_tarificar === true, "presupuesto con pendiente_tarificar=true", "esperaba pendiente_tarificar=true en el cálculo");
    assert(puedeFirmar(calc) === false, "puedeFirmar = false", "esperaba puedeFirmar=false");
  }

  // ── Caso 6: redondeo por línea ────────────────────────────────────────────

  section("Caso 6 — redondeo por línea: base 33.333, recargo 15%, cant. 3");

  {
    const p = prestacion({ precio_base: 33_333 });
    const calc = calcular([linea({ prestacion: p, override: override({ recargo_pct: 15 }), cantidad: 3 })], "base_mas_recargo");
    const l = calc.lineas[0];
    assert(l.precio_unitario === 38_333, "precio_unitario = round(33333×1.15) = 38.333", `got ${l.precio_unitario}`);
    const sumaLineas = calc.lineas.reduce((s, li) => s + li.total_linea_clp, 0);
    assert(
      sumaLineas === calc.total_clp && calc.total_clp === 114_999,
      `Σ líneas enteras (${sumaLineas}) == total_clp (${calc.total_clp}) = 114.999`,
      `Σ=${sumaLineas}, total=${calc.total_clp}`,
    );
    assert(Number.isInteger(calc.total_clp) && Number.isInteger(l.precio_unitario), "todo entero CLP", "aparecen no-enteros");
  }

  // ── Caso 7: mixto exento/afecto ───────────────────────────────────────────

  section("Caso 7 — mixto exento/afecto: iva solo sobre líneas afectas");

  {
    const calc = calcular(
      [
        linea({ prestacion: prestacion({ id: "p-ex", codigo: "EX-001", afecta_iva: false, precio_base: 10_000 }) }),
        linea({ prestacion: prestacion({ id: "p-af", codigo: "AF-001", afecta_iva: true, precio_base: 23_800 }) }),
      ],
      "centralizado",
    );
    assert(calc.lineas[0].iva_linea_clp === 0, "línea exenta: iva = 0", `got ${calc.lineas[0].iva_linea_clp}`);
    assert(calc.lineas[1].iva_linea_clp === 3_800, "línea afecta 23.800: iva = 3.800", `got ${calc.lineas[1].iva_linea_clp}`);
    assert(calc.iva_clp === 3_800, "iva_clp = 3.800 (solo afectas)", `got ${calc.iva_clp}`);
    assert(calc.total_clp === 33_800, "total = 33.800", `got ${calc.total_clp}`);
    assert(calc.neto_clp + calc.iva_clp === calc.total_clp, `neto (${calc.neto_clp}) + iva (${calc.iva_clp}) == total`, "neto+iva != total");
  }

  // ── Caso 8: descuento_pct > descuento_max_pct ─────────────────────────────

  section("Caso 8 — descuento_pct 30% > max 20% → rechazo server-side");

  {
    const v = validarLineas([linea({ descuento_pct: 30 })], POLITICA_MAX_20);
    assert(v.ok === false, "validarLineas rechaza", "esperaba rechazo");
    const vOk = validarLineas([linea({ descuento_pct: 20 })], POLITICA_MAX_20);
    assert(vOk.ok === true, "descuento 20% (== max) pasa", "rechazó estando en el límite");
    const vProhibido = validarLineas([linea({ descuento_pct: 5 })], { permite_descuento_item: false, descuento_max_pct: 100 });
    assert(vProhibido.ok === false, "clínica sin descuentos por ítem → rechaza cualquier > 0", "esperaba rechazo");
  }

  // ── Caso 9: snapshot no cambia con el catálogo ────────────────────────────

  section("Caso 9 — firmado + cambio de precio_base en catálogo → snapshot intacto");

  {
    const catalogo = prestacion({ precio_base: 30_000 });
    const calc = calcular([linea({ prestacion: catalogo })], "centralizado");
    const snapshot: LineaCalculada = { ...calc.lineas[0] };

    catalogo.precio_base = 99_999; // el catálogo cambia después de firmar

    const recalculado = calcular([linea({ prestacion: catalogo })], "centralizado");
    assert(
      snapshot.precio_base === 30_000 && snapshot.total_linea_clp === 30_000,
      "snapshot congelado en 30.000",
      `snapshot alterado: ${snapshot.precio_base}/${snapshot.total_linea_clp}`,
    );
    assert(
      recalculado.lineas[0].precio_base === 99_999,
      "recalcular con catálogo nuevo da otro precio (correcto: no se recalcula post-firma, trigger F4 lo bloquea en DB)",
      "el recálculo no refleja el cambio",
    );
  }

  // ── Caso 10: saldo descuenta solo aprobados ───────────────────────────────

  section("Caso 10 — 2 pagos aprobados + 1 rechazado → saldo solo aprueba los aprobados");

  {
    const s = calcularSaldo(30_000, [
      { monto_clp: 10_000, estado: "aprobado" },
      { monto_clp: 5_000, estado: "aprobado" },
      { monto_clp: 2_000, estado: "rechazado" },
      { monto_clp: 1_000, estado: "pendiente" },
    ]);
    assert(s.pagado_clp === 15_000, "pagado = 15.000 (solo aprobados)", `got ${s.pagado_clp}`);
    assert(s.saldo_clp === 15_000, "saldo = 15.000", `got ${s.saldo_clp}`);
  }

  // ── Caso 11: honorario no influye en precio_unitario ──────────────────────

  section("Caso 11 — honorario 40% + recargo 20% → precio_unitario intacto");

  {
    const r = resolverPrecio(
      prestacion(),
      override({ recargo_pct: 20, honorario_tipo: "porcentaje", honorario_valor: 40 }),
      "base_mas_recargo",
    );
    assert(r.precio_unitario === 36_000, "precio_unitario = 36.000 (solo recargo)", `got ${r.precio_unitario}`);
    const h = calcularHonorarioClp(r, 36_000, 1);
    assert(h === 14_400, "honorario_clp = 14.400 (capa B)", `got ${h}`);
    const rSinHonorario = resolverPrecio(prestacion(), override({ recargo_pct: 20 }), "base_mas_recargo");
    assert(
      rSinHonorario.precio_unitario === r.precio_unitario,
      "precio idéntico con y sin honorario configurado",
      "el honorario alteró el precio",
    );
  }

  // ── Caso 12: PDF sin honorario_* ──────────────────────────────────────────

  section("Caso 12 — PDF: ningún campo honorario_* en el HTML de salida");

  {
    try {
      // El builder puro vive en F6; import dinámico para no romper F3 si aún no existe.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("../src/lib/presupuestos/pdf-html") as {
        presupuestoHtml: (p: unknown, clinicaNombre?: string) => string;
      };
      const presupuestoConHonorarios = {
        titulo: "Presupuesto test",
        estado: "enviado",
        firmado: true,
        subtotal_clp: 36_000,
        descuento_clp: 0,
        neto_clp: 36_000,
        iva_clp: 0,
        total_clp: 36_000,
        items: [{
          id: "it-1",
          descripcion: "Evaluación dental",
          codigo: "DEN-001",
          cantidad: 1,
          precio_unitario: 36_000,
          total_linea_clp: 36_000,
          honorario_tipo: "porcentaje",
          honorario_valor: 40,
          honorario_clp: 14_400,
        }],
      };
      const html = mod.presupuestoHtml(presupuestoConHonorarios, "Clínica Test");
      const fuga = /honorario/i.test(html);
      assert(!fuga, "HTML del PDF sin rastro de 'honorario'", "FUGA: honorario_* presente en el HTML del PDF");
    } catch {
      fail("Caso 12 requiere F6 (src/lib/presupuestos/pdf-html.ts) — aún no existe");
    }
  }

  // ── Resultado ─────────────────────────────────────────────────────────────

  console.log("\n── Resultado ──");

  if (errCount > 0) {
    console.error(`❌ Sprint PRE-1: hay casos fallidos (${errCount}). Ver detalles arriba.`);
    process.exitCode = 1;
  } else {
    console.log("✅ Sprint PRE-1: los 12 casos de tarificación pasan.");
  }
}

run();
