import { Router } from 'express';
import { sql } from '../../config/database.js';
import {
  getAgentesQuery, createAgenteQuery, updateAgenteQuery, deleteAgenteQuery,
  getReglasComisionQuery, createReglaComisionQuery, updateReglaComisionQuery,
  deleteReglaComisionQuery, syncReglasComisionQuery, getComisionesOverridesQuery,
  getComisionesAdjustmentsQuery, createComisionesAdjustmentQuery, deleteComisionesAdjustmentQuery,
  upsertComisionesOverrideQuery, deleteComisionesOverrideQuery, deleteAllComisionesOverridesQuery
} from './queries.js';

const router = Router();

const parseRule = (r: any) => ({
  ...r,
  category: r.category ? r.category.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
  formats: r.format ? r.format.split(',').map((s: string) => s.trim()).filter(Boolean) : []
});

// Agentes CRUD
router.get('/agentes', async (req, res) => {
  try { res.json((await getAgentesQuery()).recordset); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/agentes', async (req, res) => {
  const { name, email, phone, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try { res.json((await createAgenteQuery(name, email||'', phone||'', active!==false)).recordset[0]); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.put('/agentes/:id', async (req, res) => {
  const { name, email, phone, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await updateAgenteQuery(parseInt(req.params.id), name, email||'', phone||'', active!==false);
    if (!result.recordset.length) return res.status(404).json({ error: 'Agente no encontrado' });
    res.json(result.recordset[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/agentes/:id', async (req, res) => {
  try { await deleteAgenteQuery(parseInt(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Reglas de comisión
router.get('/comisiones/reglas', async (req, res) => {
  try { res.json((await getReglasComisionQuery()).recordset.map(parseRule)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/comisiones/reglas', async (req, res) => {
  const { agentId, category, formats, rate, startDate, endDate, description, clientId, clientName } = req.body;
  if (!agentId || rate===undefined) return res.status(400).json({ error: 'Agent ID and rate are required' });
  try {
    const catStr = Array.isArray(category) ? category.join(',') : (category||'');
    const formStr = Array.isArray(formats) ? formats.join(',') : (formats||'');
    const r = (await createReglaComisionQuery(parseInt(agentId), catStr, formStr, parseFloat(rate), startDate, endDate, description||'', clientId, clientName)).recordset[0];
    res.json(parseRule(r));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.put('/comisiones/reglas/:id', async (req, res) => {
  const { agentId, category, formats, rate, startDate, endDate, description, clientId, clientName } = req.body;
  if (!agentId || rate===undefined) return res.status(400).json({ error: 'Agent ID and rate are required' });
  try {
    const catStr = Array.isArray(category) ? category.join(',') : (category||'');
    const formStr = Array.isArray(formats) ? formats.join(',') : (formats||'');
    const r = (await updateReglaComisionQuery(parseInt(req.params.id), parseInt(agentId), catStr, formStr, parseFloat(rate), startDate, endDate, description||'', clientId, clientName)).recordset[0];
    res.json(parseRule(r));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/comisiones/reglas/:id', async (req, res) => {
  try { await deleteReglaComisionQuery(parseInt(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/comisiones/sync', async (req, res) => {
  try { await syncReglasComisionQuery(req.body.rules); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Overrides
router.get('/comisiones/overrides/:agentId', async (req, res) => {
  try { res.json((await getComisionesOverridesQuery(parseInt(req.params.agentId))).recordset); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/comisiones/overrides', async (req, res) => {
  const { invoiceId, agentId, removed, linesData } = req.body;
  try { await upsertComisionesOverrideQuery(invoiceId, parseInt(agentId), !!removed, linesData ? JSON.stringify(linesData) : null); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/comisiones/overrides/:agentId/:invoiceId', async (req, res) => {
  try { await deleteComisionesOverrideQuery(req.params.invoiceId, parseInt(req.params.agentId)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/comisiones/overrides/:agentId', async (req, res) => {
  try { await deleteAllComisionesOverridesQuery(parseInt(req.params.agentId)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Adjustments
router.get('/comisiones/adjustments/:agentId/:year', async (req, res) => {
  try { res.json((await getComisionesAdjustmentsQuery(parseInt(req.params.agentId), parseInt(req.params.year))).recordset); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/comisiones/adjustments', async (req, res) => {
  const { agentId, year, quarter, amount, description } = req.body;
  try { await createComisionesAdjustmentQuery(parseInt(agentId), parseInt(year), quarter, parseFloat(amount), description); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.delete('/comisiones/adjustments/:id', async (req, res) => {
  try { await deleteComisionesAdjustmentQuery(parseInt(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Comisiones calculadas
router.get('/comisiones/calculadas/:agentId/:year', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT Id as id, AgenteId as agentId, Trimestre as quarter, Anio as year,
        TotalComision as totalCommission, DetallesJson as detailsJson, FechaCalculo as calculatedAt
      FROM ComisionesCalculadas
      WHERE AgenteId=${parseInt(req.params.agentId)} AND Anio=${parseInt(req.params.year)}
    `;
    res.json(result.recordset.map((r: any) => ({ ...r, details: JSON.parse(r.detailsJson) })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
router.post('/comisiones/calculadas', async (req, res) => {
  const { agentId, quarter, year, totalCommission, details } = req.body;
  if (!agentId || !quarter || !year || totalCommission===undefined || !details) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const detailsJson = JSON.stringify(details);
    await sql.query`
      MERGE ComisionesCalculadas AS target
      USING (SELECT ${agentId} as AgenteId, ${quarter} as Trimestre, ${year} as Anio) AS source
      ON (target.AgenteId=source.AgenteId AND target.Trimestre=source.Trimestre AND target.Anio=source.Anio)
      WHEN MATCHED THEN UPDATE SET TotalComision=${totalCommission},DetallesJson=${detailsJson},FechaCalculo=GETDATE()
      WHEN NOT MATCHED THEN INSERT (AgenteId,Trimestre,Anio,TotalComision,DetallesJson) VALUES (source.AgenteId,source.Trimestre,source.Anio,${totalCommission},${detailsJson});
    `;
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
