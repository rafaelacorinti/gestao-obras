require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/models/db');

bcrypt.hash('Admin@123', 10).then(hash => {
  console.log('Hash gerado:', hash);
  return db.query('UPDATE usuarios SET senha = $1 WHERE email = $2', [hash, 'admin@gestao.com']);
}).then(r => {
  console.log('Senha atualizada! Linhas afetadas:', r.rowCount);
  process.exit(0);
}).catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
