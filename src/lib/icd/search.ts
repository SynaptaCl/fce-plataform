import { icdFetch } from './client';
import type { ICDSearchResult } from './types';

const MAX_RESULTS = 10;

/** Extrae el último segmento de una URL de entidad ICD-11 */
function extractEntityId(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] ?? url;
}

/** Tipo interno que refleja la estructura real de cada entidad en destinationEntities */
interface RawDestinationEntity {
  id?: string;
  title?: { '@value'?: string };
  theCode?: string;
  score?: number;
  synonyms?: Array<{ label?: { '@value'?: string } }>;
}

/** Tipo interno que refleja la estructura real de la respuesta de búsqueda ICD-11 */
interface RawSearchResponse {
  destinationEntities?: RawDestinationEntity[];
}

function isRawSearchResponse(value: unknown): value is RawSearchResponse {
  return typeof value === 'object' && value !== null;
}

function mapDestinationEntity(entity: RawDestinationEntity): ICDSearchResult {
  const rawId = entity.id ?? '';
  const id = extractEntityId(rawId);
  const title = entity.title?.['@value'] ?? '';
  const code = entity.theCode;
  const score = entity.score;
  const synonyms = (entity.synonyms ?? [])
    .map((s) => s.label?.['@value'])
    .filter((s): s is string => typeof s === 'string');

  return {
    id,
    title,
    ...(code !== undefined ? { code } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(synonyms.length > 0 ? { synonyms } : {}),
  };
}

/**
 * Busca diagnósticos en ICD-11 MMS (CIE-11).
 * Retorna hasta 10 resultados. Retorna [] si query es muy corto.
 */
export async function buscarDiagnostico(
  query: string,
  lang = 'es',
): Promise<ICDSearchResult[]> {
  if (query.trim() === '' || query.length < 2) {
    return [];
  }

  const data = await icdFetch('/icd/release/11/mms/search', {
    q: query,
    displayLanguage: lang,
    flatResults: 'true',
    includeKeywordResult: 'true',
    useFlexibleSearch: 'false',
  });

  if (!isRawSearchResponse(data)) {
    return [];
  }

  const entities = data.destinationEntities ?? [];
  return entities.slice(0, MAX_RESULTS).map(mapDestinationEntity);
}

/**
 * Busca entidades en ICF (Clasificación Internacional del Funcionamiento).
 * Reservada para R-ICD-2. No integrada aún.
 */
export async function buscarCIF(
  query: string,
  lang = 'es',
): Promise<ICDSearchResult[]> {
  if (query.trim() === '' || query.length < 2) {
    return [];
  }

  const data = await icdFetch('/icd/release/11/icf/search', {
    q: query,
    displayLanguage: lang,
    flatResults: 'true',
    includeKeywordResult: 'true',
    useFlexibleSearch: 'false',
  });

  if (!isRawSearchResponse(data)) {
    return [];
  }

  const entities = data.destinationEntities ?? [];
  return entities.slice(0, MAX_RESULTS).map(mapDestinationEntity);
}
