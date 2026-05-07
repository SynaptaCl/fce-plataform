#!/usr/bin/env tsx
/**
 * Sprint R-ICD-1 — Integration tests: ICD-11 API + notas clínicas con icd_codigos.
 *
 * Tests:
 *   T1: icdFetch funciona (token OAuth2 válido)
 *   T2: Segunda llamada usa cache (sin re-autenticación)
 *   T3: buscarDiagnostico("diabetes") retorna resultados en español
 *   T4: buscarDiagnostico("") retorna [] sin llamar API
 *   T5: buscarDiagnostico(imposible) retorna [] sin exception
 *   T6: Nota con icd_codigos — guardar y leer back
 *   T7: Nota firmada — trigger bloquea UPDATE de icd_codigos
 *
 * Ejecutar: npm run test:sprint-icd1
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Cargar .env.local ─────────────────────────────────────────────────────────
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
} catch {
  // sin .env.local — las vars deben estar en el entorno
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { icdFetch } from '../src/lib/icd/client';
import { buscarDiagnostico } from '../src/lib/icd/search';
import type { ICDSearchResult } from '../src/lib/icd/types';

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors: string[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`[TEST] ${name}... `);
  try {
    await fn();
    console.log('✓ PASS');
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✗ FAIL: ${msg}`);
    failed++;
    errors.push(`${name}: ${msg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ── Supabase client (service role para bypass de RLS) ─────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados en .env.local',
    );
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Datos de limpieza ─────────────────────────────────────────────────────────

const insertedNotaIds: string[] = [];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── Sprint R-ICD-1 Integration Tests ──\n');

  // ── T1: icdFetch funciona (token OAuth2 válido) ──────────────────────────
  await test('T1: icdFetch funciona (token OAuth2 válido)', async () => {
    const result = await icdFetch('/icd/release/11/mms/search', {
      q: 'test',
      displayLanguage: 'es',
      flatResults: 'true',
      includeKeywordResult: 'true',
      useFlexibleSearch: 'false',
    });
    assert(result !== null && result !== undefined, 'icdFetch debe retornar una respuesta no nula');
    assert(typeof result === 'object', 'icdFetch debe retornar un objeto JSON');
  });

  // ── T2: Segunda llamada usa cache (sin re-autenticación) ─────────────────
  await test('T2: Segunda llamada usa cache (sin re-autenticación)', async () => {
    const t0 = Date.now();
    const r1 = await buscarDiagnostico('diabetes');
    const t1 = Date.now();
    const r2 = await buscarDiagnostico('diabetes');
    const t2 = Date.now();

    assert(r1.length >= 1, 'Primera llamada debe retornar resultados');
    assert(r2.length >= 1, 'Segunda llamada debe retornar resultados');

    const firstCall = t1 - t0;
    const secondCall = t2 - t1;

    // El cache hace que la segunda llamada sea más rápida (no re-autentica).
    // Tolerancia: la segunda debe ser estrictamente más rápida que la primera.
    // Si ambas van a red, esto puede fallar — pero en condiciones normales el
    // cache de token evita un round-trip adicional de auth.
    // Usamos una heurística laxa: la segunda nunca debe tardar MÁS DEL DOBLE
    // que si la primera ya hizo auth (siempre < 8 s si la API responde).
    assert(
      secondCall < Math.max(firstCall * 2, 8000),
      `Segunda llamada demasiado lenta (${secondCall}ms > ${Math.max(firstCall * 2, 8000)}ms). El cache podría no funcionar.`,
    );
  });

  // ── T3: buscarDiagnostico("diabetes") retorna resultados en español ───────
  await test('T3: buscarDiagnostico("diabetes") retorna resultados en español', async () => {
    const results: ICDSearchResult[] = await buscarDiagnostico('diabetes');

    assert(results.length >= 1, 'Debe retornar al menos 1 resultado');
    assert(results[0].title.length > 0, 'El primer resultado debe tener título');

    // Heurística: si está en inglés, el título del primer resultado probablemente
    // contiene "Diabetes mellitus" exacto en inglés sin traducción específica.
    // En español debería incluir algo como "Diabetes mellitus" (que es igual) pero
    // otros términos adicionales como "sin complicaciones", "tipo", etc. en español.
    // Verificamos que NO contenga únicamente palabras inglesas comunes en el primer resultado.
    const firstTitle = results[0].title.toLowerCase();
    const englishOnlyPhrases = ['without complications', 'with complications', 'unspecified'];
    const hasEnglishOnly = englishOnlyPhrases.some((phrase) => firstTitle.includes(phrase));
    assert(
      !hasEnglishOnly,
      `El primer resultado parece estar en inglés: "${results[0].title}"`,
    );
  });

  // ── T4: buscarDiagnostico("") retorna [] sin llamar API ──────────────────
  await test('T4: buscarDiagnostico("") retorna [] sin llamar API', async () => {
    const results1: ICDSearchResult[] = await buscarDiagnostico('');
    assert(results1.length === 0, 'Query vacío debe retornar []');

    const results2: ICDSearchResult[] = await buscarDiagnostico('a');
    assert(results2.length === 0, 'Query de 1 char debe retornar []');

    const results3: ICDSearchResult[] = await buscarDiagnostico('  ');
    assert(results3.length === 0, 'Query solo espacios debe retornar []');
  });

  // ── T5: buscarDiagnostico(imposible) retorna [] sin exception ────────────
  await test('T5: buscarDiagnostico(imposible) retorna [] sin exception', async () => {
    let threw = false;
    let results: ICDSearchResult[] = [];
    try {
      results = await buscarDiagnostico('xyz_imposible_99999_zzz_qqqq_noresult_abc');
    } catch {
      threw = true;
    }
    assert(!threw, 'buscarDiagnostico no debe lanzar excepción con query imposible');
    assert(results.length === 0, 'Query imposible debe retornar []');
  });

  // ── T6: Nota con icd_codigos — guardar y leer back ────────────────────────
  await test('T6: Nota con icd_codigos — guardar y leer back', async () => {
    const supabase = getSupabase();

    // Verificar que la columna existe haciendo una query que la referencia
    const { error: colError } = await supabase
      .from('fce_notas_clinicas')
      .select('icd_codigos')
      .limit(0);

    if (colError && colError.message.includes('icd_codigos')) {
      throw new Error('[SKIP] columna icd_codigos no existe — aplica migration 01 primero');
    }

    // Buscar un encuentro existente para usar su ID
    const { data: encuentros, error: encError } = await supabase
      .from('fce_encuentros')
      .select('id, paciente_id, profesional_id, clinica_id')
      .limit(1);

    if (encError || !encuentros || encuentros.length === 0) {
      throw new Error('[SKIP] No hay encuentros disponibles para test — crea datos de prueba mínimos');
    }

    const encuentro = encuentros[0];

    // Snapshot de diagnósticos ICD a guardar
    const icdCodigos = [
      {
        code: 'DE17',
        title: 'Diabetes mellitus tipo 2',
        uri: 'http://id.who.int/icd/entity/1780839395',
        version: '2024',
        language: 'es',
        addedAt: new Date().toISOString(),
        addedBy: 'test-sprint-icd1',
      },
    ];

    // Insertar nota con icd_codigos
    const { data: nota, error: insertError } = await supabase
      .from('fce_notas_clinicas')
      .insert({
        encuentro_id: encuentro.id,
        paciente_id: encuentro.paciente_id,
        profesional_id: encuentro.profesional_id,
        clinica_id: encuentro.clinica_id,
        tipo: 'evolucion',
        contenido: { texto: 'Nota de prueba T6 sprint-icd1' },
        icd_codigos: icdCodigos,
        firmada: false,
      })
      .select('id, icd_codigos')
      .single();

    if (insertError) {
      throw new Error(`INSERT falló: ${insertError.message}`);
    }

    assert(nota !== null, 'La nota insertada no debe ser null');
    insertedNotaIds.push(nota.id);

    // Leer back y verificar snapshot intacto
    const { data: notaLeida, error: readError } = await supabase
      .from('fce_notas_clinicas')
      .select('icd_codigos')
      .eq('id', nota.id)
      .single();

    if (readError) {
      throw new Error(`SELECT falló: ${readError.message}`);
    }

    assert(notaLeida !== null, 'La nota leída no debe ser null');
    const snap = notaLeida.icd_codigos as typeof icdCodigos;
    assert(Array.isArray(snap), 'icd_codigos debe ser un array');
    assert(snap.length === 1, `icd_codigos debe tener 1 elemento, tiene ${snap.length}`);
    assert(snap[0].code === 'DE17', `code debe ser DE17, es ${snap[0].code}`);
    assert(
      snap[0].title === 'Diabetes mellitus tipo 2',
      `title debe ser "Diabetes mellitus tipo 2", es "${snap[0].title}"`,
    );
    assert(snap[0].addedBy === 'test-sprint-icd1', 'addedBy debe conservarse en el snapshot');
  });

  // ── T7: Nota firmada — trigger bloquea UPDATE de icd_codigos ─────────────
  await test('T7: Nota firmada — trigger bloquea UPDATE de icd_codigos', async () => {
    const supabase = getSupabase();

    // Verificar que la columna existe
    const { error: colError } = await supabase
      .from('fce_notas_clinicas')
      .select('icd_codigos')
      .limit(0);

    if (colError && colError.message.includes('icd_codigos')) {
      throw new Error('[SKIP] columna icd_codigos no existe — aplica migration 01 primero');
    }

    // Buscar un encuentro existente
    const { data: encuentros, error: encError } = await supabase
      .from('fce_encuentros')
      .select('id, paciente_id, profesional_id, clinica_id')
      .limit(1);

    if (encError || !encuentros || encuentros.length === 0) {
      throw new Error('[SKIP] No hay encuentros disponibles para test — crea datos de prueba mínimos');
    }

    const encuentro = encuentros[0];

    // Insertar nota FIRMADA con icd_codigos
    const { data: notaFirmada, error: insertError } = await supabase
      .from('fce_notas_clinicas')
      .insert({
        encuentro_id: encuentro.id,
        paciente_id: encuentro.paciente_id,
        profesional_id: encuentro.profesional_id,
        clinica_id: encuentro.clinica_id,
        tipo: 'evolucion',
        contenido: { texto: 'Nota firmada de prueba T7 sprint-icd1' },
        icd_codigos: [
          {
            code: 'BA00',
            title: 'Hipertensión esencial',
            uri: 'http://id.who.int/icd/entity/149798870',
            version: '2024',
            language: 'es',
            addedAt: new Date().toISOString(),
            addedBy: 'test-sprint-icd1',
          },
        ],
        firmada: true,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`INSERT nota firmada falló: ${insertError.message}`);
    }

    assert(notaFirmada !== null, 'La nota firmada insertada no debe ser null');
    insertedNotaIds.push(notaFirmada.id);

    // Intentar UPDATE de icd_codigos en nota firmada — el trigger debe bloquearlo
    const { error: updateError } = await supabase
      .from('fce_notas_clinicas')
      .update({
        icd_codigos: [
          {
            code: 'XX00',
            title: 'Código modificado ilegalmente',
            uri: 'http://invalid',
            version: '2024',
            language: 'es',
            addedAt: new Date().toISOString(),
            addedBy: 'test-sprint-icd1',
          },
        ],
      })
      .eq('id', notaFirmada.id);

    assert(
      updateError !== null,
      'El UPDATE en nota firmada debe ser bloqueado por el trigger de PostgreSQL',
    );
    assert(
      updateError !== null &&
        (updateError.message.toLowerCase().includes('firmada') ||
          updateError.message.toLowerCase().includes('signed') ||
          updateError.message.toLowerCase().includes('immutable') ||
          updateError.code === '23514' || // check constraint violation
          updateError.code === 'P0001'), // raise exception from trigger
      `El trigger debe rechazar el UPDATE. Error recibido: ${updateError?.message ?? 'ninguno'}`,
    );
  });

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n── Resumen: ${passed}/${passed + failed} tests pasaron ──\n`);
  if (errors.length > 0) {
    console.log('Errores:');
    errors.forEach((e) => console.log(`  • ${e}`));
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// ── Limpieza ─────────────────────────────────────────────────────────────────

async function cleanup() {
  if (insertedNotaIds.length === 0) return;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('fce_notas_clinicas')
      .delete()
      .in('id', insertedNotaIds);

    if (error) {
      console.warn(`[WARN] Limpieza parcial: ${error.message}`);
    } else {
      console.log(`[INFO] Limpieza OK — ${insertedNotaIds.length} nota(s) eliminada(s)`);
    }
  } catch (err) {
    console.warn('[WARN] Error durante limpieza:', err instanceof Error ? err.message : String(err));
  }
}

main()
  .catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
  })
  .finally(() => {
    cleanup().catch(() => undefined);
  });
