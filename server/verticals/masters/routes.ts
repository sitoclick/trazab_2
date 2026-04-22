import { Router } from 'express';
import { holdedGet } from '../../shared/holded.js';

const router = Router();

router.get('/holded/products', async (req, res) => {
  try { res.json(await holdedGet('/api/invoicing/v1/products')); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/holded/products/:id', async (req, res) => {
  try { res.json(await holdedGet(`/api/invoicing/v1/products/${req.params.id}`)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
