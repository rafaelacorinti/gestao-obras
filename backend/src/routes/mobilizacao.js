const express = require('express');
const db = require('../models/db');
const { authMiddleware, obrasFilter } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { obra_id, colaborador_id, tipo, status, mes, ano } = req.query;
    let query = `SELECT m.*, c.nome as colaborador_nome, c.apelido, c.funcao, o.nome as obra_nome
      FROM mobilizacao m LEFT JOIN colaboradores c ON m.colaborador_id = c.id
      LEFT JOIN obras o ON m.obra_id = o.id WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (obra_id) { query += ` AND m.obra_id = $${idx++}`; params.push(obra_id); }
    if (colaborador_id) { query += ` AND m.colaborador_id = $${idx++}`; params.push(colaborador_id); }
    if (tipo) { query += ` AND m.tipo = $${idx++}`; params.push(tipo); }
    if (status) { query += ` AND m.status = $${idx++}`; params.push(status); }
    if (mes) { query += ` AND EXTRACT(MONTH FROM m.data_mobilizacao) = $${idx++}`; params.push(mes); }
    if (ano) { query += ` AND EXTRACT(YEAR FROM m.data_mobilizacao) = $${idx++}`; params.push(ano); }
    if (req.user.obras_ids !== null) {
      if (req.user.obras_ids.length === 0) return res.json({ data: [], total: 0 });
      query += ` AND m.obra_id = ANY($${idx++})`; params.push(req.user.obras_ids);
    }
    query += ' ORDER BY m.data_mobilizacao DESC';
    const result = await db.query(query, params);
    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.valor_reembolso || 0), 0);
    res.json({ data: result.rows, total });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mobilizações' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { colaborador_id, obra_id, data_mobilizacao, data_desmobilizacao, cidade_origem, estado_origem, cidade_destino, estado_destino, km, valor_reembolso, tipo, status, observacoes } = req.body;
    const result = await db.query(
      `INSERT INTO mobilizacao (colaborador_id,obra_id,data_mobilizacao,data_desmobilizacao,cidade_origem,estado_origem,cidade_destino,estado_destino,km,valor_reembolso,tipo,status,observacoes,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [colaborador_id, obra_id, data_mobilizacao, data_desmobilizacao, cidade_origem, estado_origem, cidade_destino, estado_destino, km || 0, valor_reembolso || 0, tipo || 'mobilizacao', status || 'pendente', observacoes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar mobilização' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { colaborador_id, obra_id, data_mobilizacao, data_desmobilizacao, cidade_origem, estado_origem, cidade_destino, estado_destino, km, valor_reembolso, tipo, status, observacoes } = req.body;
    const result = await db.query(
      `UPDATE mobilizacao SET colaborador_id=$1,obra_id=$2,data_mobilizacao=$3,data_desmobilizacao=$4,cidade_origem=$5,estado_origem=$6,cidade_destino=$7,estado_destino=$8,km=$9,valor_reembolso=$10,tipo=$11,status=$12,observacoes=$13 WHERE id=$14 RETURNING *`,
      [colaborador_id, obra_id, data_mobilizacao, data_desmobilizacao, cidade_origem, estado_origem, cidade_destino, estado_destino, km, valor_reembolso, tipo, status, observacoes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar mobilização' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM mobilizacao WHERE id=$1', [req.params.id]);
    res.json({ message: 'Registro removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover mobilização' });
  }
});

module.exports = router;
