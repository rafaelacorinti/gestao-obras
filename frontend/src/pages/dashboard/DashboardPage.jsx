import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../services/api'
import { formatCurrency, MESES } from '../../utils/helpers'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Users, Building2, Plane, DollarSign, Home } from 'lucide-react'

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [obraId, setObraId] = useState('')

  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', mes, ano, obraId],
    queryFn: () => api.get('/dashboard', { params: { mes, ano, obra_id: obraId } }).then(r => r.data)
  })

  const { data: evolucao } = useQuery({
    queryKey: ['evolucao', ano, obraId],
    queryFn: () => api.get('/dashboard/evolucao', { params: { ano, obra_id: obraId } }).then(r => r.data)
  })

  const evolucaoFormatada = (evolucao || []).map(e => ({
    mes: MESES[e.mes - 1]?.slice(0, 3),
    Mobilização: e.mobilizacao,
    Passagens: e.passagens,
    Custos: e.custos,
    Alojamento: e.alojamento,
  }))

  const pieData = dashboard ? [
    { name: 'Mobilização', value: dashboard.metricas.total_mobilizacao },
    { name: 'Passagens', value: dashboard.metricas.total_passagens },
    { name: 'Alojamento', value: dashboard.metricas.total_alojamento },
    { name: 'Outros Custos', value: dashboard.metricas.total_custos },
  ].filter(d => d.value > 0) : []

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  const m = dashboard?.metricas || {}

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral de custos e indicadores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-44" value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <select className="input w-36" value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-24" value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Indicadores de obras e colaboradores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Building2 size={16} className="text-blue-500" /><span className="text-xs text-gray-500">Obras Ativas</span></div>
          <p className="text-2xl font-bold text-gray-900">{dashboard?.obras?.ativas || 0}</p>
          <p className="text-xs text-gray-400">{dashboard?.obras?.total || 0} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Users size={16} className="text-green-500" /><span className="text-xs text-gray-500">Colaboradores Ativos</span></div>
          <p className="text-2xl font-bold text-gray-900">{dashboard?.colaboradores?.ativos || 0}</p>
          <p className="text-xs text-gray-400">{dashboard?.colaboradores?.total || 0} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Users size={16} className="text-purple-500" /><span className="text-xs text-gray-500">No Mês</span></div>
          <p className="text-2xl font-bold text-gray-900">{m.num_colaboradores || 0}</p>
          <p className="text-xs text-gray-400">colaboradores mobilizados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-red-500" /><span className="text-xs text-gray-500">Custo/Colab/Dia</span></div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(m.custo_por_colaborador_dia)}</p>
        </div>
      </div>

      {/* KPI Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={20} />} label="Total Mobilização" value={formatCurrency(m.total_mobilizacao)} color="blue" />
        <KpiCard icon={<Plane size={20} />} label="Total Passagens" value={formatCurrency(m.total_passagens)} color="green" />
        <KpiCard icon={<Home size={20} />} label="Total Alojamento" value={formatCurrency(m.total_alojamento)} color="purple" />
        <KpiCard icon={<TrendingUp size={20} />} label="Total Geral" value={formatCurrency(m.total_geral)} color="red" highlight />
      </div>

      {/* Métricas por colaborador */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricaCard label="Média Mob. por Colaborador" value={formatCurrency(m.media_mob_por_colaborador)} />
        <MetricaCard label="Média Aloj. por Colaborador" value={formatCurrency(m.media_aloj_por_colaborador)} />
        <MetricaCard label="Média Mob+Aloj por Colab." value={formatCurrency(m.media_mob_aloj_por_colaborador)} />
        <MetricaCard label="Custo/Colaborador/Mês" value={formatCurrency(m.custo_por_colaborador_mes)} />
        <MetricaCard label="Outros Custos no Mês" value={formatCurrency(m.total_custos)} />
        <MetricaCard label="Total Geral no Mês" value={formatCurrency(m.total_geral)} bold />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Evolução Mensal {ano}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolucaoFormatada}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="Mobilização" stackId="1" stroke="#3b82f6" fill="#bfdbfe" />
              <Area type="monotone" dataKey="Passagens" stackId="1" stroke="#10b981" fill="#a7f3d0" />
              <Area type="monotone" dataKey="Alojamento" stackId="1" stroke="#8b5cf6" fill="#ddd6fe" />
              <Area type="monotone" dataKey="Custos" stackId="1" stroke="#f59e0b" fill="#fde68a" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Distribuição no Mês</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-300">
              <p className="text-center">Sem dados no período selecionado</p>
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Mobilização vs Alojamento — {ano}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={evolucaoFormatada}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Mobilização" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Alojamento" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Passagens" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, color, highlight }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', red: 'bg-red-50 text-red-600' }
  return (
    <div className={`card ${highlight ? 'ring-2 ring-blue-500' : ''}`}>
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function MetricaCard({ label, value, bold }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-lg ${bold ? 'font-extrabold text-blue-600' : 'font-bold text-gray-900'}`}>{value}</p>
    </div>
  )
}
