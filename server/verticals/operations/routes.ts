import { Router } from 'express';
import { sql } from '../../config/database.js';
import {
  getProductionDataQuery, getSchemaQuery, getPesadasQuery, getOrderLinesQuery,
  getPesadasLineaQuery, getCalicerQuery, getClearOrdersQuery, getPendingOrdersQuery,
  getReservasQuery, updateSelectedOrdersQuery, closeAndPrintSelectedOrdersQuery,
  forceCloseOrderQuery, revertOrderToPendingQuery, reopenOrderQuery, getAsiciQuery,
  cambiarPesadasPedido
} from './queries.js';

const router = Router();

router.get('/production', async (req, res) => {
  try {
    const result = await getProductionDataQuery();
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schema', async (req, res) => {
  try {
    const result = await getSchemaQuery();
    const schema = result.recordset.reduce((acc: any, row: any) => {
      if (!acc[row.TABLE_NAME]) acc[row.TABLE_NAME] = [];
      acc[row.TABLE_NAME].push(`${row.COLUMN_NAME} (${row.DATA_TYPE})`);
      return acc;
    }, {});
    res.json({ schema: JSON.stringify(schema, null, 2) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/query', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });
  try {
    const result = await sql.query(query);
    res.json({ results: result.recordset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queries/pesadas', async (req, res) => {
  const { ejercicioPedido, seriePedido, numeroPedido } = req.body;
  if (!ejercicioPedido || !seriePedido || !numeroPedido) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    const result = await getPesadasQuery(ejercicioPedido, seriePedido, numeroPedido);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/lines', async (req, res) => {
  const { ejercicioPedido, seriePedido, numeroPedido } = req.query;
  if (!ejercicioPedido || !seriePedido || !numeroPedido) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    const result = await getOrderLinesQuery(Number(ejercicioPedido), String(seriePedido), Number(numeroPedido));
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/pesadas-linea', async (req, res) => {
  const { ejercicioPedido, seriePedido, numeroPedido, codigoArticulo } = req.query;
  if (!ejercicioPedido || !seriePedido || !numeroPedido || !codigoArticulo) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    const result = await getPesadasLineaQuery(Number(ejercicioPedido), String(seriePedido), Number(numeroPedido), String(codigoArticulo));
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/cambiar-pesadas', async (req, res) => {
  const { ejercicioOrigen, serieOrigen, numeroOrigen, lineaOrigen, codigoArticulo, ejercicioDestino, serieDestino, numeroDestino } = req.body;
  if (!ejercicioOrigen || !serieOrigen || !numeroOrigen || !lineaOrigen || !codigoArticulo || !ejercicioDestino || !serieDestino || !numeroDestino)
    return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    await cambiarPesadasPedido(Number(ejercicioOrigen), String(serieOrigen), Number(numeroOrigen), String(lineaOrigen), String(codigoArticulo), Number(ejercicioDestino), String(serieDestino), Number(numeroDestino));
    res.json({ success: true, message: 'Pesadas cambiadas correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/queries/calicer', async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year as string) : 2026;
  try {
    const result = await getCalicerQuery(year);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear-orders', async (req, res) => {
  try {
    const result = await getClearOrdersQuery();
    res.json({ success: true, rowsAffected: result.rowsAffected[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/pending', async (req, res) => {
  const sent = req.query.sent === 'true';
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  try {
    const result = await getPendingOrdersQuery(sent, year);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/reservas', async (req, res) => {
  try {
    const result = await getReservasQuery();
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/clear-selected', async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders) || orders.length === 0) return res.status(400).json({ error: 'No orders provided' });
  try {
    const result = await updateSelectedOrdersQuery(orders);
    res.json({ success: true, rowsAffected: result.rowsAffected[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/close-and-print-selected', async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders) || orders.length === 0) return res.status(400).json({ error: 'No orders provided' });
  try {
    const result = await closeAndPrintSelectedOrdersQuery(orders);
    res.json({ success: true, rowsAffected: result.rowsAffected[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/force-close', async (req, res) => {
  const { empresa, ejercicio, serie, numero } = req.body;
  if (!empresa || !ejercicio || !serie || !numero) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    await forceCloseOrderQuery(empresa, ejercicio, serie, numero);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/revert-pending', async (req, res) => {
  const { empresa, ejercicio, serie, numero } = req.body;
  if (!empresa || !ejercicio || !serie || !numero) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    await revertOrderToPendingQuery(empresa, ejercicio, serie, numero);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/reopen', async (req, res) => {
  const { empresa, ejercicio, serie, numero } = req.body;
  if (!empresa || !ejercicio || !serie || !numero) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    await reopenOrderQuery(empresa, ejercicio, serie, numero);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queries/asici', async (req, res) => {
  const { cliente, fechaDesde, fechaHasta } = req.body;
  if (!cliente || !fechaDesde || !fechaHasta) return res.status(400).json({ error: 'Faltan parámetros' });
  try {
    const result = await getAsiciQuery(cliente, fechaDesde, fechaHasta);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logs', async (req, res) => {
  const { orderNumber } = req.body;
  if (!orderNumber) return res.status(400).json({ error: 'Order number is required' });
  try {
    const sheetUrl = process.env.LOGS_SHEET_URL;
    if (!sheetUrl) return res.status(500).json({ error: 'LOGS_SHEET_URL no configurado en el servidor.' });
    const sheetRes = await fetch(sheetUrl);
    if (!sheetRes.ok) throw new Error('No se pudo acceder al documento de logs.');
    const csvText = await sheetRes.text();
    const lines = csvText.split('\n');
    if (lines.length === 0) return res.json({ logs: null, message: 'El documento de logs está vacío.' });
    const header = lines[0];
    const searchTerm = orderNumber.toLowerCase();
    const filteredLines = lines.filter((line: string) => line.toLowerCase().includes(searchTerm));
    if (filteredLines.length === 0) return res.json({ logs: null, message: `No he encontrado ningún registro en los logs para el pedido **${orderNumber}**.` });
    res.json({ logs: [header, ...filteredLines].join('\n') });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
