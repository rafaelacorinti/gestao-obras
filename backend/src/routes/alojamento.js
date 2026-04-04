const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { obra_id, tipo, mes, ano } = req.query;
    let query = `SELECT a.*, o.nome as obra_nome FROM alojamento a LEFT JOIN obras o ON a.obra_id = o.id WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (obra_id) { query += ` AND a.obra_id = $${idx++}`; params.push(obra_id); }
    if (tipo) { query += ` AND a.tipo = $${idx++}`; params.push(tipo); }
    if (mes) { query += ` AND a.mes_referencia = $${idx++}`; params.push(mes); }
    if (ano) { query += ` AND a.ano_referencia = $${idx++}`; params.push(ano); }
    if (req.user.obras_ids !== null) {
      if (req.user.obras_ids.length === 0) return res.json({ data: [], total: 0 });
      query += ` AND a.obra_id = ANY($${idx++})`; params.push(req.user.obras_ids);
    }
    query += ' ORDER BY a.data_lancamento DESC';
    const result = await db.query(query, params);
    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    res.json({ data: result.rows, total });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alojamento' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { obra_id, tipo, descricao, valor, data_lancamento, fornecedor, numero_colaboradores } = req.body;
    const date = new Date(data_lancamento);
    const result = await db.query(
      `INSERT INTO alojamento (obra_id,tipo,descricao,valor,data_lancamento,mes_referencia,ano_referencia,fornecedor,numero_colaboradores,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [obra_id, tipo, descricao, valor, data_lancamento, date.getMonth() + 1, date.getFullYear(), fornecedor, numero_colaboradores || 0, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar alojamento' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { obra_id, tipo, descricao, valor, data_lancamento, fornecedor, numero_colaboradores } = req.body;
    const date = new Date(data_lancamento);
    const result = await db.query(
      `UPDATE alojamento SET obra_id=$1,tipo=$2,descricao=$3,valor=$4,data_lancamento=$5,mes_referencia=$6,ano_referencia=$7,fornecedor=$8,numero_colaboradores=$9 WHERE id=$10 RETURNING *`,
      [obra_id, tipo, descricao, valor, data_lancamento, date.getMonth() + 1, date.getFullYear(), fornecedor, numero_colaboradores, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar alojamento' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM alojamento WHERE id=$1', [req.params.id]);
    res.json({ message: 'Registro removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover alojamento' });
  }
});

module.exports = router;
