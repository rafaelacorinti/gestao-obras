const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha obrigatória')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, senha } = req.body;
    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, perfil: user.perfil },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

// PUT /api/auth/senha - trocar propria senha
router.put('/senha', authMiddleware, [
  body('senha_atual').notEmpty().withMessage('Senha atual obrigatória'),
  body('nova_senha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { senha_atual, nova_senha } = req.body;
    const result = await db.query('SELECT senha FROM usuarios WHERE id = $1', [req.user.id]);
    const valida = await bcrypt.compare(senha_atual, result.rows[0].senha);
    if (!valida) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(nova_senha, 10);
    await db.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
