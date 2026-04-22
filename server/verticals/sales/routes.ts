import { Router } from 'express';
import { holdedGet } from '../../shared/holded.js';

const HOLDED_API_KEY = process.env.HOLDED_API_KEY;

const router = Router();

router.get('/holded/contacts', async (req, res) => {
  try { res.json(await holdedGet('/api/invoicing/v1/contacts')); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/salesorders', async (req, res) => {
  try { res.json(await holdedGet('/api/invoicing/v1/documents/salesorder')); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/invoices/:id/pdf', async (req, res) => {
  try {
    const response = await fetch(`https://api.holded.com/api/invoicing/v1/documents/invoice/${req.params.id}/pdf`, {
      headers: { 'key': HOLDED_API_KEY!, 'accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Holded PDF Error: ${response.status} ${await response.text()}`);
    res.json(await response.json());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/invoices/:id', async (req, res) => {
  try { res.json(await holdedGet(`/api/invoicing/v1/documents/invoice/${req.params.id}`)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/invoices', async (req, res) => {
  const { paid, starttmp, endtmp } = req.query;
  try {
    const now = new Date();
    const startTmp = starttmp ? parseInt(starttmp as string) : Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
    const endTmp = endtmp ? parseInt(endtmp as string) : Math.floor(new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime() / 1000);

    const fetchInvoices = async (paidStatus: string | number) => {
      let allData: any[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      while (hasMore) {
        const url = new URL('https://api.holded.com/api/invoicing/v1/documents/invoice');
        url.searchParams.append('starttmp', startTmp.toString());
        url.searchParams.append('endtmp', endTmp.toString());
        if (paidStatus !== 'all') url.searchParams.append('paid', paidStatus.toString());
        url.searchParams.append('sort', 'created-desc');
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        const response = await fetch(url.toString(), { headers: { 'key': HOLDED_API_KEY!, 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`Holded API Error: ${response.status} ${await response.text()}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          allData = allData.concat(data);
          if (data.length < limit) hasMore = false; else page++;
        } else { hasMore = false; }
      }
      return allData.map((inv: any) => {
        if (inv.paid !== undefined) return inv;
        const pending = parseFloat(inv.paymentsPending || 0);
        const total = parseFloat(inv.total || 0);
        return { ...inv, paid: pending === 0 ? 1 : (pending < total && pending > 0) ? 2 : 0 };
      });
    };

    let result;
    if (paid === 'all') result = await fetchInvoices('all');
    else if (paid === '1') result = (await fetchInvoices(1)).filter((inv: any) => inv.paid === 1);
    else if (paid === '0') result = await fetchInvoices(0);
    else if (paid === '2') result = await fetchInvoices(2);
    else {
      const [unpaid, partial] = await Promise.all([fetchInvoices(0), fetchInvoices(2)]);
      result = [...unpaid, ...partial].filter((inv: any) => inv.paid !== 1);
      result.sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
    }
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/creditnotes', async (req, res) => {
  const { starttmp, endtmp } = req.query;
  try {
    const now = new Date();
    const startTmp = starttmp ? parseInt(starttmp as string) : Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
    const endTmp = endtmp ? parseInt(endtmp as string) : Math.floor(new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime() / 1000);
    let allData: any[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;
    while (hasMore) {
      const url = new URL('https://api.holded.com/api/invoicing/v1/documents/creditnote');
      url.searchParams.append('starttmp', startTmp.toString());
      url.searchParams.append('endtmp', endTmp.toString());
      url.searchParams.append('sort', 'created-desc');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      const response = await fetch(url.toString(), { headers: { 'key': HOLDED_API_KEY!, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Holded API Error: ${response.status} ${await response.text()}`);
      const data = await response.json();
      if (Array.isArray(data)) { allData = allData.concat(data); if (data.length < limit) hasMore = false; else page++; } else { hasMore = false; }
    }
    res.json(allData);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
