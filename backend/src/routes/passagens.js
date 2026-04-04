const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { obra_id, colaborador_id, empresa, data_inicio, data_fim, status } = req.query;
    let query = `SELECT p.*, c.nome as colaborador_nome, o.nome as obra_nome
      FROM passagens p LEFT JOIN colaboradores c ON p.colaborador_id = c.id
      LEFT JOIN obras o ON p.obra_id = o.id WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (obra_id) { query += ` AND p.obra_id = $${idx++}`; params.push(obra_id); }
    if (colaborador_id) { query += ` AND p.colaborador_id = $${idx++}`; params.push(colaborador_id); }
    if (empresa) { query += ` AND p.empresa ILIKE $${idx++}`; params.push(`%${empresa}%`); }
    if (status) { query += ` AND p.status = $${idx++}`; params.push(status); }
    if (data_inicio) { query += ` AND p.data_viagem >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { query += ` AND p.data_viagem <= $${idx++}`; params.push(data_fim); }
    if (req.user.obras_ids !== null) {
      if (req.user.obras_ids.length === 0) return res.json({ data: [], total: 0, count: 0 });
      query += ` AND p.obra_id = ANY($${idx++})`; params.push(req.user.obras_ids);
    }
    query += ' ORDER BY p.data_viagem DESC';
    const result = await db.query(query, params);
    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    res.json({ data: result.rows, total, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar passagens' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { colaborador_id, obra_id, data_compra, data_viagem, valor, parcelas, empresa, cartao_utilizado, origem, destino, tipo, status, observacoes } = req.body;
    const result = await db.query(
      `INSERT INTO passagens (colaborador_id,obra_id,data_compra,data_viagem,valor,parcelas,empresa,cartao_utilizado,origem,destino,tipo,status,observacoes,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [colaborador_id, obra_id, data_compra, data_viagem, valor, parcelas || 1, empresa, cartao_utilizado, origem, destino, tipo || 'ida', status || 'confirmado', observacoes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar passagem' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { colaborador_id, obra_id, data_compra, data_viagem, valor, parcelas, empresa, cartao_utilizado, origem, destino, tipo, status, observacoes } = req.body;
    const result = await db.query(
      `UPDATE passagens SET colaborador_id=$1,obra_id=$2,data_compra=$3,data_viagem=$4,valor=$5,parcelas=$6,empresa=$7,cartao_utilizado=$8,origem=$9,destino=$10,tipo=$11,status=$12,observacoes=$13 WHERE id=$14 RETURNING *`,
      [colaborador_id, obra_id, data_compra, data_viagem, valor, parcelas, empresa, cartao_utilizado, origem, destino, tipo, status, observacoes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Passagem não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar passagem' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM passagens WHERE id=$1', [req.params.id]);
    res.json({ message: 'Passagem removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover passagem' });
  }
});

module.exports = router;
