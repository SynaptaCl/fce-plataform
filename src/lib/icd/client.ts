// Cache en variable de módulo — persiste entre requests en el mismo proceso servidor
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const AUTH_ENDPOINT = 'https://icdaccessmanagement.who.int/connect/token';
const API_BASE_URL = 'https://id.who.int';

async function getToken(): Promise<string> {
  if (cachedToken !== null && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.ICD_API_CLIENT_ID;
  const clientSecret = process.env.ICD_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('[ICD] Missing ICD_API_CLIENT_ID or ICD_API_CLIENT_SECRET');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`[ICD] Auth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return cachedToken;
}

export async function icdFetch(
  path: string,
  params?: Record<string, string>,
): Promise<unknown> {
  const url = new URL(API_BASE_URL + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const doRequest = async (): Promise<Response> => {
    const token = await getToken();
    return fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'API-Version': 'v2',
        Accept: 'application/json',
      },
    });
  };

  let response = await doRequest();

  if (response.status === 401) {
    // Invalidar cache y reintentar una vez
    cachedToken = null;
    tokenExpiresAt = 0;
    response = await doRequest();
  }

  if (response.status === 429) {
    throw new Error('ICD API rate limit');
  }

  if (response.status >= 500) {
    throw new Error('[ICD] Server error ' + response.status);
  }

  return response.json();
}
