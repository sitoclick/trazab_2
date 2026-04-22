import crypto from 'crypto';

// Tokens are managed in-memory; MIRAVIA_ACCESS_TOKEN / MIRAVIA_REFRESH_TOKEN in .env
// provide the initial values. Tokens are refreshed automatically when they expire.
let cachedAccessToken = process.env.MIRAVIA_ACCESS_TOKEN || '';
let cachedRefreshToken = process.env.MIRAVIA_REFRESH_TOKEN || '';
let tokenExpirationTime = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days default

export function signRequest(apiPath: string, params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  let signString = apiPath;
  for (const key of sortedKeys) {
    signString += key + params[key];
  }
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(signString);
  return hmac.digest('hex').toUpperCase();
}

export async function getMiraviaAccessToken(appKey: string, appSecret: string): Promise<string> {
  if (!cachedRefreshToken) {
    // Fall back to fixed access token if provided
    if (cachedAccessToken) return cachedAccessToken;
    throw new Error('AUTH_REQUIRED: No Miravia refresh token available. Link the account first.');
  }

  if (cachedAccessToken && Date.now() < tokenExpirationTime - 300000) {
    return cachedAccessToken;
  }

  const apiPath = '/auth/token/refresh';
  const timestamp = Date.now().toString();
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp,
    sign_method: 'sha256',
    refresh_token: cachedRefreshToken
  };
  params.sign = signRequest(apiPath, params, appSecret);

  const response = await fetch(
    `https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`,
    { method: 'POST' }
  );
  const data = await response.json();

  if (data.code !== '0' && data.code !== 0) {
    throw new Error(`Miravia Token Refresh Error: ${data.message || JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  if (data.refresh_token) cachedRefreshToken = data.refresh_token;
  tokenExpirationTime = Date.now() + (data.expires_in || 86400) * 1000;

  return cachedAccessToken;
}

export function importMiraviaTokens(accessToken: string, refreshToken: string) {
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  tokenExpirationTime = Date.now() + 3600 * 1000;
}
