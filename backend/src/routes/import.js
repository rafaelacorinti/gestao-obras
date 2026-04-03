const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) return cb(new Error('Apenas .xlsx, .xls e .csv permitidos'));
    cb(null, true);
  },
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const wb = XLSX.readFile(req.file.path);
    const result = {};
    wb.SheetNames.forEach(name => {
      const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
      if (data.length > 0) result[name] = { headers: data[0], preview: data.slice(1, 6), totalRows: data.length - 1 };
    });
    fs.unlinkSync(req.file.path);
    const detected = detectType(result);
    res.json({ sheets: result, detectedType: detected, fileName: req.file.originalname });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

router.post('/execute', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const { tipo, sheetName, mapeamento, obra_id } = req.body;
    const map = typeof mapeamento === 'string' ? JSON.parse(mapeamento) : mapeamento;
    const wb = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName || wb.SheetNames[0]], { defval: '' });
    let importados = 0;
    const erros = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        if (tipo === 'passagens') await importarPassagem(rows[i], map, obra_id, req.user.id, req.file.originalname);
        else if (tipo === 'mobilizacao') await importarMobilizacao(rows[i], map, obra_id, req.user.id);
        else if (tipo === 'colaboradores') await importarColaborador(rows[i], map);
        else if (tipo === 'custos') await importarCusto(rows[i], map, obra_id, req.user.id, req.file.originalname);
        importados++;
      } catch (err) { erros.push({ linha: i + 2, erro: err.message }); }
    }
    fs.unlinkSync(req.file.path);
    res.json({ importados, erros, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro na importação: ' + error.message });
  }
});

const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === 'number') return new Date((v - 25569) * 86400 * 1000).toISOString().split('T')[0];
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  return null;
};
const parseNum = (v) => parseFloat(String(v || '0').replace(',', '.')) || 0;

async function importarPassagem(row, map, obra_id, userId, arquivo) {
  const g = (f) => row[map[f]] || null;
  const valor = parseNum(g('valor'));
  const colaborador_id = await findColaborador(g('colaborador'));
  await db.query(
    `INSERT INTO passagens (colaborador_id,obra_id,data_compra,data_viagem,valor,parcelas,empresa,cartao_utilizado,origem,destino,importado_de,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
    [colaborador_id, obra_id, parseDate(g('data_compra')), parseDate(g('data_viagem')), valor, parseInt(g('parcelas')) || 1, g('empresa'), g('cartao_utilizado'), g('origem'), g('destino'), arquivo, userId]
  );
}

async function importarMobilizacao(row, map, obra_id, userId) {
  const g = (f) => row[map[f]] || null;
  const colaborador_id = await findColaborador(g('colaborador') || g('nome'));
  await db.query(
    `INSERT INTO mobilizacao (colaborador_id,obra_id,data_mobilizacao,cidade_origem,estado_origem,cidade_destino,estado_destino,km,valor_reembolso,tipo,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [colaborador_id, obra_id, parseDate(g('data_mobilizacao')), g('cidade_origem'), g('estado_origem'), g('cidade_destino'), g('estado_destino'), parseNum(g('km')), parseNum(g('valor_reembolso')), g('tipo') || 'mobilizacao', userId]
  );
}

async function importarColaborador(row, map) {
  const g = (f) => row[map[f]] || null;
  if (!g('cpf')) return;
  await db.query(
    `INSERT INTO colaboradores (nome,apelido,indicacao,data_admissao,funcao,data_nascimento,rg,cpf,telefone,cidade_origem,estado_origem,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ativo') ON CONFLICT (cpf) DO UPDATE SET nome=EXCLUDED.nome, funcao=EXCLUDED.funcao`,
    [g('nome'), g('apelido'), g('indicacao'), parseDate(g('data_admissao')), g('funcao'), parseDate(g('data_nascimento')), g('rg'), g('cpf'), g('telefone'), g('cidade_origem'), g('estado_origem')]
  );
}

async function importarCusto(row, map, obra_id, userId, arquivo) {
  const g = (f) => row[map[f]] || null;
  const valor = parseNum(g('valor'));
  if (!valor) return;
  const data = parseDate(g('data_lancamento')) || new Date().toISOString().split('T')[0];
  const d = new Date(data);
  await db.query(
    `INSERT INTO custos (obra_id,categoria,subcategoria,descricao,valor,data_lancamento,mes_referencia,ano_referencia,importado_de,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [obra_id, g('categoria') || 'outros', g('subcategoria'), g('descricao'), valor, data, d.getMonth() + 1, d.getFullYear(), arquivo, userId]
  );
}

async function findColaborador(nome) {
  if (!nome) return null;
  const r = await db.query('SELECT id FROM colaboradores WHERE nome ILIKE $1 OR apelido ILIKE $1 LIMIT 1', [nome]);
  return r.rows[0]?.id || null;
}

function detectType(sheets) {
  const headers = Object.values(sheets).flatMap(s => s.headers.map(h => String(h).toLowerCase()));
  if (headers.some(h => h.includes('empresa') || h.includes('passagem'))) return 'passagens';
  if (headers.some(h => h.includes('reembolso') || h.includes('trajeto'))) return 'mobilizacao';
  if (headers.some(h => h.includes('cpf') || h.includes('rg'))) return 'colaboradores';
  if (headers.some(h => h.includes('categoria') || h.includes('custo'))) return 'custos';
  return null;
}

module.exports = router;
