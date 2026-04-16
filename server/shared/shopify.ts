const shopifyTokens: Record<string, { token: string | null; expiry: number }> = {
  '1': { token: null, expiry: 0 },
  '2': { token: null, expiry: 0 }
};

export async function getShopifyToken(storeIndex: string): Promise<string | null> {
  const shopUrl = process.env[`SHOPIFY_STORE_${storeIndex}_URL`];
  const clientId = process.env[`SHOPIFY_STORE_${storeIndex}_CLIENT_ID`];
  const clientSecret = process.env[`SHOPIFY_STORE_${storeIndex}_CLIENT_SECRET`];
  const existingToken = process.env[`SHOPIFY_STORE_${storeIndex}_TOKEN`];

  if (existingToken && existingToken.startsWith('shpat_')) {
    return existingToken;
  }

  const cached = shopifyTokens[storeIndex];
  if (cached.token && Date.now() < cached.expiry - 300000) {
    return cached.token;
  }

  if (!shopUrl || !clientId || !clientSecret) return null;

  const cleanShopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const authUrl = `https://${cleanShopUrl}/admin/oauth/access_token`;

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      console.error(`Shopify Auth Error Store ${storeIndex}: ${response.status} ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    shopifyTokens[storeIndex] = {
      token: data.access_token,
      expiry: Date.now() + data.expires_in * 1000
    };
    return data.access_token;
  } catch (err) {
    console.error(`Error fetching Shopify token Store ${storeIndex}:`, err);
    return null;
  }
}

export function invalidateShopifyToken(storeIndex: string) {
  shopifyTokens[storeIndex] = { token: null, expiry: 0 };
}
