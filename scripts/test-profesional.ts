#!/usr/bin/env tsx
/**
 * Unit tests para src/lib/fce/profesional.ts
 * Mockean el cliente Supabase — no requieren conexión a DB.
 *
 * Tests: 4 casos de la spec
 * 1. 0 profesionales → getProfesionalActivo retorna null
 * 2. 1 profesional → retorna ese profesional
 * 3. 2 profesionales → retorna el de created_at más antiguo (el primero en array)
 * 4. filtro por idClinica → solo retorna los de esa clínica
 */

import { getProfesionalesDelUsuario, getProfesionalActivo } from "../src/lib/fce/profesional";
import type { ProfesionalPerfil } from "../src/lib/fce/profesional";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Mock builder ──────────────────────────────────────────────────────────────

/**
 * Crea un mock inteligente de Supabase que:
 * 1. Intercepta .from('profesionales').select(...).eq(...).order(...)
 * 2. Acumula filtros en memoria
 * 3. Retorna filtered rows al hacer await
 *
 * El helper hace:
 * - supabase.from('profesionales').select(...).eq('auth_id', authId).eq('activo', true).order(...)
 * - Opcionalmente agrega .eq('id_clinica', idClinica)
 *
 * El mock aplica filtros SOLO para campos que existen en ProfesionalPerfil.
 * Campos que no existen (como auth_id) se ignoran en el filtrado.
 */
interface MockBuilder {
  select: () => MockBuilder;
  eq: (col: string, val: unknown) => MockBuilder;
  order: () => MockBuilder;
  then: <T>(
    resolve: (v: { data: ProfesionalPerfil[]; error: null }) => T,
    reject?: (err: unknown) => T
  ) => Promise<T>;
}

function createMockClient(allRows: ProfesionalPerfil[]): SupabaseClient {
  let filters: Record<string, unknown> = {};

  const builder: MockBuilder = {
    select: () => builder,

    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    },

    order: () => builder,

    then: <T>(
      resolve: (v: { data: ProfesionalPerfil[]; error: null }) => T,
      reject?: (err: unknown) => T
    ): Promise<T> => {
      try {
        const filtered = allRows.filter(row =>
          Object.entries(filters).every(([col, val]) => {
            const rowVal = (row as unknown as Record<string, unknown>)[col];
            return rowVal === undefined || rowVal === val;
          })
        );
        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
      } catch (err) {
        return Promise.reject(err).then(resolve, reject);
      }
    },
  };

  return {
    from: () => {
      filters = {};
      return builder;
    },
  } as unknown as SupabaseClient;
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ── Test data ─────────────────────────────────────────────────────────────────

const P1: ProfesionalPerfil = {
  id: "p1",
  nombre: "Ana",
  especialidad: "Kinesiología",
  id_clinica: "c1",
  duracion_consulta: 45,
  color_agenda: null,
  activo: true,
  es_agendable: true,
  rut: null,
  numero_registro: null,
  tipo_registro: null,
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const P2: ProfesionalPerfil = {
  id: "p2",
  nombre: "Luis",
  especialidad: "Fonoaudiología",
  id_clinica: "c1",
  duracion_consulta: 30,
  color_agenda: "#fff",
  activo: true,
  es_agendable: false,
  rut: null,
  numero_registro: null,
  tipo_registro: null,
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

const P3: ProfesionalPerfil = {
  id: "p3",
  nombre: "Carla",
  especialidad: "Masoterapia",
  id_clinica: "c2",
  duracion_consulta: 60,
  color_agenda: null,
  activo: true,
  es_agendable: true,
  rut: null,
  numero_registro: null,
  tipo_registro: null,
  puede_prescribir: false,
  puede_indicar_examenes: false,
};

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("\nTests: getProfesionalesDelUsuario + getProfesionalActivo\n");

  // Test 1: 0 profesionales -> getProfesionalActivo retorna null
  await test("0 profesionales → getProfesionalActivo retorna null", async () => {
    const mockClient = createMockClient([]);
    const result = await getProfesionalActivo(mockClient, "auth-123");
    assert(result === null, `Esperaba null, obtuve: ${JSON.stringify(result)}`);
  });

  // Test 2: 1 profesional -> retorna ese profesional
  await test("1 profesional → retorna ese profesional", async () => {
    const mockClient = createMockClient([P1]);
    const result = await getProfesionalActivo(mockClient, "auth-123");
    assert(result !== null, "Esperaba un profesional, obtuve null");
    if (result === null) throw new Error("Unexpected null");
    assert(result.id === "p1", `Esperaba p1, obtuve: ${result.id}`);
    assert(result.nombre === "Ana", `Esperaba nombre 'Ana', obtuve: ${result.nombre}`);
  });

  // Test 3: 2 profesionales -> retorna el de created_at más antiguo (primero en array)
  await test("2 profesionales → retorna el de created_at más antiguo (primero en array)", async () => {
    const mockClient = createMockClient([P1, P2]);
    const result = await getProfesionalActivo(mockClient, "auth-123");
    assert(result !== null, "Esperaba un profesional, obtuve null");
    if (result === null) throw new Error("Unexpected null");
    assert(result.id === "p1", `Esperaba p1 (más antiguo), obtuve: ${result.id}`);
  });

  // Test 4: filtro por idClinica -> solo retorna los de esa clínica
  await test("filtro por idClinica → solo retorna profesionales de esa clínica", async () => {
    const mockClient = createMockClient([P1, P2, P3]);

    // Llamar con idClinica = "c1" -> debe retornar solo P1 y P2
    const result = await getProfesionalesDelUsuario(
      mockClient,
      "auth-123",
      "c1"
    );

    assert(Array.isArray(result), `Esperaba array, obtuve: ${typeof result}`);
    assert(result.length === 2, `Esperaba 2 profesionales de c1, obtuve: ${result.length}`);

    const ids = result.map(p => p.id);
    assert(ids.includes("p1"), "p1 no encontrado en c1");
    assert(ids.includes("p2"), "p2 no encontrado en c1");
    assert(!ids.includes("p3"), "p3 no debería estar en c1 (pertenece a c2)");
  });

  // ── Resumen ───────────────────────────────────────────────────────────────────

  const totalTests = passed + failed;
  console.log(`\n${totalTests} tests — ${passed} passed, ${failed} failed`);

  const exitCode = failed > 0 ? 1 : 0;
  process.exit(exitCode);
})();
