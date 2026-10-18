/**
 * test-resumen-ia-incremental.ts
 * Resumen IA optimizado — decisión incremental vs completa (sin DB ni Anthropic: funciones puras).
 *
 * Valida:
 *  - decidirModo: sin previa, tope de 5 incrementales, cambio de contexto base, eventos forzados,
 *    evolución cubierta que desaparece, sin cambios, exceso de nuevas, caso incremental feliz
 *  - siguienteContador: completa reinicia, incremental suma
 *  - debeGenerarPorEvento: gating por demanda esperada y especialidad
 *  - estaDesactualizado: base del aviso "desactualizado" cuando falló la generación
 *  - calcularHashBase: ignora signos vitales, reacciona a medicación/alertas
 *  - buildUserPromptIncremental: solo evoluciones/adendas nuevas, sin UUID internos
 *
 * Las reglas "fallo → se conserva la última versión válida" y "contexto incompleto no se
 * persiste" se prueban por construcción, igual que test-resumen-ia-parcial.ts: en
 * lib/ia/resumen/generar.ts el INSERT de la versión vive después de llamarModelo (si lanza,
 * se retorna antes) y dentro de `if (!contexto.contexto_incompleto)`.
 */

import {
  MAX_INCREMENTALES,
  MIN_EVOLUCIONES_PRIMERA_GENERACION,
  debeGenerarPorEvento,
  decidirModo,
  estaDesactualizado,
  siguienteContador,
  type EntradaDecision,
  type VersionPrevia,
} from "../src/lib/ia/resumen/decision";
import { calcularHashBase } from "../src/lib/ia/cache";
import { buildUserPromptIncremental } from "../src/lib/ia/prompt";
import type { ContextoClinico } from "../src/lib/ia/contexto-clinico";

const errors: string[] = [];
let passCount = 0;
function check(cond: boolean, ok: string, ko: string) {
  if (cond) {
    console.log(`  ✓ ${ok}`);
    passCount++;
  } else {
    console.error(`  ✗ ${ko}`);
    errors.push(ko);
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function previa(over: Partial<VersionPrevia> = {}): VersionPrevia {
  return {
    version: 3,
    incrementales_desde_completa: 1,
    hash_contexto_base: "base-A",
    ids_evoluciones_cubiertas: ["e1", "e2"],
    ids_adendas_cubiertas: [],
    ...over,
  };
}

function entrada(over: Partial<EntradaDecision> = {}): EntradaDecision {
  return {
    previa: previa(),
    forzarCompleta: null,
    hashBaseActual: "base-A",
    idsEvolucionesActuales: ["e1", "e2", "e3"],
    idsEvolucionesEnPrompt: ["e1", "e2", "e3"],
    idsAdendasActuales: [],
    idsAdendasEnPrompt: [],
    ...over,
  };
}

// ── 1. decidirModo ───────────────────────────────────────────────────────────

console.log("\n[Test 1] decidirModo");

const d1 = decidirModo(entrada());
check(
  d1.modo === "incremental" && d1.idsNuevos.length === 1 && d1.idsNuevos[0] === "e3",
  "caso feliz: 1 evolución nueva → incremental con [e3]",
  `caso feliz inesperado: ${JSON.stringify(d1)}`
);

const d2 = decidirModo(entrada({ previa: null }));
check(d2.modo === "completa" && d2.motivo === "sin_version_previa", "sin versión previa → completa", `sin previa: ${JSON.stringify(d2)}`);

const d3 = decidirModo(entrada({ previa: previa({ incrementales_desde_completa: MAX_INCREMENTALES }) }));
check(
  d3.modo === "completa" && d3.motivo === "limite_incrementales",
  `${MAX_INCREMENTALES} incrementales encadenadas → completa`,
  `tope: ${JSON.stringify(d3)}`
);
const d3b = decidirModo(entrada({ previa: previa({ incrementales_desde_completa: MAX_INCREMENTALES - 1 }) }));
check(d3b.modo === "incremental", `${MAX_INCREMENTALES - 1} incrementales aún permite otra incremental`, `tope-1: ${JSON.stringify(d3b)}`);
check(MAX_INCREMENTALES === 5, "MAX_INCREMENTALES = 5 (acordado)", `MAX_INCREMENTALES = ${MAX_INCREMENTALES}`);

const d4 = decidirModo(entrada({ hashBaseActual: "base-B" }));
check(d4.modo === "completa" && d4.motivo === "cambio_contexto_base", "cambió el contexto base → completa", `base: ${JSON.stringify(d4)}`);

for (const motivo of ["alta", "cambio_plan", "edicion_evolucion", "adenda"] as const) {
  const d = decidirModo(entrada({ forzarCompleta: motivo }));
  check(d.modo === "completa" && d.motivo === motivo, `evento '${motivo}' fuerza completa`, `forzar ${motivo}: ${JSON.stringify(d)}`);
}
const dForzMasPrevia = decidirModo(entrada({ forzarCompleta: "manual", previa: null }));
check(dForzMasPrevia.modo === "completa" && dForzMasPrevia.motivo === "manual", "el evento forzado gana al motivo 'sin previa'", `forzar+sin previa: ${JSON.stringify(dForzMasPrevia)}`);

const d5 = decidirModo(entrada({ idsEvolucionesActuales: ["e1", "e3"], idsEvolucionesEnPrompt: ["e1", "e3"] }));
check(d5.modo === "completa" && d5.motivo === "edicion_evolucion", "una evolución cubierta ya no está → completa", `desaparece: ${JSON.stringify(d5)}`);

const d6 = decidirModo(entrada({ idsEvolucionesActuales: ["e1", "e2"], idsEvolucionesEnPrompt: ["e1", "e2"] }));
check(d6.modo === "sin_cambios", "nada nuevo → sin_cambios (no gasta tokens)", `sin cambios: ${JSON.stringify(d6)}`);

const d7 = decidirModo(
  entrada({
    idsEvolucionesActuales: ["e1", "e2", "e3", "e4"],
    idsEvolucionesEnPrompt: ["e1", "e2", "e3"], // e4 no cabe en el prompt
  })
);
check(d7.modo === "completa" && d7.motivo === "exceso_nuevas", "nuevas que no caben en el prompt → completa (no pierde evoluciones)", `exceso: ${JSON.stringify(d7)}`);

const d8 = decidirModo(
  entrada({
    idsEvolucionesActuales: ["e1", "e2"],
    idsEvolucionesEnPrompt: ["e1", "e2"],
    idsAdendasActuales: ["a1"],
    idsAdendasEnPrompt: ["a1"],
  })
);
check(
  d8.modo === "incremental" && d8.idsAdendasNuevas[0] === "a1" && d8.idsNuevos.length === 0,
  "adenda nueva sin evolución nueva → incremental con la adenda",
  `adenda nueva: ${JSON.stringify(d8)}`
);

const d9 = decidirModo(
  entrada({ previa: previa({ ids_adendas_cubiertas: ["a1"] }), idsAdendasActuales: [], idsAdendasEnPrompt: [] })
);
check(d9.modo === "completa" && d9.motivo === "edicion_evolucion", "adenda cubierta que desaparece → completa", `adenda desaparece: ${JSON.stringify(d9)}`);

// ── 2. contador ──────────────────────────────────────────────────────────────

console.log("\n[Test 2] siguienteContador");
check(siguienteContador({ modo: "completa", motivo: "alta" }, previa()) === 0, "completa reinicia el contador a 0", "completa no reinicia");
check(
  siguienteContador({ modo: "incremental", motivo: "incremental", idsNuevos: ["e3"], idsAdendasNuevas: [] }, previa({ incrementales_desde_completa: 2 })) === 3,
  "incremental suma 1",
  "incremental no suma"
);
// Secuencia completa: 5 incrementales y la 6ª pasa a completa.
{
  let p = null as VersionPrevia | null;
  let ids = ["e0"];
  const modos: string[] = [];
  for (let i = 1; i <= 8; i++) {
    ids = [...ids, `e${i}`];
    const dec = decidirModo({
      previa: p,
      forzarCompleta: null,
      hashBaseActual: "b",
      idsEvolucionesActuales: ids,
      idsEvolucionesEnPrompt: ids,
      idsAdendasActuales: [],
      idsAdendasEnPrompt: [],
    });
    modos.push(dec.modo === "completa" ? "C" : dec.modo === "incremental" ? "I" : "-");
    p = {
      version: (p?.version ?? 0) + 1,
      incrementales_desde_completa: siguienteContador(dec, p),
      hash_contexto_base: "b",
      ids_evoluciones_cubiertas: ids,
      ids_adendas_cubiertas: [],
    };
  }
  check(
    modos.join("") === "CIIIIICI",
    "secuencia de 8 firmas: C + 5 incrementales + C (regeneración) + I",
    `secuencia inesperada: ${modos.join("")}`
  );
}

// ── 3. gating ────────────────────────────────────────────────────────────────

console.log("\n[Test 3] debeGenerarPorEvento");
check(MIN_EVOLUCIONES_PRIMERA_GENERACION === 2, "primera generación exige ≥2 evoluciones firmadas", "MIN != 2");
check(!debeGenerarPorEvento({ tienePrevia: false, evolucionesFirmadas: 1, especialidadTieneResumenIA: true }), "sin previa y 1 evolución → no genera", "1 evolución genera");
check(debeGenerarPorEvento({ tienePrevia: false, evolucionesFirmadas: 2, especialidadTieneResumenIA: true }), "sin previa y 2 evoluciones → genera", "2 evoluciones no genera");
check(debeGenerarPorEvento({ tienePrevia: true, evolucionesFirmadas: 1, especialidadTieneResumenIA: true }), "con previa → genera", "con previa no genera");
check(!debeGenerarPorEvento({ tienePrevia: true, evolucionesFirmadas: 9, especialidadTieneResumenIA: false }), "especialidad sin Resumen IA → no genera", "especialidad sin IA genera");
check(debeGenerarPorEvento({ tienePrevia: true, evolucionesFirmadas: 9, especialidadTieneResumenIA: null }), "evento sin especialidad (alta/plan) no se filtra", "null filtrado");

// ── 4. desactualizado ────────────────────────────────────────────────────────

console.log("\n[Test 4] estaDesactualizado");
check(
  !estaDesactualizado({ idsCubiertas: ["e1"], idsAdendasCubiertas: [], idsEvolucionesActuales: ["e1"], idsAdendasActuales: [] }),
  "cobertura igual → al día",
  "al día marcado desactualizado"
);
check(
  estaDesactualizado({ idsCubiertas: ["e1"], idsAdendasCubiertas: [], idsEvolucionesActuales: ["e1", "e2"], idsAdendasActuales: [] }),
  "evolución firmada sin cubrir (falló la generación) → desactualizado",
  "evolución sin cubrir no se detecta"
);
check(
  estaDesactualizado({ idsCubiertas: ["e1"], idsAdendasCubiertas: [], idsEvolucionesActuales: ["e1"], idsAdendasActuales: ["a1"] }),
  "adenda sin cubrir → desactualizado",
  "adenda sin cubrir no se detecta"
);

// ── 5. hash base ─────────────────────────────────────────────────────────────

console.log("\n[Test 5] calcularHashBase");

function ctx(over: Partial<ContextoClinico> = {}): ContextoClinico {
  return {
    demografico: { edad: 34, sexo: "F", prevision: "Isapre", fecha_primera_atencion: "2026-01-10" },
    anamnesis: { motivo_consulta: "Dolor", antecedentes_medicos: null, alergias: null, farmacologia_cronica: null, habitos: null },
    signos_vitales: {
      ultimo_registro: "2026-07-20", fc_promedio: 72, pa_sistolica_promedio: 120, pa_diastolica_promedio: 80,
      spo2_minimo: 98, temp_ultimo: 36.5, total_registros: 3, alertas_vitales: [],
    },
    medicacion: { prescripciones_activas: [], prescripciones_historicas_count: 0 },
    alertas: { criticas: [], advertencias: [], informativas: [] },
    evolucion: {
      total_sesiones: 2, primera_sesion: "2026-01-10", ultima_sesion: "2026-07-20", dias_en_tratamiento: 191,
      frecuencia_semanal_estimada: 0.1, ids_firmados: ["e1"],
      ultimas_notas: [
        { id: "e1", fecha: "2026-07-20", tipo: "soap", profesional: "X", especialidad: "Kinesiología", resumen_truncado: "texto", tiene_diagnostico: true, tiene_plan: true },
      ],
    },
    examenes: { pendientes: [], completados_count: 0 },
    instrumentos: { aplicaciones: [] },
    adendas: { ids_firmadas: ["a1"], recientes: [{ id: "a1", fecha: "2026-07-21", tipo_documento: "soap", tipo_adenda: "errata", motivo: "m", contenido_truncado: "c" }] },
    secciones_vacias: [],
    tokens_estimados: 100,
    tiene_datos_suficientes: true,
    contexto_incompleto: false,
    secciones_con_error: [],
    ...over,
  };
}

const base0 = calcularHashBase(ctx());
check(base0 === calcularHashBase(ctx()), "determinista", "hash base no determinista");
check(
  base0 === calcularHashBase(ctx({ signos_vitales: { ...ctx().signos_vitales, fc_promedio: 90, total_registros: 9 } })),
  "cambiar agregados de signos vitales NO cambia el hash base (no fuerza completa en cada sesión)",
  "signos vitales alteran el hash base"
);
check(
  base0 !== calcularHashBase(ctx({ alertas: { criticas: ["Alergias registradas: Penicilina"], advertencias: [], informativas: [] } })),
  "una alerta nueva SÍ cambia el hash base",
  "alerta nueva no cambia el hash base"
);
check(
  base0 !== calcularHashBase(ctx({ medicacion: { prescripciones_activas: [{ principio_activo: "Losartán", nombre_comercial: null, dosis: "50mg", frecuencia: "1x", via: "oral", prescrito_por: "X" }], prescripciones_historicas_count: 0 } })),
  "medicación nueva SÍ cambia el hash base",
  "medicación nueva no cambia el hash base"
);
check(
  base0 === calcularHashBase(ctx({ evolucion: { ...ctx().evolucion, ids_firmados: ["e1", "e2"] } })),
  "evoluciones nuevas NO cambian el hash base (eso es lo que el incremental absorbe)",
  "evolución altera el hash base"
);

{
  const conAdv = (dias: number, pend: number) =>
    ctx({
      alertas: { criticas: [], advertencias: [`Sin registro de signos vitales en los últimos ${dias} días`, `Examen pendiente hace ${pend} días: Hemograma`], informativas: [] },
      examenes: { pendientes: [{ examenes_solicitados: "Hemograma", solicitado_por: "X", fecha_solicitud: "2026-05-01", dias_pendiente: pend }], completados_count: 0 },
    });
  check(
    calcularHashBase(conAdv(40, 40)) === calcularHashBase(conAdv(41, 41)),
    "contadores de días que crecen solos NO cambian el hash base (no fuerza una completa por día)",
    "los contadores de días alteran el hash base"
  );
}

// ── 6. prompt incremental ────────────────────────────────────────────────────

console.log("\n[Test 6] buildUserPromptIncremental");
{
  const c = ctx({
    evolucion: {
      ...ctx().evolucion,
      ultimas_notas: [
        { id: "e-viejo", fecha: "2026-06-01", tipo: "soap", profesional: "X", especialidad: "K", resumen_truncado: "NOTA_VIEJA", tiene_diagnostico: true, tiene_plan: true },
        { id: "e-nuevo", fecha: "2026-07-20", tipo: "soap", profesional: "X", especialidad: "K", resumen_truncado: "NOTA_NUEVA", tiene_diagnostico: true, tiene_plan: true },
      ],
    },
  });
  const prompt = buildUserPromptIncremental({
    contexto: c,
    previo: { alertas_prioritarias: [], resumen_narrativo: "RESUMEN_PREVIO", evolucion_clinica: "", estado_actual: "", informacion_faltante: [], generado_en: "2026-06-02T00:00:00Z" },
    idsNuevos: ["e-nuevo"],
    idsAdendasNuevas: ["a1"],
  });
  check(prompt.includes("NOTA_NUEVA"), "incluye la evolución nueva", "falta la evolución nueva");
  check(!prompt.includes("NOTA_VIEJA"), "NO reenvía evoluciones ya cubiertas (ahí está el ahorro)", "reenvía una evolución cubierta");
  check(prompt.includes("RESUMEN_PREVIO"), "incluye el resumen vigente", "falta el resumen vigente");
  check(prompt.includes('"tipo_adenda":"errata"'), "incluye la adenda nueva", "falta la adenda nueva");
  check(!prompt.includes("e-nuevo") && !prompt.includes('"a1"'), "no filtra UUID internos al modelo", "filtra IDs internos al prompt");
}

// ── Resultado ────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));
console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
if (errors.length > 0) {
  console.log("\nErrores:");
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
