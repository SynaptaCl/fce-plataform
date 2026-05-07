'use server';

import { buscarCIF } from '@/lib/icd/search';
import type { ICDSearchResult } from '@/lib/icd/types';
import type { ActionResult } from '@/app/actions/patients';

export async function searchCIF(
  query: string,
  dominioPrefix?: string,
): Promise<ActionResult<ICDSearchResult[]>> {
  if (query.trim().length < 2) {
    return { success: true, data: [] };
  }

  try {
    const q = dominioPrefix ? `${dominioPrefix} ${query}` : query;
    const results = await buscarCIF(q);
    return { success: true, data: results };
  } catch {
    return { success: true, data: [] };
  }
}
