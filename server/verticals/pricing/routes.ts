import { Router } from 'express';
import { getTarifasQuery, createTarifaQuery, updateTarifaQuery, deleteTarifaQuery, getPreciosTarifaQuery, updatePrecioTarifaQuery, deletePrecioTarifaQuery } from './queries.js';

const router = Router();

router.get('/tarifas', async (req, res) => {
  try { res.json((await getTarifasQuery()).recordset); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/tarifas', async (req, res) => {
  const { name, description, active } = req.body;
  try { res.json((await createTarifaQuery(name, description, active)).recordset[0]); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.put('/tarifas/:id', async (req, res) => {
  const { name, description, active } = req.body;
  try { res.json((await updateTarifaQuery(parseInt(req.params.id), name, description, active)).recordset[0]); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/tarifas/:id', async (req, res) => {
  try { await deleteTarifaQuery(parseInt(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/precios-tarifa', async (req, res) => {
  const tarifaId = req.query.tarifaId ? parseInt(req.query.tarifaId as string) : undefined;
  try { res.json((await getPreciosTarifaQuery(tarifaId)).recordset); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/precios-tarifa', async (req, res) => {
  const { tarifaId, productId, precio } = req.body;
  try { res.json((await updatePrecioTarifaQuery(tarifaId, productId, precio)).recordset[0]); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/precios-tarifa/bulk', async (req, res) => {
  const { precios } = req.body;
  try { for (const p of precios) await updatePrecioTarifaQuery(p.tarifaId, p.productId, p.precio); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/precios-tarifa/:id', async (req, res) => {
  try { await deletePrecioTarifaQuery(parseInt(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
