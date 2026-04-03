import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { formatCurrency, STATUS_BADGE, CATEGORIAS_CUSTO, TIPOS_ALOJAMENTO } from '../../utils/helpers'
import { Building2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RelatorioObraPage() {
  const [obraId, setObraId] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())

  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ['relatorio-obra', obraId, ano],
    queryFn: () => api.get(`/relatorios/obra/${obraId}`, { params: { ano } }).then(r => r.data),
    enabled: !!obraId
  })

  const graficoData = relatorio ? [
    { nome: 'Mobilização', valor: relatorio.mobilizacao.total },
    { nome: 'Passagens', valor: relatorio.passagens.total },
    ...relatorio.custos.map(c => ({ nome: c.label, valor: c.total })),
    ...relatorio.alojamento.map(a => ({ nome: a.label, valor: a.total })),
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório por Obra</h1>
        <p className="text-gray-500 text-sm">Consolidado de todos os custos de uma obra por ano</p>
      </div>

      {/* Filtros */}
      <div className="card !p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label className="label">Obra</label>
          <select className="input" value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Selecione a obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome} {o.codigo ? `(${o.codigo})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Ano</label>
          <select className="input w-28" value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!obraId ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Building2 size={48} className="text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Selecione uma obra para ver o relatório</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : relatorio ? (
        <div className="space-y-4">
          {/* Header obra */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{relatorio.obra.nome}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {relatorio.obra.cliente && `Cliente: ${relatorio.obra.cliente} | `}
                  {relatorio.obra.cidade && `${relatorio.obra.cidade}/${relatorio.obra.estado} | `}
                  Ano: {relatorio.ano}
                </p>
              </div>
              <span className={`badge ${STATUS_BADGE[relatorio.obra.status]}`}>{relatorio.obra.status}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Mobilização" value={formatCurrency(relatorio.mobilizacao.total)} sub={`${relatorio.mobilizacao.count} registros`} color="blue" />
            <KpiCard label="Passagens" value={formatCurrency(relatorio.passagens.total)} sub={`${relatorio.passagens.count} passagens`} color="sky" />
            <KpiCard label="Alojamento" value={formatCurrency(relatorio.alojamento.reduce((a,r)=>a+r.total,0))} color="purple" />
            <KpiCard label="Total Geral" value={formatCurrency(relatorio.total_geral)} color="red" bold />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Distribuição de Custos</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={graficoData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela detalhada */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Consolidado</h3>
              <div className="space-y-2">
                <LineItem label="Mobilização" value={relatorio.mobilizacao.total} total={relatorio.total_geral} />
                <LineItem label="Passagens" value={relatorio.passagens.total} total={relatorio.total_geral} />
                {relatorio.custos.map(c => <LineItem key={c.categoria} label={c.label} value={c.total} total={relatorio.total_geral} />)}
                {relatorio.alojamento.map(a => <LineItem key={a.tipo} label={a.label} value={a.total} total={relatorio.total_geral} />)}
                <div className="border-t-2 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>TOTAL GERAL</span>
                  <span>{formatCurrency(relatorio.total_geral)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Colaboradores */}
          {relatorio.colaboradores.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Colaboradores Mobilizados ({relatorio.colaboradores.length})</h3>
              <div className="flex flex-wrap gap-2">
                {relatorio.colaboradores.map((c, i) => (
                  <span key={i} className="badge bg-gray-100 text-gray-700 gap-1">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{c.nome?.charAt(0)}</span>
                    {c.nome} {c.funcao ? `(${c.funcao})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function KpiCard({ label, value, sub, color, bold }) {
  const colors = { blue:'border-l-blue-500', sky:'border-l-sky-500', purple:'border-l-purple-500', red:'border-l-red-500' }
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${colors[color]} rounded-xl p-3`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg mt-1 ${bold ? 'font-extrabold' : 'font-bold'} text-gray-900`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function LineItem({ label, value, total }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <div className="w-20 bg-gray-100 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
      <span className="text-sm font-medium text-gray-900 w-24 text-right">{formatCurrency(value)}</span>
    </div>
  )
}
