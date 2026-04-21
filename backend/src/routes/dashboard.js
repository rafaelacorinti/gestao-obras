const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { obra_id, ano, mes } = req.query;
    const currentYear = parseInt(ano) || new Date().getFullYear();
    const currentMonth = parseInt(mes) || new Date().getMonth() + 1;

    // Monta filtro de obra (selecionada no frontend OU restrita pelo perfil)
    const userObras = req.user.obras_ids; // null = vê tudo, array = filtrado
    let obraFilter = '';
    let obraFilterP = ''; // para tabela com alias p
    let obraFilterC = ''; // para tabela com alias c (custos)
    let obraFilterA = ''; // para tabela com alias a (alojamento)
    const extraParams = [];
    let extraIdx = 3; // $1=ano, $2=mes

    if (obra_id) {
      obraFilter = ` AND obra_id = $${extraIdx}`;
      obraFilterP = ` AND obra_id = $${extraIdx}`;
      obraFilterC = ` AND obra_id = $${extraIdx}`;
      obraFilterA = ` AND obra_id = $${extraIdx}`;
      extraParams.push(obra_id);
      extraIdx++;
    } else if (userObras !== null) {
      if (userObras.length === 0) {
        return res.json({
          obras: { total: 0, ativas: 0 }, colaboradores: { total: 0, ativos: 0 },
          metricas: { total_mobilizacao:0, total_passagens:0, total_alojamento:0, total_custos:0, total_geral:0, num_colaboradores:0, media_mob_por_colaborador:0, media_aloj_por_colaborador:0, media_mob_aloj_por_colaborador:0, custo_por_colaborador_mes:0, custo_por_colaborador_dia:0 },
          custos_por_categoria: [], alojamento_por_tipo: [], evolucao_mensal: []
        });
      }
      obraFilter = ` AND obra_id = ANY($${extraIdx})`;
      obraFilterP = ` AND obra_id = ANY($${extraIdx})`;
      obraFilterC = ` AND obra_id = ANY($${extraIdx})`;
      obraFilterA = ` AND obra_id = ANY($${extraIdx})`;
      extraParams.push(userObras);
      extraIdx++;
    }

    const baseParams = [currentYear, currentMonth, ...extraParams];

    const [obras, colaboradores, mob, pass, cust, aloj, evolucao] = await Promise.all([
      userObras !== null
        ? db.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='ativa' THEN 1 END) as ativas FROM obras WHERE id = ANY($1)`, [userObras])
        : db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='ativa' THEN 1 END) as ativas FROM obras"),
      userObras !== null
        ? db.query(`SELECT COUNT(DISTINCT c.id) as total, COUNT(DISTINCT CASE WHEN c.status='ativo' THEN c.id END) as ativos FROM colaboradores c JOIN mobilizacao m ON c.id=m.colaborador_id WHERE m.obra_id = ANY($1)`, [userObras])
        : db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='ativo' THEN 1 END) as ativos FROM colaboradores"),
      db.query(`SELECT COALESCE(SUM(valor_reembolso),0) as total, COUNT(DISTINCT colaborador_id) as num_colaboradores FROM mobilizacao WHERE EXTRACT(YEAR FROM data_mobilizacao)=$1 AND EXTRACT(MONTH FROM data_mobilizacao)=$2${obraFilter}`, baseParams),
      db.query(`SELECT COALESCE(SUM(valor),0) as total FROM passagens WHERE EXTRACT(YEAR FROM data_viagem)=$1 AND EXTRACT(MONTH FROM data_viagem)=$2 AND status!='cancelado'${obraFilterP}`, baseParams),
      db.query(`SELECT categoria, COALESCE(SUM(valor),0) as valor_categoria FROM custos WHERE ano_referencia=$1 AND mes_referencia=$2${obraFilterC} GROUP BY categoria`, baseParams),
      db.query(`SELECT tipo, COALESCE(SUM(valor),0) as valor_tipo FROM alojamento WHERE ano_referencia=$1 AND mes_referencia=$2${obraFilterA} GROUP BY tipo`, baseParams),
      db.query(`SELECT TO_CHAR(date_trunc('month', data_lancamento),'YYYY-MM') as mes, SUM(valor) as total FROM custos WHERE data_lancamento >= NOW() - INTERVAL '12 months'${obraFilterC.replace('$3', '$1').replace('AND obra_id', 'AND obra_id')} GROUP BY date_trunc('month', data_lancamento) ORDER BY 1`,
        obra_id ? [obra_id] : (userObras !== null ? [userObras] : [])
      )
    ]);

    const totalMob = parseFloat(mob.rows[0].total);
    const totalPass = parseFloat(pass.rows[0].total);
    const totalAloj = aloj.rows.reduce((a, r) => a + parseFloat(r.valor_tipo || 0), 0);
    const totalCust = cust.rows.reduce((a, r) => a + parseFloat(r.valor_categoria || 0), 0);
    const totalGeral = totalMob + totalPass + totalAloj + totalCust;
    const numColab = parseInt(mob.rows[0].num_colaboradores) || 1;
    const diasNoMes = new Date(currentYear, currentMonth, 0).getDate();

    res.json({
      obras: obras.rows[0],
      colaboradores: colaboradores.rows[0],
      metricas: {
        total_mobilizacao: totalMob,
        total_passagens: totalPass,
        total_alojamento: totalAloj,
        total_custos: totalCust,
        total_geral: totalGeral,
        num_colaboradores: parseInt(mob.rows[0].num_colaboradores) || 0,
        media_mob_por_colaborador: numColab > 0 ? totalMob / numColab : 0,
        media_aloj_por_colaborador: numColab > 0 ? totalAloj / numColab : 0,
        media_mob_aloj_por_colaborador: numColab > 0 ? (totalMob + totalAloj) / numColab : 0,
        custo_por_colaborador_mes: numColab > 0 ? totalGeral / numColab : 0,
        custo_por_colaborador_dia: numColab > 0 ? totalGeral / numColab / diasNoMes : 0,
      },
      custos_por_categoria: cust.rows,
      alojamento_por_tipo: aloj.rows,
      evolucao_mensal: evolucao.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao calcular dashboard' });
  }
});

router.get('/evolucao', async (req, res) => {
  try {
    const { obra_id, ano } = req.query;
    const year = parseInt(ano) || new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const obraFilter = obra_id ? `AND obra_id='${obra_id}'` : '';

    const [mobilizacao, passagens, custos, alojamento] = await Promise.all([
      db.query(`SELECT EXTRACT(MONTH FROM data_mobilizacao)::int as mes, COALESCE(SUM(valor_reembolso),0) as total FROM mobilizacao WHERE EXTRACT(YEAR FROM data_mobilizacao)=$1 ${obraFilter} GROUP BY 1`, [year]),
      db.query(`SELECT EXTRACT(MONTH FROM data_viagem)::int as mes, COALESCE(SUM(valor),0) as total FROM passagens WHERE EXTRACT(YEAR FROM data_viagem)=$1 AND status!='cancelado' ${obraFilter} GROUP BY 1`, [year]),
      db.query(`SELECT mes_referencia as mes, COALESCE(SUM(valor),0) as total FROM custos WHERE ano_referencia=$1 ${obraFilter} GROUP BY 1`, [year]),
      db.query(`SELECT mes_referencia as mes, COALESCE(SUM(valor),0) as total FROM alojamento WHERE ano_referencia=$1 ${obraFilter} GROUP BY 1`, [year]),
    ]);

    const toMap = (rows) => { const m = {}; rows.forEach(r => { m[r.mes] = parseFloat(r.total); }); return m; };
    const mMob = toMap(mobilizacao.rows), mPass = toMap(passagens.rows), mCust = toMap(custos.rows), mAloj = toMap(alojamento.rows);

    res.json(meses.map(m => ({
      mes: m,
      mobilizacao: mMob[m] || 0,
      passagens: mPass[m] || 0,
      custos: mCust[m] || 0,
      alojamento: mAloj[m] || 0,
      total: (mMob[m] || 0) + (mPass[m] || 0) + (mCust[m] || 0) + (mAloj[m] || 0)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar evolução' });
  }
});

module.exports = router;
