const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { status, search, funcao } = req.query;
    let query = 'SELECT * FROM colaboradores WHERE 1=1';
    const params = [];
    let idx = 1;
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    if (funcao) { query += ` AND funcao ILIKE $${idx++}`; params.push(`%${funcao}%`); }
    if (search) { query += ` AND (nome ILIKE $${idx} OR apelido ILIKE $${idx} OR cpf ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    // Filtrar por obras permitidas do usuário
    if (req.user.obras_ids !== null) {
      if (req.user.obras_ids.length === 0) return res.json([]);
      query += ` AND id IN (SELECT DISTINCT colaborador_id FROM mobilizacao WHERE obra_id = ANY($${idx++}))`;
      params.push(req.user.obras_ids);
    }
    query += ' ORDER BY nome';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
});

// GET /api/colaboradores/:id - com historico completo
router.get('/:id', async (req, res) => {
  try {
    const col = await db.query('SELECT * FROM colaboradores WHERE id = $1', [req.params.id]);
    if (!col.rows[0]) return res.status(404).json({ error: 'Colaborador não encontrado' });

    const [mobilizacoes, passagens, custos] = await Promise.all([
      db.query(`SELECT m.*, o.nome as obra_nome FROM mobilizacao m LEFT JOIN obras o ON m.obra_id = o.id WHERE m.colaborador_id = $1 ORDER BY m.data_mobilizacao DESC`, [req.params.id]),
      db.query(`SELECT p.*, o.nome as obra_nome FROM passagens p LEFT JOIN obras o ON p.obra_id = o.id WHERE p.colaborador_id = $1 ORDER BY p.data_viagem DESC`, [req.params.id]),
      db.query(`SELECT c.*, o.nome as obra_nome FROM custos c LEFT JOIN obras o ON c.obra_id = o.id WHERE c.colaborador_id = $1 ORDER BY c.data_lancamento DESC`, [req.params.id])
    ]);

    const totalMob = mobilizacoes.rows.reduce((a, r) => a + parseFloat(r.valor_reembolso || 0), 0);
    const totalPass = passagens.rows.reduce((a, r) => a + parseFloat(r.valor || 0), 0);
    const totalCustos = custos.rows.reduce((a, r) => a + parseFloat(r.valor || 0), 0);

    res.json({
      ...col.rows[0],
      mobilizacoes: mobilizacoes.rows,
      passagens: passagens.rows,
      custos: custos.rows,
      totais: { mobilizacao: totalMob, passagens: totalPass, custos: totalCustos, geral: totalMob + totalPass + totalCustos }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar colaborador' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, email, cidade_origem, estado_origem, status, observacoes } = req.body;
    const result = await db.query(
      `INSERT INTO colaboradores (nome,apelido,indicacao,data_admissao,funcao,data_nascimento,rg,cpf,telefone,email,cidade_origem,estado_origem,status,observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, email, cidade_origem, estado_origem, status || 'ativo', observacoes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'CPF já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar colaborador' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, email, cidade_origem, estado_origem, status, observacoes } = req.body;
    const result = await db.query(
      `UPDATE colaboradores SET nome=$1,apelido=$2,indicacao=$3,data_admissao=$4,funcao=$5,data_nascimento=$6,rg=$7,cpf=$8,telefone=$9,email=$10,cidade_origem=$11,estado_origem=$12,status=$13,observacoes=$14 WHERE id=$15 RETURNING *`,
      [nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, email, cidade_origem, estado_origem, status, observacoes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar colaborador' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query("UPDATE colaboradores SET status='inativo' WHERE id=$1", [req.params.id]);
    res.json({ message: 'Colaborador inativado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao inativar colaborador' });
  }
});

module.exports = router;
