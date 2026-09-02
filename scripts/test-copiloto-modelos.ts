/**
 * test-copiloto-modelos.ts
 * Fix de asignación de modelos IA (COMERCIAL.md §10, 2026-09-01):
 * Resumen IA → Sonnet (riesgo clínico sin revisión humana) · Copiloto SOAP → Haiku
 * con upgrade condicional a Sonnet.
 *
 * Modo default (sin API, sin costo): ejercita llamarCopiloto con stubs del client
 * Anthropic — valida orden de modelos, motivos de upgrade y log 'copilote_upgrade_sonnet'.
 *
 * Modo --live (API real, datos 100% SINTÉTICOS — nunca datos reales de paciente):
 *  L1. Copiloto happy path con Haiku real (prompt real de copiloto-nota).
 *  L2. Upgrade forzado E2E: respuesta REAL de Haiku corrompida determinísticamente
 *      (JSON truncado) → la segunda llamada REAL a Sonnet debe completar el fallback.
 *  L3. Resumen IA: Sonnet real con SYSTEM_PROMPT real + payload sintético → JSON parseable.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  llamarCopiloto,
  MODEL_COPILOTO_DEFAULT,
  MODEL_COPILOTO_UPGRADE,
} from "../src/lib/ia/copiloto-nota/llamar-modelo";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../src/lib/ia/copiloto-nota/prompt";
import { SYSTEM_PROMPT as RESUMEN_SYSTEM_PROMPT } from "../src/lib/ia/prompt";

// ── Test runner (mismo patrón que test-resumen-ia-parcial.ts) ──────────────────

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

// ── Datos sintéticos (nunca datos reales de paciente) ─────────────────────────

const ID_CLINICA_SINTETICA = "00000000-0000-4000-8000-000000000001";
const ID_ENCUENTRO_SINTETICO = "00000000-0000-4000-8000-000000000002";

const BULLETS_SINTETICOS = [
  "Paciente refiere dolor lumbar al levantarse, 4/10",
  "ROM lumbar flexión 60%, extensión limitada por dolor",
  "Prueba de Schober 4 cm",
  "Se aplican movilizaciones lumbares MIII",
  "Ejercicios de estabilización domiciliarios, 2 series x 10",
].join("\n");

// ── Stub del client Anthropic ──────────────────────────────────────────────────

interface StubParams {
  model: string;
  system: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
}

function textResponse(text: string): unknown {
  return {
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

function emptyContentResponse(): unknown {
  return {
    content: [],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 0 },
  };
}

function stubClient(
  haiku: (params: StubParams) => Promise<unknown>,
  sonnet: (params: StubParams) => Promise<unknown>
): { client: Anthropic; modelosLlamados: string[] } {
  const modelosLlamados: string[] = [];
  const client = {
    messages: {
      create: async (params: StubParams) => {
        modelosLlamados.push(params.model);
        return params.model === MODEL_COPILOTO_UPGRADE
          ? sonnet(params)
          : haiku(params);
      },
    },
  } as unknown as Anthropic;
  return { client, modelosLlamados };
}

// ── Captura del log 'copilote_upgrade_sonnet' (console.info vía lib/logger) ────

interface UpgradeLogEntry {
  action?: string;
  route?: string;
  id_clinica?: string;
  reason?: string;
}

async function conCapturaDeUpgrades<T>(
  fn: () => Promise<T>
): Promise<{ resultado: T; upgrades: UpgradeLogEntry[] }> {
  const upgrades: UpgradeLogEntry[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    for (const arg of args) {
      if (typeof arg === "string" && arg.includes("copilote_upgrade_sonnet")) {
        try {
          const jsonStart = arg.indexOf("{");
          upgrades.push(JSON.parse(arg.slice(jsonStart)) as UpgradeLogEntry);
        } catch {
          /* línea de log no-JSON — ignorar */
        }
      }
    }
  };
  try {
    const resultado = await fn();
    return { resultado, upgrades };
  } finally {
    console.info = original;
  }
}

// ── Params comunes para llamarCopiloto ─────────────────────────────────────────

const PARAMS = {
  system: buildSystemPrompt("Kinesiología", "O"),
  userPrompt: buildUserPrompt(BULLETS_SINTETICOS),
  idClinica: ID_CLINICA_SINTETICA,
  idEncuentro: ID_ENCUENTRO_SINTETICO,
};

const NOTA_VALIDA = JSON.stringify({
  contenido:
    "Paciente refiere dolor lumbar mecánico de intensidad 4/10 al levantarse. Se observa ROM lumbar con flexión del 60% y extensión limitada por dolor. Prueba de Schober de 4 cm. Se realizan movilizaciones lumbares MIII y se indican ejercicios de estabilización domiciliarios en 2 series de 10 repeticiones.",
});

// ── Parte 1: fallback con stubs (sin API) ─────────────────────────────────────

async function parteStubs() {
  console.log("\n── Parte 1: llamarCopiloto con stubs (sin API) ──");

  // 1.1 Happy path: Haiku responde JSON válido → sin upgrade, una sola llamada
  {
    const { client, modelosLlamados } = stubClient(
      async () => textResponse(NOTA_VALIDA),
      async () => {
        fail("1.1 Sonnet no debía ser llamado");
        return textResponse(NOTA_VALIDA);
      }
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true,
      "1.1 Haiku válido → ok:true",
      "1.1 Haiku válido debía retornar ok:true"
    );
    check(
      modelosLlamados.length === 1 && modelosLlamados[0] === MODEL_COPILOTO_DEFAULT,
      "1.1 una sola llamada, modelo default (Haiku)",
      `1.1 llamadas inesperadas: ${modelosLlamados.join(", ")}`
    );
    check(
      upgrades.length === 0,
      "1.1 sin log de upgrade",
      "1.1 se logueó un upgrade sin corresponder"
    );
  }

  // 1.2 Haiku no parsea → upgrade a Sonnet con reason 'parse_failed'
  {
    const { client, modelosLlamados } = stubClient(
      async () => textResponse("Lo siento, no puedo responder en JSON."),
      async () => textResponse(NOTA_VALIDA)
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true,
      "1.2 output inválido de Haiku → Sonnet completa el fallback",
      "1.2 el fallback a Sonnet no completó"
    );
    check(
      modelosLlamados.length === 2 &&
        modelosLlamados[0] === MODEL_COPILOTO_DEFAULT &&
        modelosLlamados[1] === MODEL_COPILOTO_UPGRADE,
      "1.2 orden de modelos: Haiku → Sonnet",
      `1.2 orden inesperado: ${modelosLlamados.join(", ")}`
    );
    check(
      upgrades.length === 1 &&
        upgrades[0].action === "copilote_upgrade_sonnet" &&
        upgrades[0].reason === "parse_failed" &&
        upgrades[0].route === "copiloto-nota" &&
        upgrades[0].id_clinica === ID_CLINICA_SINTETICA,
      "1.2 log copilote_upgrade_sonnet con reason/route/id_clinica correctos",
      `1.2 log de upgrade incorrecto: ${JSON.stringify(upgrades[0])}`
    );
  }

  // 1.3 Haiku lanza error/timeout → upgrade con reason 'api_error'
  {
    const { client, modelosLlamados } = stubClient(
      async () => {
        throw new Error("Request timed out");
      },
      async () => textResponse(NOTA_VALIDA)
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true,
      "1.3 error de Haiku → Sonnet completa el fallback",
      "1.3 el fallback post-error no completó"
    );
    check(
      modelosLlamados.length === 2,
      "1.3 exactamente 2 llamadas",
      `1.3 llamadas inesperadas: ${modelosLlamados.length}`
    );
    check(
      upgrades.length === 1 && upgrades[0].reason === "api_error",
      "1.3 reason 'api_error'",
      `1.3 reason incorrecto: ${upgrades[0]?.reason}`
    );
  }

  // 1.4 Haiku devuelve contenido vacío → upgrade con reason 'contenido_vacio'
  {
    const { client } = stubClient(
      async () => textResponse(JSON.stringify({ contenido: "   " })),
      async () => textResponse(NOTA_VALIDA)
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true,
      "1.4 contenido vacío de Haiku → Sonnet completa el fallback",
      "1.4 el fallback por contenido vacío no completó"
    );
    check(
      upgrades.length === 1 && upgrades[0].reason === "contenido_vacio",
      "1.4 reason 'contenido_vacio'",
      `1.4 reason incorrecto: ${upgrades[0]?.reason}`
    );
  }

  // 1.5 Haiku sin text block → upgrade con reason 'respuesta_vacia'
  {
    const { client } = stubClient(
      async () => emptyContentResponse(),
      async () => textResponse(NOTA_VALIDA)
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true,
      "1.5 respuesta sin texto de Haiku → Sonnet completa el fallback",
      "1.5 el fallback por respuesta vacía no completó"
    );
    check(
      upgrades.length === 1 && upgrades[0].reason === "respuesta_vacia",
      "1.5 reason 'respuesta_vacia'",
      `1.5 reason incorrecto: ${upgrades[0]?.reason}`
    );
  }

  // 1.6 Ambos fallan → ok:false con motivo del segundo intento
  {
    const { client } = stubClient(
      async () => {
        throw new Error("Request timed out");
      },
      async () => textResponse("tampoco soy JSON")
    );
    const { resultado } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      !resultado.ok && resultado.motivo === "parse_failed",
      "1.6 doble fallo → ok:false con motivo del segundo intento",
      "1.6 el resultado del doble fallo no es el esperado"
    );
  }

  // 1.7 Haiku responde JSON válido envuelto en code fences → parser lo limpia, sin upgrade
  {
    const conFences = "```json\n" + NOTA_VALIDA + "\n```";
    const { client, modelosLlamados } = stubClient(
      async () => textResponse(conFences),
      async () => textResponse(NOTA_VALIDA)
    );
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(client, PARAMS)
    );
    check(
      resultado.ok === true && modelosLlamados.length === 1 && upgrades.length === 0,
      "1.7 JSON con fences → parsea sin upgrade (regresión del parser)",
      "1.7 el parser no limpió los fences y disparó upgrade innecesario"
    );
  }
}

// ── Parte 2 (--live): API real, datos sintéticos ──────────────────────────────

const PAYLOAD_RESUMEN_SINTETICO = {
  demografico: {
    edad: 34,
    sexo: "femenino",
    prevision: "Fonasa",
    fecha_primera_atencion: "2026-08-01",
  },
  anamnesis: {
    motivo_consulta: "Dolor lumbar mecánico",
    antecedentes_medicos: "Sin antecedentes mórbidos",
    alergias: null,
    farmacologia_cronica: null,
    habitos: null,
  },
  signos_vitales: {
    ultimo_registro: null,
    fc_promedio: 72,
    pa_sistolica_promedio: 118,
    pa_diastolica_promedio: 76,
    spo2_minimo: 97,
    temp_ultimo: 36.5,
    total_registros: 3,
    alertas_vitales: [],
  },
  medicacion: [],
  alertas: [],
  evolucion: {
    total_sesiones: 4,
    primera_sesion: "2026-08-03",
    ultima_sesion: "2026-08-29",
    dias_en_tratamiento: 26,
    frecuencia_semanal_estimada: 1,
    ultimas_notas: [
      "Sesión 4: movilización lumbar, tolera bien, dolor 3/10 al egreso.",
    ],
  },
  examenes: [],
  instrumentos: [],
  secciones_vacias: [],
};

function extraerTexto(response: unknown): string {
  const content = (response as { content: Array<{ type: string; text?: string }> }).content;
  const textBlock = content.find((b) => b.type === "text" && typeof b.text === "string");
  return (textBlock?.text ?? "").trim();
}

async function parteLive() {
  console.log("\n── Parte 2 (--live): API real, datos 100% sintéticos ──");

  let apiKey = process.env.ANTHROPIC_API_KEY;
  // dotenv/Next eliminan las comillas envolventes en .env*; al correr con tsx desde
  // el shell crudo hay que replicarlo o el SDK manda las comillas como parte de la key.
  if (apiKey && /^".*"$/.test(apiKey)) apiKey = apiKey.slice(1, -1);
  if (!apiKey) {
    fail("L0 ANTHROPIC_API_KEY no está en el entorno — cargar .env.local antes de --live");
    return;
  }
  pass("L0 ANTHROPIC_API_KEY presente (mismo key para Haiku y Sonnet — el modelo es un parámetro)");

  const anthropic = new Anthropic({ apiKey });
  const systemCopiloto = buildSystemPrompt("Kinesiología", "O");
  const userCopiloto = buildUserPrompt(BULLETS_SINTETICOS);

  // L1: happy path Haiku real (copiloto)
  {
    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(anthropic, {
        system: systemCopiloto,
        userPrompt: userCopiloto,
        idClinica: ID_CLINICA_SINTETICA,
        idEncuentro: ID_ENCUENTRO_SINTETICO,
      })
    );
    check(
      resultado.ok === true,
      "L1 copiloto resultado estructuralmente válido (vía Haiku directo o upgrade legítimo a Sonnet)",
      "L1 ni Haiku ni el fallback produjeron output válido"
    );
    if (upgrades.length > 0) {
      console.log(
        `  ℹ L1 Haiku falló validación estructural en vivo y Sonnet completó (reason=${upgrades[0].reason}) — fallback funcionando, medir tasa real vía logs`
      );
    }
  }

  // L2: upgrade forzado — respuesta real de Haiku truncada → Sonnet real completa
  {
    let llamadas = 0;
    const modelos: string[] = [];
    const corruptor = {
      messages: {
        create: async (params: Anthropic.MessageCreateParamsNonStreaming) => {
          llamadas++;
          modelos.push(params.model);
          const real = await anthropic.messages.create(params);
          if (llamadas === 1) {
            // Truncar a mitad de texto: JSON.parse falla determinísticamente
            const text = extraerTexto(real);
            return textResponse(text.slice(0, Math.floor(text.length / 2)));
          }
          return real;
        },
      },
    } as unknown as Anthropic;

    const { resultado, upgrades } = await conCapturaDeUpgrades(() =>
      llamarCopiloto(corruptor, {
        system: systemCopiloto,
        userPrompt: userCopiloto,
        idClinica: ID_CLINICA_SINTETICA,
        idEncuentro: ID_ENCUENTRO_SINTETICO,
      })
    );
    check(
      resultado.ok === true,
      "L2 output inválido de Haiku (real, truncado) → upgrade a Sonnet real completa la nota",
      "L2 el upgrade E2E no completó"
    );
    check(
      modelos.length === 2 &&
        modelos[0] === MODEL_COPILOTO_DEFAULT &&
        modelos[1] === MODEL_COPILOTO_UPGRADE,
      "L2 ambas llamadas reales: primero Haiku, luego Sonnet",
      `L2 modelos llamados: ${modelos.join(", ")}`
    );
    check(
      upgrades.length === 1 && upgrades[0].reason === "parse_failed",
      "L2 log copilote_upgrade_sonnet con reason 'parse_failed'",
      `L2 log de upgrade incorrecto: ${JSON.stringify(upgrades[0])}`
    );
  }

  // L3: resumen IA con Sonnet real (SYSTEM_PROMPT real + payload sintético)
  {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: RESUMEN_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: JSON.stringify(PAYLOAD_RESUMEN_SINTETICO) },
      ],
    });
    let raw = extraerTexto(response);
    if (raw.startsWith("```")) {
      raw = raw
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?\s*```$/, "")
        .trim();
    }
    let parsedResumen: Record<string, unknown>;
    try {
      parsedResumen = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsedResumen = {};
    }
    check(
      typeof parsedResumen.resumen_narrativo === "string" &&
        (parsedResumen.resumen_narrativo as string).length > 0 &&
        Array.isArray(parsedResumen.alertas_prioritarias),
      "L3 resumen con Sonnet real: JSON parseable con resumen_narrativo y alertas_prioritarias",
      "L3 Sonnet real no produjo el formato esperado del resumen"
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log("test-copiloto-modelos — fix asignación modelos IA (COMERCIAL.md §10)");
  await parteStubs();
  if (process.argv.includes("--live")) {
    await parteLive();
  } else {
    console.log(
      "\n(sin --live: solo stubs. correr con --live para las pruebas de API real con datos sintéticos)"
    );
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Resultado: ${passCount} checks pasaron, ${errors.length} fallaron`);
  if (errors.length > 0) {
    console.error("\nErrores:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log("Todos los checks pasaron.");
  }
})();
