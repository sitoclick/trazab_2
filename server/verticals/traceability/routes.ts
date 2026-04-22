import { Router } from 'express';
import { getDEPCQuery, corregirPrecintoLote } from './queries.js';

const router = Router();

router.get('/depc', async (req, res) => {
  const { ejercicio, serie, numero } = req.query;
  if (!ejercicio || !serie || !numero) return res.status(400).json({ error: 'Faltan parámetros: ejercicio, serie, numero' });
  try {
    const result = await getDEPCQuery(Number(ejercicio), String(serie), Number(numero));
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trazabilidad/corregir-precinto', async (req, res) => {
  const { lote, tipo, precinto } = req.body;
  if (!lote || !tipo || !precinto) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    const result = await corregirPrecintoLote(lote, tipo, precinto);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
