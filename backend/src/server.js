const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Segurança
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gestao-obras-6nvu.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});

// Rate limiting específico para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

app.use(globalLimiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/obras', require('./routes/obras'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/mobilizacao', require('./routes/mobilizacao'));
app.use('/api/passagens', require('./routes/passagens'));
app.use('/api/custos', require('./routes/custos'));
app.use('/api/alojamento', require('./routes/alojamento'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/import', require('./routes/import'));
app.use('/api/relatorios', require('./routes/relatorios'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Handler de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // Keep-alive: evita que o Render durma (ping a cada 14 minutos)
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const https = require('https');
    setInterval(() => {
      https.get(`${process.env.RENDER_EXTERNAL_URL}/health`, (r) => {
        console.log(`Keep-alive ping: ${r.statusCode}`);
      }).on('error', () => {});
    }, 14 * 60 * 1000);
  }
});
module.exports = app;
