import { icdFetch } from './client';
import type { ICDSearchResult } from './types';

const MAX_RESULTS = 10;

/**
 * Extrae el último segmento numérico de una URL de entidad ICD-11.
 * Ej: "http://id.who.int/icd/release/11/2025-01/mms/1697306310" → "1697306310"
 */
function extractEntityId(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] ?? url;
}

/**
 * Elimina tags HTML como <em class='found'>...</em> que la API inyecta
 * en los títulos para resaltar los términos de búsqueda.
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Estructura REAL de la respuesta de búsqueda ICD-11 API v2.
 * Confirmada via PowerShell contra https://id.who.int/icd/release/11/2025-01/mms/search
 *
 * La respuesta es un objeto con:
 * - destinationEntities: array de entidades encontradas
 * - error: boolean
 * - errorMessage: string
 * - resultChopped: boolean
 * - wordSuggestionsChopped: boolean
 * - guessType: number
 * - uniqueSearchId: string
 *
 * Cada entidad en destinationEntities tiene:
 * - id: URL completa (ej: "http://id.who.int/icd/release/11/2025-01/mms/1697306310")
 * - title: string con HTML tags de highlight (ej: "<em class='found'>Diabetes</em> mellitus")
 * - stemId: URL del stem (igual a id en la mayoría de casos)
 * - theCode: código ICD-11 (ej: "5A14") — NO siempre presente
 * - score: número de relevancia
 * - isLeaf: boolean
 * - postcoordinationAvailability: number (0=notAllowed, 1=allowed, 2=required)
 * - hasCodingNote: boolean
 * - matchingPVs: array de sinónimos/propiedades que coincidieron
 */
interface RawDestinationEntity {
  id?: string;
  title?: string;
  stemId?: string;
  theCode?: string;
  score?: number;
  isLeaf?: boolean;
  postcoordinationAvailability?: number;
  matchingPVs?: Array<{
    propertyId?: string;
    label?: string;
    score?: number;
    important?: boolean;
  }>;
}

interface RawSearchResponse {
  destinationEntities?: RawDestinationEntity[];
  error?: boolean;
  errorMessage?: string;
  resultChopped?: boolean;
  wordSuggestionsChopped?: boolean;
  guessType?: number;
  uniqueSearchId?: string;
}

function mapDestinationEntity(entity: RawDestinationEntity): ICDSearchResult {
  const rawId = entity.id ?? '';
  const id = extractEntityId(rawId);
  const title = stripHtml(entity.title ?? '');
  const code = entity.theCode;
  const score = entity.score;

  // Extraer sinónimos desde matchingPVs (solo los que tienen label legible)
  const synonyms = (entity.matchingPVs ?? [])
    .map((pv) => pv.label ? stripHtml(pv.label) : undefined)
    .filter((s): s is string => typeof s === 'string' && s.length > 0);

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
 * Retorna hasta 10 resultados en español. Retorna [] si query es muy corto.
 *
 * Endpoint: GET /icd/release/11/2025-01/mms/search
 * La versión (2025-01) es obligatoria en el path — sin ella la API retorna 404.
 */
export async function buscarDiagnostico(
  query: string,
  lang = 'es',
): Promise<ICDSearchResult[]> {
  if (query.trim() === '' || query.length < 2) {
    return [];
  }

  const data = await icdFetch('/icd/release/11/2025-01/mms/search', {
    q: query,
    displayLanguage: lang,
    flatResults: 'true',
    includeKeywordResult: 'true',
    useFlexibleSearch: 'false',
  });

  // Validación defensiva de la respuesta
  if (data === null || typeof data !== 'object') {
    console.error('[ICD] Respuesta inesperada: no es un objeto');
    return [];
  }

  // La respuesta puede venir serializada como string (algunos proxies lo hacen)
  let parsed: RawSearchResponse;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      console.error('[ICD] No se pudo parsear respuesta como JSON');
      return [];
    }
  } else {
    parsed = data as RawSearchResponse;
  }

  // Verificar si la API reportó error
  if (parsed.error) {
    console.error('[ICD] Error de API:', parsed.errorMessage);
    return [];
  }

  // Extraer entidades — puede ser un array directo o estar en destinationEntities
  let entities: RawDestinationEntity[];

  if (Array.isArray(parsed.destinationEntities)) {
    entities = parsed.destinationEntities;
  } else if (Array.isArray(parsed)) {
    // Fallback: la respuesta ES el array directamente
    entities = parsed as unknown as RawDestinationEntity[];
  } else if (parsed.destinationEntities && typeof parsed.destinationEntities === 'object') {
    // Fallback: destinationEntities es un objeto con keys numéricas
    entities = Object.values(parsed.destinationEntities);
  } else {
    // Último fallback: la respuesta es un objeto con keys numéricas (sin wrapper)
    const values = Object.values(parsed).filter(
      (v): v is RawDestinationEntity =>
        typeof v === 'object' && v !== null && ('id' in v || 'title' in v)
    );
    if (values.length > 0) {
      entities = values;
    } else {
      console.error('[ICD] No se encontraron entidades en la respuesta');
      return [];
    }
  }

  if (entities.length === 0) {
    return [];
  }

  return entities.slice(0, MAX_RESULTS).map(mapDestinationEntity);
}

/**
 * Busca entidades en ICF (Clasificación Internacional del Funcionamiento).
 * Misma estructura de respuesta que MMS.
 *
 * Endpoint: GET /icd/release/11/2025-01/icf/search
 */
export async function buscarCIF(
  query: string,
  lang = 'es',
): Promise<ICDSearchResult[]> {
  if (query.trim() === '' || query.length < 2) {
    return [];
  }

  const data = await icdFetch('/icd/release/11/2025-01/icf/search', {
    q: query,
    displayLanguage: lang,
    flatResults: 'true',
    includeKeywordResult: 'true',
    useFlexibleSearch: 'false',
  });

  if (data === null || typeof data !== 'object') {
    return [];
  }

  let parsed: RawSearchResponse;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return [];
    }
  } else {
    parsed = data as RawSearchResponse;
  }

  if (parsed.error) {
    console.error('[ICD] Error de API ICF:', parsed.errorMessage);
    return [];
  }

  let entities: RawDestinationEntity[];

  if (Array.isArray(parsed.destinationEntities)) {
    entities = parsed.destinationEntities;
  } else if (Array.isArray(parsed)) {
    entities = parsed as unknown as RawDestinationEntity[];
  } else if (parsed.destinationEntities && typeof parsed.destinationEntities === 'object') {
    entities = Object.values(parsed.destinationEntities);
  } else {
    const values = Object.values(parsed).filter(
      (v): v is RawDestinationEntity =>
        typeof v === 'object' && v !== null && ('id' in v || 'title' in v)
    );
    entities = values.length > 0 ? values : [];
  }

  return entities.slice(0, MAX_RESULTS).map(mapDestinationEntity);
}