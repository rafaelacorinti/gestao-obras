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

    // Administrador tem acesso total (obras_ids = null)
    if (req.user.perfil === 'administrador') {
      req.user.obras_ids = null;
    } else {
      const obras = await db.query(
        'SELECT obra_id FROM usuario_obras WHERE usuario_id = $1',
        [req.user.id]
      );
      req.user.obras_ids = obras.rows.map(r => r.obra_id);
    }

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

// Helper: retorna filtro SQL e params para obras permitidas
const obrasFilter = (req, paramOffset = 1) => {
  if (req.user.obras_ids === null) return { sql: '', params: [], nextIdx: paramOffset };
  if (req.user.obras_ids.length === 0) return { sql: ' AND 1=0', params: [], nextIdx: paramOffset };
  return {
    sql: ` AND obra_id = ANY($${paramOffset})`,
    params: [req.user.obras_ids],
    nextIdx: paramOffset + 1
  };
};

module.exports = { authMiddleware, authorize, obrasFilter };
