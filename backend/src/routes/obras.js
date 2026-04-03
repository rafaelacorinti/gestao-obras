const express = require('express');
const db = require('../models/db');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT o.*, u.nome as criado_por_nome FROM obras o LEFT JOIN usuarios u ON o.criado_por = u.id WHERE 1=1';
    const params = [];
    let idx = 1;
    if (status) { query += ` AND o.status = $${idx++}`; params.push(status); }
    if (search) { query += ` AND (o.nome ILIKE $${idx} OR o.codigo ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    query += ' ORDER BY o.criado_em DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar obras' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM obras WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Obra não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar obra' });
  }
});

router.post('/', authorize('administrador', 'engenheiro'), async (req, res) => {
  try {
    const { nome, codigo, cliente, endereco, cidade, estado, data_inicio, data_previsao_fim, status, descricao, orcamento } = req.body;
    const result = await db.query(
      `INSERT INTO obras (nome,codigo,cliente,endereco,cidade,estado,data_inicio,data_previsao_fim,status,descricao,orcamento,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [nome, codigo, cliente, endereco, cidade, estado, data_inicio, data_previsao_fim, status || 'ativa', descricao, orcamento || 0, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Código de obra já existe' });
    res.status(500).json({ error: 'Erro ao criar obra' });
  }
});

router.put('/:id', authorize('administrador', 'engenheiro'), async (req, res) => {
  try {
    const { nome, codigo, cliente, endereco, cidade, estado, data_inicio, data_previsao_fim, status, descricao, orcamento } = req.body;
    const result = await db.query(
      `UPDATE obras SET nome=$1,codigo=$2,cliente=$3,endereco=$4,cidade=$5,estado=$6,data_inicio=$7,data_previsao_fim=$8,status=$9,descricao=$10,orcamento=$11 WHERE id=$12 RETURNING *`,
      [nome, codigo, cliente, endereco, cidade, estado, data_inicio, data_previsao_fim, status, descricao, orcamento, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Obra não encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar obra' });
  }
});

router.delete('/:id', authorize('administrador'), async (req, res) => {
  try {
    await db.query('DELETE FROM obras WHERE id=$1', [req.params.id]);
    res.json({ message: 'Obra removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover obra' });
  }
});

module.exports = router;
