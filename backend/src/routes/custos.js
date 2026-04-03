const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { obra_id, categoria, colaborador_id, mes, ano, data_inicio, data_fim } = req.query;
    let query = `SELECT c.*, col.nome as colaborador_nome, o.nome as obra_nome
      FROM custos c LEFT JOIN colaboradores col ON c.colaborador_id = col.id
      LEFT JOIN obras o ON c.obra_id = o.id WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (obra_id) { query += ` AND c.obra_id = $${idx++}`; params.push(obra_id); }
    if (categoria) { query += ` AND c.categoria = $${idx++}`; params.push(categoria); }
    if (colaborador_id) { query += ` AND c.colaborador_id = $${idx++}`; params.push(colaborador_id); }
    if (mes) { query += ` AND c.mes_referencia = $${idx++}`; params.push(mes); }
    if (ano) { query += ` AND c.ano_referencia = $${idx++}`; params.push(ano); }
    if (data_inicio) { query += ` AND c.data_lancamento >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { query += ` AND c.data_lancamento <= $${idx++}`; params.push(data_fim); }
    query += ' ORDER BY c.data_lancamento DESC';
    const result = await db.query(query, params);
    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    const porCategoria = {};
    result.rows.forEach(r => { porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + parseFloat(r.valor || 0); });
    res.json({ data: result.rows, total, porCategoria });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar custos' });
  }
});

router.get('/consolidado', async (req, res) => {
  try {
    const { obra_id, ano } = req.query;
    let query = `SELECT mes_referencia as mes, ano_referencia as ano, categoria, SUM(valor) as total
      FROM custos WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (obra_id) { query += ` AND obra_id = $${idx++}`; params.push(obra_id); }
    if (ano) { query += ` AND ano_referencia = $${idx++}`; params.push(ano); }
    query += ' GROUP BY mes_referencia, ano_referencia, categoria ORDER BY ano_referencia, mes_referencia';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar consolidado' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { obra_id, colaborador_id, categoria, subcategoria, descricao, valor, data_lancamento, forma_pagamento, status } = req.body;
    const date = new Date(data_lancamento);
    const result = await db.query(
      `INSERT INTO custos (obra_id,colaborador_id,categoria,subcategoria,descricao,valor,data_lancamento,mes_referencia,ano_referencia,forma_pagamento,status,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [obra_id, colaborador_id, categoria, subcategoria, descricao, valor, data_lancamento, date.getMonth() + 1, date.getFullYear(), forma_pagamento, status || 'aprovado', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar custo' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { obra_id, colaborador_id, categoria, subcategoria, descricao, valor, data_lancamento, forma_pagamento, status } = req.body;
    const date = new Date(data_lancamento);
    const result = await db.query(
      `UPDATE custos SET obra_id=$1,colaborador_id=$2,categoria=$3,subcategoria=$4,descricao=$5,valor=$6,data_lancamento=$7,mes_referencia=$8,ano_referencia=$9,forma_pagamento=$10,status=$11 WHERE id=$12 RETURNING *`,
      [obra_id, colaborador_id, categoria, subcategoria, descricao, valor, data_lancamento, date.getMonth() + 1, date.getFullYear(), forma_pagamento, status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Custo não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar custo' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM custos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Custo removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover custo' });
  }
});

module.exports = router;
