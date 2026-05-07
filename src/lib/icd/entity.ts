import { icdFetch } from './client';
import { buscarDiagnostico } from './search';
import type { ICDEntity } from './types';

/** Tipo interno que refleja la estructura real de la respuesta de entidad ICD-11 */
interface RawEntityResponse {
  '@id'?: string;
  title?: { '@value'?: string };
  theCode?: string;
  definition?: { '@value'?: string };
  inclusion?: Array<{ label?: { '@value'?: string } }>;
  exclusion?: Array<{ label?: { '@value'?: string } }>;
  parent?: string | string[];
}

function isRawEntityResponse(value: unknown): value is RawEntityResponse {
  return typeof value === 'object' && value !== null;
}

function extractStrings(
  items: Array<{ label?: { '@value'?: string } }> | undefined,
): string[] {
  if (!items) return [];
  return items
    .map((item) => item.label?.['@value'])
    .filter((s): s is string => typeof s === 'string');
}

/**
 * Obtiene el detalle completo de una entidad ICD-11 MMS por su ID numérico.
 */
export async function obtenerEntidad(entityId: string): Promise<ICDEntity> {
  const data = await icdFetch(
    `/icd/release/11/2025-01/mms/${entityId}`,
  );

  if (!isRawEntityResponse(data)) {
    throw new Error(`[ICD] Respuesta inesperada para entidad ${entityId}`);
  }

  const uri = data['@id'] ?? '';
  const title = data.title?.['@value'] ?? '';
  const code = data.theCode;
  const description = data.definition?.['@value'];
  const inclusions = extractStrings(data.inclusion);
  const exclusions = extractStrings(data.exclusion);

  let parent: string | undefined;
  if (Array.isArray(data.parent)) {
    parent = data.parent[0];
  } else if (typeof data.parent === 'string') {
    parent = data.parent;
  }

  return {
    id: entityId,
    uri,
    title,
    ...(code !== undefined ? { code } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(inclusions.length > 0 ? { inclusions } : {}),
    ...(exclusions.length > 0 ? { exclusions } : {}),
    ...(parent !== undefined ? { parent } : {}),
  };
}

/**
 * Verifica si un código ICD-11 existe buscándolo y comprobando coincidencia exacta.
 */
export async function validarCodigo(code: string): Promise<boolean> {
  const results = await buscarDiagnostico(code);
  return results.some((r) => r.code === code);
}
