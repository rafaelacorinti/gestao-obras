const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users
router.get('/', authorize('administrador'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY ativo DESC, nome'
    );

    // Buscar obras de cada usuário separadamente
    const obrasPorUsuario = {};
    for (const u of result.rows) {
      try {
        const uo = await db.query(
          `SELECT uo.obra_id, o.nome as obra_nome 
           FROM usuario_obras uo 
           LEFT JOIN obras o ON o.id::text = uo.obra_id::text 
           WHERE uo.usuario_id::text = $1`,
          [String(u.id)]
        );
        obrasPorUsuario[u.id] = uo.rows.map(r => ({ id: r.obra_id, nome: r.obra_nome }));
      } catch {
        obrasPorUsuario[u.id] = [];
      }
    }

    const usuarios = result.rows.map(u => ({
      ...u,
      obras_permitidas: obrasPorUsuario[u.id] || []
    }));
    res.json(usuarios);
  } catch (error) {
    console.error('Erro GET /users:', error.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST /api/users
router.post('/', authorize('administrador'), async (req, res) => {
  try {
    const { nome, email, senha, perfil, obras_ids } = req.body;
    if (!nome || !email || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    const hash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES ($1,$2,$3,$4) RETURNING id, nome, email, perfil, ativo',
      [nome, email, hash, perfil]
    );
    const userId = result.rows[0].id;
    if (obras_ids && obras_ids.length > 0) {
      for (const oId of obras_ids) {
        await db.query('INSERT INTO usuario_obras (usuario_id, obra_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, oId]);
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id
router.put('/:id', authorize('administrador'), async (req, res) => {
  try {
    const atual = await db.query('SELECT * FROM usuarios WHERE id=$1', [req.params.id]);
    if (!atual.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    const u = atual.rows[0];
    const nome = req.body.nome ?? u.nome;
    const email = req.body.email ?? u.email;
    const perfil = req.body.perfil ?? u.perfil;
    const ativo = req.body.ativo ?? u.ativo;

    const result = await db.query(
      'UPDATE usuarios SET nome=$1, email=$2, perfil=$3, ativo=$4 WHERE id=$5 RETURNING id, nome, email, perfil, ativo',
      [nome, email, perfil, ativo, req.params.id]
    );

    // Sincronizar obras permitidas se informadas
    if (req.body.obras_ids !== undefined) {
      await db.query('DELETE FROM usuario_obras WHERE usuario_id=$1', [req.params.id]);
      for (const oId of (req.body.obras_ids || [])) {
        await db.query('INSERT INTO usuario_obras (usuario_id, obra_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, oId]);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// PUT /api/users/:id/senha
router.put('/:id/senha', authorize('administrador'), async (req, res) => {
  try {
    const { nova_senha } = req.body;
    if (!nova_senha || nova_senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
    const hash = await bcrypt.hash(nova_senha, 10);
    await db.query('UPDATE usuarios SET senha=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authorize('administrador'), async (req, res) => {
  try {
    if (req.params.id === String(req.user.id)) return res.status(400).json({ error: 'Não é possível remover seu próprio usuário' });
    const atual = await db.query('SELECT ativo FROM usuarios WHERE id=$1', [req.params.id]);
    if (!atual.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!atual.rows[0].ativo) {
      await db.query('DELETE FROM usuarios WHERE id=$1', [req.params.id]);
    } else {
      await db.query('UPDATE usuarios SET ativo=false WHERE id=$1', [req.params.id]);
    }
    res.json({ message: 'Operação realizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

module.exports = router;
