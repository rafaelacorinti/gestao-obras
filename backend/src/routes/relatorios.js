const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const CATEGORIAS = { mobilizacao_passagens:'Mobilização/Passagens', desmobilizacao:'Desmobilização', folga_campo:'Folga de Campo', alimentacao_vr_va:'Alimentação VR/VA', exames:'Exames', compra_folga:'Compra de Folga', outros:'Outros' };
const ALOJAMENTO = { aluguel:'Aluguel', agua_energia_internet:'Água/Energia/Internet', mao_de_obra:'Mão de Obra', material_limpeza:'Material de Limpeza', outros:'Outros' };

// GET /api/relatorios/mensal
router.get('/mensal', async (req, res) => {
  try {
    const { obra_id, mes, ano, formato } = req.query;
    const m = parseInt(mes) || new Date().getMonth() + 1;
    const y = parseInt(ano) || new Date().getFullYear();
    const params = [y, m];
    const obraFilter = obra_id ? ` AND obra_id = $3` : '';
    if (obra_id) params.push(obra_id);

    const [cust, aloj, mob, pass, obraInfo] = await Promise.all([
      db.query(`SELECT categoria, SUM(valor) as total FROM custos WHERE ano_referencia=$1 AND mes_referencia=$2${obraFilter} GROUP BY categoria`, params),
      db.query(`SELECT tipo, SUM(valor) as total FROM alojamento WHERE ano_referencia=$1 AND mes_referencia=$2${obraFilter} GROUP BY tipo`, params),
      db.query(`SELECT COALESCE(SUM(valor_reembolso),0) as total, COUNT(DISTINCT colaborador_id) as colaboradores FROM mobilizacao WHERE EXTRACT(YEAR FROM data_mobilizacao)=$1 AND EXTRACT(MONTH FROM data_mobilizacao)=$2${obraFilter}`, params),
      db.query(`SELECT COALESCE(SUM(valor),0) as total FROM passagens WHERE EXTRACT(YEAR FROM data_viagem)=$1 AND EXTRACT(MONTH FROM data_viagem)=$2 AND status!='cancelado'${obraFilter}`, params),
      obra_id ? db.query('SELECT nome FROM obras WHERE id=$1', [obra_id]) : { rows: [] }
    ]);

    const relatorio = {
      periodo: { mes: m, ano: y },
      obra: obraInfo.rows[0]?.nome || 'Todas as obras',
      mobilizacao: { total: parseFloat(mob.rows[0].total), colaboradores: parseInt(mob.rows[0].colaboradores) },
      passagens: { total: parseFloat(pass.rows[0].total) },
      custos: cust.rows.map(r => ({ categoria: r.categoria, label: CATEGORIAS[r.categoria] || r.categoria, total: parseFloat(r.total) })),
      alojamento: aloj.rows.map(r => ({ tipo: r.tipo, label: ALOJAMENTO[r.tipo] || r.tipo, total: parseFloat(r.total) })),
    };
    relatorio.total_geral = relatorio.mobilizacao.total + relatorio.passagens.total +
      relatorio.custos.reduce((a, r) => a + r.total, 0) + relatorio.alojamento.reduce((a, r) => a + r.total, 0);

    if (formato === 'excel') return exportarExcel(res, relatorio);
    if (formato === 'pdf') return exportarPDF(res, relatorio);
    res.json(relatorio);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// GET /api/relatorios/colaborador/:id
router.get('/colaborador/:id', async (req, res) => {
  try {
    const { ano } = req.query;
    const y = parseInt(ano) || new Date().getFullYear();
    const col = await db.query('SELECT * FROM colaboradores WHERE id=$1', [req.params.id]);
    if (!col.rows[0]) return res.status(404).json({ error: 'Colaborador não encontrado' });

    const [mob, pass, cust] = await Promise.all([
      db.query(`SELECT m.*, o.nome as obra_nome FROM mobilizacao m LEFT JOIN obras o ON m.obra_id=o.id WHERE m.colaborador_id=$1 AND EXTRACT(YEAR FROM m.data_mobilizacao)=$2 ORDER BY m.data_mobilizacao DESC`, [req.params.id, y]),
      db.query(`SELECT p.*, o.nome as obra_nome FROM passagens p LEFT JOIN obras o ON p.obra_id=o.id WHERE p.colaborador_id=$1 AND EXTRACT(YEAR FROM p.data_viagem)=$2 ORDER BY p.data_viagem DESC`, [req.params.id, y]),
      db.query(`SELECT c.*, o.nome as obra_nome FROM custos c LEFT JOIN obras o ON c.obra_id=o.id WHERE c.colaborador_id=$1 AND c.ano_referencia=$2 ORDER BY c.data_lancamento DESC`, [req.params.id, y])
    ]);

    res.json({
      colaborador: col.rows[0],
      ano: y,
      mobilizacoes: mob.rows,
      passagens: pass.rows,
      custos: cust.rows,
      totais: {
        mobilizacao: mob.rows.reduce((a, r) => a + parseFloat(r.valor_reembolso || 0), 0),
        passagens: pass.rows.reduce((a, r) => a + parseFloat(r.valor || 0), 0),
        custos: cust.rows.reduce((a, r) => a + parseFloat(r.valor || 0), 0),
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório por colaborador' });
  }
});

// GET /api/relatorios/obra/:id
router.get('/obra/:id', async (req, res) => {
  try {
    const { ano } = req.query;
    const y = parseInt(ano) || new Date().getFullYear();
    const obra = await db.query('SELECT * FROM obras WHERE id=$1', [req.params.id]);
    if (!obra.rows[0]) return res.status(404).json({ error: 'Obra não encontrada' });

    const [mob, pass, cust, aloj, colabs] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(valor_reembolso),0) as total, COUNT(*) as count FROM mobilizacao WHERE obra_id=$1 AND EXTRACT(YEAR FROM data_mobilizacao)=$2`, [req.params.id, y]),
      db.query(`SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as count FROM passagens WHERE obra_id=$1 AND EXTRACT(YEAR FROM data_viagem)=$2 AND status!='cancelado'`, [req.params.id, y]),
      db.query(`SELECT categoria, COALESCE(SUM(valor),0) as total FROM custos WHERE obra_id=$1 AND ano_referencia=$2 GROUP BY categoria`, [req.params.id, y]),
      db.query(`SELECT tipo, COALESCE(SUM(valor),0) as total FROM alojamento WHERE obra_id=$1 AND ano_referencia=$2 GROUP BY tipo`, [req.params.id, y]),
      db.query(`SELECT DISTINCT c.nome, c.funcao, c.status FROM colaboradores c JOIN mobilizacao m ON c.id=m.colaborador_id WHERE m.obra_id=$1 ORDER BY c.nome`, [req.params.id])
    ]);

    const totalMob = parseFloat(mob.rows[0].total);
    const totalPass = parseFloat(pass.rows[0].total);
    const totalCust = cust.rows.reduce((a, r) => a + parseFloat(r.total), 0);
    const totalAloj = aloj.rows.reduce((a, r) => a + parseFloat(r.total), 0);

    res.json({
      obra: obra.rows[0],
      ano: y,
      mobilizacao: { total: totalMob, count: parseInt(mob.rows[0].count) },
      passagens: { total: totalPass, count: parseInt(pass.rows[0].count) },
      custos: cust.rows.map(r => ({ categoria: r.categoria, label: CATEGORIAS[r.categoria] || r.categoria, total: parseFloat(r.total) })),
      alojamento: aloj.rows.map(r => ({ tipo: r.tipo, label: ALOJAMENTO[r.tipo] || r.tipo, total: parseFloat(r.total) })),
      colaboradores: colabs.rows,
      total_geral: totalMob + totalPass + totalCust + totalAloj
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório por obra' });
  }
});

async function exportarExcel(res, relatorio) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Relatório Mensal');
  ws.addRow(['GESTÃO DE OBRAS - RELATÓRIO MENSAL']);
  ws.addRow([`Período: ${String(relatorio.periodo.mes).padStart(2,'0')}/${relatorio.periodo.ano}`]);
  ws.addRow([`Obra: ${relatorio.obra}`]);
  ws.addRow([]);
  ws.addRow(['RESUMO', 'VALOR']);
  ws.addRow(['Mobilização', relatorio.mobilizacao.total]);
  ws.addRow(['Passagens', relatorio.passagens.total]);
  relatorio.custos.forEach(c => ws.addRow([c.label, c.total]));
  relatorio.alojamento.forEach(a => ws.addRow([a.label, a.total]));
  ws.addRow([]);
  ws.addRow(['TOTAL GERAL', relatorio.total_geral]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-${relatorio.periodo.ano}-${relatorio.periodo.mes}.xlsx"`);
  await wb.xlsx.write(res);
}

async function exportarPDF(res, relatorio) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio.pdf"`);
  doc.pipe(res);
  const fmt = (v) => `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  doc.fontSize(18).font('Helvetica-Bold').text('GESTÃO DE OBRAS', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text(`Relatório Mensal - ${String(relatorio.periodo.mes).padStart(2,'0')}/${relatorio.periodo.ano}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Obra: ${relatorio.obra}`);
  doc.text(`Colaboradores no período: ${relatorio.mobilizacao.colaboradores}`);
  doc.moveDown();
  doc.fontSize(13).font('Helvetica-Bold').text('CUSTOS');
  doc.font('Helvetica').fontSize(11);
  doc.text(`Mobilização: ${fmt(relatorio.mobilizacao.total)}`);
  doc.text(`Passagens: ${fmt(relatorio.passagens.total)}`);
  relatorio.custos.forEach(c => doc.text(`${c.label}: ${fmt(c.total)}`));
  doc.moveDown();
  doc.fontSize(13).font('Helvetica-Bold').text('ALOJAMENTO');
  doc.font('Helvetica').fontSize(11);
  relatorio.alojamento.forEach(a => doc.text(`${a.label}: ${fmt(a.total)}`));
  doc.moveDown();
  doc.fontSize(14).font('Helvetica-Bold').fillColor('blue').text(`TOTAL GERAL: ${fmt(relatorio.total_geral)}`);
  doc.end();
}

module.exports = router;
