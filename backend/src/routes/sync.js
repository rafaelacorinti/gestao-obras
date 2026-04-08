const express = require('express');
const https = require('https');
const db = require('../models/db');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();

const SHEET_ID = '1BEkgBGgHRRQ596Nq2kTrg6vmaer5f50Rgxpw7UAQiHs';
const SHEET_GID = '1387583830'; // aba MOBILIZAÇÃO
const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET || 'gestao-obras-sync-2024';

// Garante que as colunas extras existem na tabela mobilizacao
async function ensureExtraColumns() {
  const extras = [
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS valor_km NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS reembolso_inicial NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS cidade_origem_secundaria VARCHAR(100)',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS estado_origem_secundaria VARCHAR(50)',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS cidade_destino_secundaria VARCHAR(100)',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS estado_destino_secundaria VARCHAR(50)',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS reembolso_secundario NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS data_saida TIMESTAMP',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS data_chegada TIMESTAMP',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS dias_viagem INTEGER DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS valor_refeicao NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS total_reembolso NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS valor_viagem NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS total_despesas NUMERIC(10,2) DEFAULT 0',
    'ALTER TABLE mobilizacao ADD COLUMN IF NOT EXISTS sheets_row_id VARCHAR(255) UNIQUE',
  ];
  for (const sql of extras) {
    try { await db.query(sql); } catch (_) {}
  }
}

// Fetch CSV da planilha pública
function fetchSheetCSV() {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Segue redirect
        https.get(res.headers.location, (r2) => {
          let data = '';
          r2.on('data', chunk => data += chunk);
          r2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parser CSV simples com suporte a campos entre aspas
function parseCSV(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  });
}

// Converte valor BR para número
function parseMoney(v) {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Converte data BR DD/MM/YYYY para ISO
function parseDate(v) {
  if (!v || v.trim() === '') return null;
  // Formato DD/MM/YYYY HH:MM ou DD/MM/YYYY
  const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const year = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${year}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

// Lógica principal de sincronização
async function syncMobilizacao(obraId = null) {
  await ensureExtraColumns();

  const csv = await fetchSheetCSV();
  const rows = parseCSV(csv);

  // Encontra a linha de cabeçalho (contém "NOME")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i].some(c => c.toUpperCase().includes('NOME'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Cabeçalho não encontrado na planilha');

  const dataRows = rows.slice(headerIdx + 1);

  let criados = 0, atualizados = 0, ignorados = 0;

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const r = dataRows[rowIdx];
    const nome = r[0]?.replace(/"/g, '').trim();
    if (!nome || nome.toUpperCase() === 'NOME') { ignorados++; continue; }

    // Mapeamento de colunas conforme estrutura da planilha
    const apelido       = r[1]?.replace(/"/g, '').trim() || null;
    const indicacao     = r[2]?.replace(/"/g, '').trim() || null;
    const admissaoRaw   = r[3]?.replace(/"/g, '').trim() || null;
    const funcao        = r[4]?.replace(/"/g, '').trim() || null;
    const dnRaw         = r[5]?.replace(/"/g, '').trim() || null;
    const rg            = r[6]?.replace(/"/g, '').trim() || null;
    const cpf           = r[7]?.replace(/"/g, '').replace(/\D/g, '').trim() || null;
    const telefone      = r[8]?.replace(/"/g, '').trim() || null;
    const cidadeOrig    = r[9]?.replace(/"/g, '').trim() || null;
    const estadoOrig    = r[10]?.replace(/"/g, '').trim() || null;
    const cidadeDest    = r[11]?.replace(/"/g, '').trim() || null;
    const estadoDest    = r[12]?.replace(/"/g, '').trim() || null;
    const km            = parseMoney(r[13]);
    const valorKm       = parseMoney(r[14]);
    const reembolsoIni  = parseMoney(r[15]);
    const cidadeOrigSec = r[16]?.replace(/"/g, '').trim() || null;
    const estadoOrigSec = r[17]?.replace(/"/g, '').trim() || null;
    const cidadeDestSec = r[18]?.replace(/"/g, '').trim() || null;
    const estadoDestSec = r[19]?.replace(/"/g, '').trim() || null;
    const reembolsoSec  = parseMoney(r[20]);
    const dataSaidaRaw  = r[21]?.replace(/"/g, '').trim() || null;
    const dataChegadaRaw= r[22]?.replace(/"/g, '').trim() || null;
    const diasViagem    = parseInt(r[23]) || 0;
    const valorRefeicao = parseMoney(r[24]);
    const totalReemb    = parseMoney(r[25]);
    const valorViagem   = parseMoney(r[26]);
    const totalDespesas = parseMoney(r[27]);

    // Status do colaborador
    const statusColaborador = admissaoRaw === 'TRANSFERIDO' || admissaoRaw === 'DEMISSIONAL'
      ? 'inativo' : 'ativo';
    const dataAdmissao = statusColaborador === 'ativo' ? parseDate(admissaoRaw) : null;
    const dataNascimento = parseDate(dnRaw);
    const dataSaida = parseDate(dataSaidaRaw);
    const dataChegada = parseDate(dataChegadaRaw);

    // Sheets row id para deduplicação: usa nome+rowIdx
    const sheetsRowId = `mob_${SHEET_GID}_row_${headerIdx + 1 + rowIdx}`;

    try {
      // Upsert colaborador (por CPF se disponível, senão por nome)
      let colaboradorId = null;
      if (cpf && cpf.length >= 11) {
        const res = await db.query(
          `INSERT INTO colaboradores (nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, cidade_origem, estado_origem, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (cpf) DO UPDATE SET
             nome=EXCLUDED.nome, apelido=EXCLUDED.apelido, funcao=EXCLUDED.funcao,
             status=EXCLUDED.status, telefone=EXCLUDED.telefone, atualizado_em=NOW()
           RETURNING id`,
          [nome, apelido, indicacao, dataAdmissao, funcao, dataNascimento, rg, cpf, telefone, cidadeOrig, estadoOrig, statusColaborador]
        );
        colaboradorId = res.rows[0].id;
      } else {
        // Sem CPF: busca por nome exato ou insere
        const existe = await db.query('SELECT id FROM colaboradores WHERE nome = $1 LIMIT 1', [nome]);
        if (existe.rows[0]) {
          colaboradorId = existe.rows[0].id;
          await db.query(
            `UPDATE colaboradores SET apelido=$1, funcao=$2, status=$3, telefone=$4, atualizado_em=NOW() WHERE id=$5`,
            [apelido, funcao, statusColaborador, telefone, colaboradorId]
          );
        } else {
          const ins = await db.query(
            `INSERT INTO colaboradores (nome, apelido, indicacao, data_admissao, funcao, data_nascimento, rg, cpf, telefone, cidade_origem, estado_origem, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [nome, apelido, indicacao, dataAdmissao, funcao, dataNascimento, rg, cpf || null, telefone, cidadeOrig, estadoOrig, statusColaborador]
          );
          colaboradorId = ins.rows[0].id;
        }
      }

      // Upsert mobilização pela sheets_row_id
      const dataMob = dataSaida || dataAdmissao || new Date().toISOString().split('T')[0];

      await db.query(
        `INSERT INTO mobilizacao (
          colaborador_id, obra_id, data_mobilizacao, data_desmobilizacao,
          cidade_origem, estado_origem, cidade_destino, estado_destino,
          km, valor_reembolso, tipo, status,
          valor_km, reembolso_inicial,
          cidade_origem_secundaria, estado_origem_secundaria,
          cidade_destino_secundaria, estado_destino_secundaria, reembolso_secundario,
          data_saida, data_chegada, dias_viagem, valor_refeicao,
          total_reembolso, valor_viagem, total_despesas, sheets_row_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'mobilizacao','aprovado',
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
        )
        ON CONFLICT (sheets_row_id) DO UPDATE SET
          colaborador_id=EXCLUDED.colaborador_id,
          obra_id=EXCLUDED.obra_id,
          data_mobilizacao=EXCLUDED.data_mobilizacao,
          cidade_origem=EXCLUDED.cidade_origem, estado_origem=EXCLUDED.estado_origem,
          cidade_destino=EXCLUDED.cidade_destino, estado_destino=EXCLUDED.estado_destino,
          km=EXCLUDED.km, valor_reembolso=EXCLUDED.valor_reembolso,
          valor_km=EXCLUDED.valor_km, reembolso_inicial=EXCLUDED.reembolso_inicial,
          cidade_origem_secundaria=EXCLUDED.cidade_origem_secundaria,
          estado_origem_secundaria=EXCLUDED.estado_origem_secundaria,
          cidade_destino_secundaria=EXCLUDED.cidade_destino_secundaria,
          estado_destino_secundaria=EXCLUDED.estado_destino_secundaria,
          reembolso_secundario=EXCLUDED.reembolso_secundario,
          data_saida=EXCLUDED.data_saida, data_chegada=EXCLUDED.data_chegada,
          dias_viagem=EXCLUDED.dias_viagem, valor_refeicao=EXCLUDED.valor_refeicao,
          total_reembolso=EXCLUDED.total_reembolso, valor_viagem=EXCLUDED.valor_viagem,
          total_despesas=EXCLUDED.total_despesas, atualizado_em=NOW()`,
        [
          colaboradorId, obraId, dataMob, dataChegada,
          cidadeOrig, estadoOrig, cidadeDest, estadoDest,
          km, reembolsoIni + reembolsoSec,
          valorKm, reembolsoIni,
          cidadeOrigSec, estadoOrigSec, cidadeDestSec, estadoDestSec, reembolsoSec,
          dataSaida, dataChegada, diasViagem, valorRefeicao,
          totalReemb, valorViagem, totalDespesas, sheetsRowId
        ]
      );

      // Verifica se era insert ou update
      criados++;
    } catch (err) {
      console.error(`Erro na linha ${rowIdx + 2}:`, err.message);
      ignorados++;
    }
  }

  return { criados, atualizados, ignorados, total: dataRows.length };
}

// ─── ROTA: Sync manual (admin autenticado) ───────────────────────────────────
router.post('/mobilizacao', authMiddleware, authorize('administrador'), async (req, res) => {
  try {
    const { obra_id } = req.body;
    const resultado = await syncMobilizacao(obra_id || null);
    res.json({ success: true, mensagem: 'Sincronização concluída', ...resultado });
  } catch (err) {
    console.error('Erro sync mobilizacao:', err);
    res.status(500).json({ error: 'Erro ao sincronizar: ' + err.message });
  }
});

// ─── ROTA: Webhook (chamado pelo Google Apps Script) ─────────────────────────
// Não requer JWT — usa secret próprio
router.post('/webhook', async (req, res) => {
  const { token, obra_id } = req.body;
  if (token !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  // Responde imediatamente para não travar o Apps Script
  res.json({ success: true, mensagem: 'Sync iniciado em background' });

  // Roda sync em background
  syncMobilizacao(obra_id || null)
    .then(r => console.log('Sync via webhook concluído:', r))
    .catch(e => console.error('Erro sync webhook:', e));
});

// ─── ROTA: Status da última sync ─────────────────────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT COUNT(*) as total, MAX(atualizado_em) as ultima_sync
       FROM mobilizacao WHERE sheets_row_id IS NOT NULL`
    );
    res.json({
      registros_sincronizados: parseInt(r.rows[0].total),
      ultima_sync: r.rows[0].ultima_sync
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
