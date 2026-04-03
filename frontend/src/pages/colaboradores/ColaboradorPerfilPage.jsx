import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, STATUS_BADGE, CATEGORIAS_CUSTO } from '../../utils/helpers'
import { ArrowLeft, Phone, MapPin, Briefcase, Calendar, CreditCard, Plane, HardHat, DollarSign } from 'lucide-react'

export default function ColaboradorPerfilPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => api.get(`/colaboradores/${id}`).then(r => r.data)
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  if (!data) return <div className="text-center py-12 text-gray-400">Colaborador não encontrado</div>

  const { mobilizacoes = [], passagens = [], custos = [], totais = {} } = data

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.nome}</h1>
          <p className="text-gray-500 text-sm">{data.apelido ? `"${data.apelido}" • ` : ''}{data.funcao || 'Sem função definida'}</p>
        </div>
        <span className={`badge ml-auto ${STATUS_BADGE[data.status]}`}>{data.status}</span>
      </div>

      {/* Dados pessoais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 text-blue-600 text-3xl font-bold">
            {data.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-3 text-sm">
            {data.telefone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{data.telefone}</div>}
            {data.cidade_origem && <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} className="text-gray-400" />{data.cidade_origem}/{data.estado_origem}</div>}
            {data.funcao && <div className="flex items-center gap-2 text-gray-600"><Briefcase size={14} className="text-gray-400" />{data.funcao}</div>}
            {data.data_admissao && <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} className="text-gray-400" />Admitido em {formatDate(data.data_admissao)}</div>}
            {data.cpf && <div className="flex items-center gap-2 text-gray-600"><CreditCard size={14} className="text-gray-400" />{data.cpf}</div>}
            {data.indicacao && <p className="text-xs text-gray-400">Indicado por: {data.indicacao}</p>}
          </div>
        </div>

        {/* Cards de totais */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <TotalCard icon={<HardHat size={20} />} label="Total Mobilização" value={formatCurrency(totais.mobilizacao)} color="blue" count={mobilizacoes.length} unit="registros" />
          <TotalCard icon={<Plane size={20} />} label="Total Passagens" value={formatCurrency(totais.passagens)} color="sky" count={passagens.length} unit="passagens" />
          <TotalCard icon={<DollarSign size={20} />} label="Outros Custos" value={formatCurrency(totais.custos)} color="orange" count={custos.length} unit="lançamentos" />
          <TotalCard icon={<DollarSign size={20} />} label="Total Geral" value={formatCurrency(totais.geral)} color="red" bold />
        </div>
      </div>

      {/* Histórico de Mobilização */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <HardHat size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Histórico de Mobilização ({mobilizacoes.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left">Tipo</th>
                <th className="table-header text-left">Obra</th>
                <th className="table-header text-left">Data</th>
                <th className="table-header text-left">Trajeto</th>
                <th className="table-header text-right">KM</th>
                <th className="table-header text-right">Reembolso</th>
                <th className="table-header text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mobilizacoes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-sm">Nenhum registro</td></tr>
              ) : mobilizacoes.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="table-cell"><span className="badge bg-blue-100 text-blue-700 capitalize">{m.tipo?.replace('_', ' ')}</span></td>
                  <td className="table-cell text-sm text-gray-500">{m.obra_nome || '-'}</td>
                  <td className="table-cell">{formatDate(m.data_mobilizacao)}</td>
                  <td className="table-cell text-xs">{m.cidade_origem ? `${m.cidade_origem} → ${m.cidade_destino}` : '-'}</td>
                  <td className="table-cell text-right">{m.km ? `${m.km} km` : '-'}</td>
                  <td className="table-cell text-right font-semibold text-green-600">{formatCurrency(m.valor_reembolso)}</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passagens */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Plane size={18} className="text-sky-600" />
          <h3 className="font-semibold text-gray-900">Passagens ({passagens.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left">Empresa</th>
                <th className="table-header text-left">Rota</th>
                <th className="table-header text-left">Data Viagem</th>
                <th className="table-header text-left">Obra</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {passagens.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">Nenhuma passagem</td></tr>
              ) : passagens.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell"><span className="badge bg-sky-100 text-sky-700">{p.empresa || '-'}</span></td>
                  <td className="table-cell text-xs">{p.origem} → {p.destino}</td>
                  <td className="table-cell">{formatDate(p.data_viagem)}</td>
                  <td className="table-cell text-sm text-gray-500">{p.obra_nome || '-'}</td>
                  <td className="table-cell text-right font-semibold text-blue-600">{formatCurrency(p.valor)}</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custos */}
      {custos.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <DollarSign size={18} className="text-orange-600" />
            <h3 className="font-semibold text-gray-900">Outros Custos ({custos.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header text-left">Data</th>
                  <th className="table-header text-left">Categoria</th>
                  <th className="table-header text-left">Descrição</th>
                  <th className="table-header text-left">Obra</th>
                  <th className="table-header text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {custos.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-cell">{formatDate(c.data_lancamento)}</td>
                    <td className="table-cell"><span className="badge bg-orange-100 text-orange-700 text-xs">{CATEGORIAS_CUSTO[c.categoria] || c.categoria}</span></td>
                    <td className="table-cell text-gray-500">{c.descricao || '-'}</td>
                    <td className="table-cell text-sm text-gray-500">{c.obra_nome || '-'}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TotalCard({ icon, label, value, color, count, unit, bold }) {
  const colors = { blue:'bg-blue-50 text-blue-600', sky:'bg-sky-50 text-sky-600', orange:'bg-orange-50 text-orange-600', red:'bg-red-50 text-red-600' }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl mt-1 ${bold ? 'font-extrabold text-gray-900' : 'font-bold text-gray-900'}`}>{value}</p>
      {count !== undefined && <p className="text-xs text-gray-400 mt-1">{count} {unit}</p>}
    </div>
  )
}
