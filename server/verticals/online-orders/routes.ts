import { Router } from 'express';
import { PDFDocument } from 'pdf-lib';
import { getShopifyToken, invalidateShopifyToken } from '../../shared/shopify.js';
import { getMiraviaAccessToken, signRequest, importMiraviaTokens } from '../../shared/miravia.js';

const router = Router();

// ─── Shopify ─────────────────────────────────────────────────────────────────

router.get('/shopify/orders', async (req, res) => {
  try {
    const allOrders: any[] = [];
    for (const storeIndex of ['1', '2']) {
      const shopUrl = process.env[`SHOPIFY_STORE_${storeIndex}_URL`];
      if (!shopUrl) continue;
      const token = await getShopifyToken(storeIndex);
      if (!token) continue;
      const cleanUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      try {
        const response = await fetch(`https://${cleanUrl}/admin/api/2024-01/orders.json?status=open`, {
          headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) invalidateShopifyToken(storeIndex);
          console.error(`Shopify API Error Store ${storeIndex}: ${response.status}`);
          continue;
        }
        const data = await response.json();
        allOrders.push(...(data.orders || []).map((o: any) => ({ ...o, store_index: storeIndex, store_name: cleanUrl.split('.')[0] })));
      } catch (err) { console.error(`Error fetching Shopify Store ${storeIndex}:`, err); }
    }
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(allOrders);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/shopify/orders/:storeIndex/:orderId/release_hold', async (req, res) => {
  const { storeIndex, orderId } = req.params;
  try {
    const token = await getShopifyToken(storeIndex);
    const shopUrl = process.env[`SHOPIFY_STORE_${storeIndex}_URL`];
    if (!token || !shopUrl) return res.status(400).json({ error: 'Shopify credentials not configured.' });
    const cleanUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const foResponse = await fetch(`https://${cleanUrl}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
    });
    if (!foResponse.ok) throw new Error(`Error fetching fulfillment orders: ${await foResponse.text()}`);
    const foData = await foResponse.json();
    const heldFO = foData.fulfillment_orders.find((fo: any) => fo.status === 'on_hold');
    if (!heldFO) return res.json({ success: true, message: 'No fulfillment order on hold found.' });
    const releaseResponse = await fetch(`https://${cleanUrl}/admin/api/2024-01/fulfillment_orders/${heldFO.id}/release_hold.json`, {
      method: 'POST', headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
    });
    if (!releaseResponse.ok) throw new Error(`Error releasing hold: ${await releaseResponse.text()}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Miravia ─────────────────────────────────────────────────────────────────

router.post('/miravia/import-token', async (req, res) => {
  try {
    const data = JSON.parse(req.body.jsonString);
    if (!data.refresh_token) throw new Error("El JSON no contiene la propiedad 'refresh_token'.");
    importMiraviaTokens(data.access_token || '', data.refresh_token);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/miravia/auth', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'El código de autorización es obligatorio' });
  const appKey = process.env.MIRAVIA_APP_KEY;
  const appSecret = process.env.MIRAVIA_APP_SECRET;
  if (!appKey || !appSecret) return res.status(500).json({ error: 'Miravia credentials are not configured.' });
  const apiPath = '/auth/token/create';
  const timestamp = Date.now().toString();
  const params: Record<string, string> = { app_key: appKey, timestamp, sign_method: 'sha256', code };
  params.sign = signRequest(apiPath, params, appSecret);
  try {
    const response = await fetch(`https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`, { method: 'POST' });
    const data = await response.json();
    if (data.code !== '0' && data.code !== 0) throw new Error(`Error de Autorización Miravia: ${data.message}`);
    importMiraviaTokens(data.access_token, data.refresh_token);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

async function getAllMiraviaOrders(appKey: string, appSecret: string, accessToken: string, year: string) {
  let allOrders: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  while (hasMore && offset < 5000) {
    const apiPath = '/orders/get';
    const params: Record<string, string> = {
      app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256', access_token: accessToken,
      created_after: `${year}-01-01T00:00:00+00:00`, created_before: `${year}-12-31T23:59:59+00:00`,
      limit: limit.toString(), offset: offset.toString(), sort_direction: 'ASC'
    };
    params.sign = signRequest(apiPath, params, appSecret);
    const response = await fetch(`https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`);
    const data = await response.json();
    if (data.code && data.code !== '0') throw new Error(data.message || JSON.stringify(data));
    const orders = data.data?.orders || [];
    allOrders = allOrders.concat(orders);
    if (orders.length < limit) hasMore = false; else offset += limit;
  }
  return allOrders;
}

router.get('/miravia/orders', async (req, res) => {
  const appKey = process.env.MIRAVIA_APP_KEY;
  const appSecret = process.env.MIRAVIA_APP_SECRET;
  if (!appKey || !appSecret) return res.status(500).json({ error: 'Miravia credentials not configured.' });
  try {
    const accessToken = await getMiraviaAccessToken(appKey, appSecret);
    const apiPath = '/orders/get';
    const statusQuery = req.query.status as string || 'ready_to_ship';
    let createdAfter = req.query.created_after as string;
    if (!createdAfter) {
      const start = new Date(); start.setDate(start.getDate() - 90);
      createdAfter = start.toISOString().split('T')[0] + 'T00:00:00+00:00';
    } else if (createdAfter.length === 10) { createdAfter += 'T00:00:00+00:00'; }
    const params: Record<string, string> = {
      app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
      access_token: accessToken, created_after: createdAfter, limit: '100', offset: '0'
    };
    if (statusQuery !== 'all') params.status = statusQuery;
    params.sign = signRequest(apiPath, params, appSecret);
    const response = await fetch(`https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`, { method: 'GET' });
    const data = await response.json();
    if (data.code !== '0' && data.code !== 0) throw new Error(`Miravia API Error: ${data.message}`);
    const orders = data.data?.orders || [];
    // Fetch items in batches of 50
    for (let i = 0; i < orders.length; i += 50) {
      const batch = orders.slice(i, i + 50);
      const orderIds = batch.map((o: any) => o.order_id);
      const itemsPath = '/orders/items/get';
      const itemsParams: Record<string, string> = {
        app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
        access_token: accessToken, order_ids: JSON.stringify(orderIds)
      };
      itemsParams.sign = signRequest(itemsPath, itemsParams, appSecret);
      try {
        const itemsResponse = await fetch(`https://api.miravia.es/rest${itemsPath}?${new URLSearchParams(itemsParams).toString()}`);
        const itemsData = await itemsResponse.json();
        if (itemsData.code === '0' || itemsData.code === 0) {
          const itemsByOrderId = new Map();
          if (Array.isArray(itemsData.data)) itemsData.data.forEach((d: any) => itemsByOrderId.set(d.order_id.toString(), d.order_items || []));
          batch.forEach((order: any) => { order.items = itemsByOrderId.get(order.order_id.toString()) || []; });
        } else { batch.forEach((order: any) => { order.items = []; }); }
      } catch (e) { batch.forEach((order: any) => { order.items = []; }); }
    }
    res.json({ mock: false, orders });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/miravia/orders/export', async (req, res) => {
  const appKey = process.env.MIRAVIA_APP_KEY;
  const appSecret = process.env.MIRAVIA_APP_SECRET;
  if (!appKey || !appSecret) return res.status(500).json({ error: 'Miravia credentials not configured.' });
  try {
    const accessToken = await getMiraviaAccessToken(appKey, appSecret);
    const apiPath = '/orders/get';
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000).toString();
    const params: Record<string, string> = {
      app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
      access_token: accessToken, limit: '100', offset: '0', created_after: ninetyDaysAgo
    };
    params.sign = signRequest(apiPath, params, appSecret);
    const response = await fetch(`https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`);
    const data = await response.json();
    if (data.code !== '0' && data.code !== 0) throw new Error(`Miravia API Error: ${data.message}`);
    const orders = data.data?.orders || [];
    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.order_id);
      const itemsPath = '/orders/items/get';
      const itemsParams: Record<string, string> = {
        app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
        access_token: accessToken, order_ids: JSON.stringify(orderIds)
      };
      itemsParams.sign = signRequest(itemsPath, itemsParams, appSecret);
      const itemsResponse = await fetch(`https://api.miravia.es/rest${itemsPath}?${new URLSearchParams(itemsParams).toString()}`);
      const itemsData = await itemsResponse.json();
      if (itemsData.code === '0' || itemsData.code === 0) {
        const itemsByOrderId = new Map();
        if (Array.isArray(itemsData.data)) itemsData.data.forEach((d: any) => itemsByOrderId.set(d.order_id.toString(), d.order_items || []));
        orders.forEach((order: any) => { order.items = itemsByOrderId.get(order.order_id.toString()) || []; });
      }
    }
    res.json(orders);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/miravia/generate-labels', async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders) || orders.length === 0) return res.status(400).json({ error: 'Orders array is required' });
  const appKey = process.env.MIRAVIA_APP_KEY;
  const appSecret = process.env.MIRAVIA_APP_SECRET;
  if (!appKey || !appSecret) return res.status(500).json({ error: 'Miravia credentials not configured.' });
  try {
    const accessToken = await getMiraviaAccessToken(appKey, appSecret);
    // Fulfill pending orders
    const pendingItemIds: number[] = [];
    orders.forEach((order: any) => {
      const status = (order.status || '').toLowerCase();
      if ((status === 'pending' || status === 'unpacked') && order.items)
        order.items.forEach((item: any) => { if (item.order_item_id) pendingItemIds.push(Number(item.order_item_id)); });
    });
    if (pendingItemIds.length > 0) {
      for (let i = 0; i < pendingItemIds.length; i += 50) {
        const batchIds = pendingItemIds.slice(i, i + 50);
        const fulfillPath = '/v2/order/fulfill';
        const params: any = {
          app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
          access_token: accessToken, payload: JSON.stringify({ order_item_ids: batchIds })
        };
        params.sign = signRequest(fulfillPath, params, appSecret);
        try {
          await fetch(`https://api.miravia.es/rest${fulfillPath}`, {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body: new URLSearchParams(params).toString()
          });
        } catch (e) { console.error('Fulfill batch error:', e); }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Get shipping labels
    const orderItemIds: string[] = [];
    orders.forEach((order: any) => { if (order.items) order.items.forEach((item: any) => { if (item.order_item_id) orderItemIds.push(item.order_item_id.toString()); }); });
    if (orderItemIds.length === 0) throw new Error('No se encontraron order_item_ids.');
    const mergedPdf = await PDFDocument.create();
    for (let i = 0; i < orderItemIds.length; i += 50) {
      const batchIds = orderItemIds.slice(i, i + 50);
      const apiPath = '/order/document/get';
      const params: any = {
        app_key: appKey, timestamp: Date.now().toString(), sign_method: 'sha256',
        access_token: accessToken, doc_type: 'shippingLabel', order_item_ids: JSON.stringify(batchIds)
      };
      params.sign = signRequest(apiPath, params, appSecret);
      const response = await fetch(`https://api.miravia.es/rest${apiPath}?${new URLSearchParams(params).toString()}`);
      const data = await response.json();
      if (data.code !== '0' && data.code !== 0) throw new Error(`Miravia Document Error: ${data.message}`);
      const base64Pdf = data.data?.document?.file;
      if (!base64Pdf) throw new Error('La API de Miravia no devolvió ningún archivo PDF.');
      const pdfDoc = await PDFDocument.load(Buffer.from(base64Pdf, 'base64'));
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    res.json({ pdfBase64: Buffer.from(await mergedPdf.save()).toString('base64') });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Miravia test endpoints
router.get('/miravia/test/orders', async (req, res) => {
  const appKey = process.env.MIRAVIA_APP_KEY; const appSecret = process.env.MIRAVIA_APP_SECRET;
  if (!appKey || !appSecret) return res.status(500).json({ error: 'Miravia credentials not configured' });
  try { const at = await getMiraviaAccessToken(appKey, appSecret); res.json(await getAllMiraviaOrders(appKey, appSecret, at, (req.query.year as string)||'2026')); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Sendcloud ────────────────────────────────────────────────────────────────

router.get('/sendcloud/parcels', async (req, res) => {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) return res.status(400).json({ error: 'Sendcloud credentials not configured.' });
  try {
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    const response = await fetch('https://panel.sendcloud.sc/api/v2/parcels', { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Sendcloud API Error: ${response.status} ${await response.text()}`);
    const data = await response.json();
    res.json(data.parcels || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/sendcloud/parcel_by_order/:orderName', async (req, res) => {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) return res.status(400).json({ error: 'Sendcloud credentials not configured.' });
  try {
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
    const response = await fetch('https://panel.sendcloud.sc/api/v2/parcels?limit=100', { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Sendcloud API Error: ${response.status}`);
    const data = await response.json();
    const parcel = data.parcels.find((p: any) => p.external_order_id === req.params.orderName || p.order_number === req.params.orderName);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found in Sendcloud' });
    res.json(parcel);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
