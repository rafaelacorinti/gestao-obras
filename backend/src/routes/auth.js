const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function getMailer() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

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

// POST /api/auth/register - solicitar acesso (fica pendente)
router.post('/register', [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { nome, email, senha, perfil } = req.body;
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(senha, 10);
    await db.query(
      'INSERT INTO usuarios (nome, email, senha, perfil, ativo) VALUES ($1, $2, $3, $4, false)',
      [nome, email, hash, perfil || 'financeiro']
    );
    res.status(201).json({ message: 'Solicitação enviada! Aguarde aprovação do administrador.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário' });
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

// POST /api/auth/esqueci-senha
router.post('/esqueci-senha', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    const result = await db.query('SELECT id, nome FROM usuarios WHERE email=$1 AND ativo=true', [email]);
    if (!result.rows[0]) return res.json({ message: 'Se o email existir, você receberá as instruções.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 3600000); // 1 hora
    await db.query('UPDATE usuarios SET reset_token=$1, reset_token_expira=$2 WHERE id=$3', [token, expira, result.rows[0].id]);

    const link = `${process.env.FRONTEND_URL || 'https://gestao-obras-6nvu.vercel.app'}/redefinir-senha?token=${token}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await getMailer().sendMail({
        from: `GestaoObras <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Redefinição de senha — GestaoObras',
        html: `<p>Olá, ${result.rows[0].nome}!</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${link}">${link}</a></p><p>Se não solicitou, ignore este email.</p>`
      });
    }
    res.json({ message: 'Se o email existir, você receberá as instruções.', ...(process.env.NODE_ENV !== 'production' && { link }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// POST /api/auth/redefinir-senha
router.post('/redefinir-senha', async (req, res) => {
  try {
    const { token, nova_senha } = req.body;
    if (!token || !nova_senha || nova_senha.length < 6) return res.status(400).json({ error: 'Dados inválidos' });
    const result = await db.query('SELECT id FROM usuarios WHERE reset_token=$1 AND reset_token_expira > NOW()', [token]);
    if (!result.rows[0]) return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' });
    const hash = await bcrypt.hash(nova_senha, 10);
    await db.query('UPDATE usuarios SET senha=$1, reset_token=NULL, reset_token_expira=NULL WHERE id=$2', [hash, result.rows[0].id]);
    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

module.exports = router;
