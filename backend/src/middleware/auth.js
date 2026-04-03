const jwt = require('jsonwebtoken');
const db = require('../models/db');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows[0] || !result.rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado' });
    next(error);
  }
};

const authorize = (...perfis) => (req, res, next) => {
  if (!perfis.includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
  }
  next();
};

module.exports = { authMiddleware, authorize };
