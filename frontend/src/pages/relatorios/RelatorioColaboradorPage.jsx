import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, CATEGORIAS_CUSTO, STATUS_BADGE } from '../../utils/helpers'
import { Search, User } from 'lucide-react'

export default function RelatorioColaboradorPage() {
  const [colaboradorId, setColaboradorId] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-list'],
    queryFn: () => api.get('/colaboradores').then(r => r.data)
  })

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ['relatorio-colaborador', colaboradorId, ano],
    queryFn: () => api.get(`/relatorios/colaborador/${colaboradorId}`, { params: { ano } }).then(r => r.data),
    enabled: !!colaboradorId
  })

  const filtrados = colaboradores.filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.apelido || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório por Colaborador</h1>
        <p className="text-gray-500 text-sm">Visualize todos os custos e movimentações de um colaborador</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seleção */}
        <div className="card space-y-4">
          <div>
            <label className="label">Ano</label>
            <select className="input" value={ano} onChange={e => setAno(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Buscar Colaborador</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8" placeholder="Nome ou apelido..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
            {filtrados.map(c => (
              <button
                key={c.id}
                onClick={() => setColaboradorId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${colaboradorId === c.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colaboradorId === c.id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {c.nome?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.nome}</p>
                  {c.funcao && <p className={`text-xs truncate ${colaboradorId === c.id ? 'text-blue-200' : 'text-gray-400'}`}>{c.funcao}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Relatório */}
        <div className="lg:col-span-2 space-y-4">
          {!colaboradorId ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <User size={48} className="text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Selecione um colaborador</p>
              <p className="text-gray-300 text-sm mt-1">para visualizar o relatório</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : relatorio ? (
            <>
              {/* Header colaborador */}
              <div className="card flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {relatorio.colaborador.nome?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{relatorio.colaborador.nome}</h2>
                  <p className="text-gray-500 text-sm">{relatorio.colaborador.funcao} | Ano: {relatorio.ano}</p>
                </div>
                <span className={`badge ${STATUS_BADGE[relatorio.colaborador.status]}`}>{relatorio.colaborador.status}</span>
              </div>

              {/* Totais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Mobilização', value: relatorio.totais.mobilizacao, color: 'border-l-blue-500' },
                  { label: 'Passagens', value: relatorio.totais.passagens, color: 'border-l-sky-500' },
                  { label: 'Outros Custos', value: relatorio.totais.custos, color: 'border-l-orange-500' },
                  { label: 'Total Geral', value: relatorio.totais.mobilizacao + relatorio.totais.passagens + relatorio.totais.custos, color: 'border-l-red-500' },
                ].map(card => (
                  <div key={card.label} className={`bg-white border-l-4 ${card.color} rounded-r-xl p-3 shadow-sm border border-l-4 border-gray-200`}>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(card.value)}</p>
                  </div>
                ))}
              </div>

              {/* Mobilizações */}
              <div className="card !p-0 overflow-hidden">
                <div className="p-4 border-b font-semibold text-gray-900">Mobilizações ({relatorio.mobilizacoes.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-100">
                      <th className="table-header text-left">Tipo</th>
                      <th className="table-header text-left">Data</th>
                      <th className="table-header text-left">Trajeto</th>
                      <th className="table-header text-left">Obra</th>
                      <th className="table-header text-right">Reembolso</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {relatorio.mobilizacoes.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-sm">Sem registros</td></tr>
                        : relatorio.mobilizacoes.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="table-cell"><span className="badge bg-blue-100 text-blue-700 capitalize">{m.tipo?.replace('_',' ')}</span></td>
                            <td className="table-cell">{formatDate(m.data_mobilizacao)}</td>
                            <td className="table-cell text-xs">{m.cidade_origem ? `${m.cidade_origem} → ${m.cidade_destino}` : '-'}</td>
                            <td className="table-cell text-sm text-gray-500">{m.obra_nome || '-'}</td>
                            <td className="table-cell text-right font-semibold text-green-600">{formatCurrency(m.valor_reembolso)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Passagens */}
              <div className="card !p-0 overflow-hidden">
                <div className="p-4 border-b font-semibold text-gray-900">Passagens ({relatorio.passagens.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-100">
                      <th className="table-header text-left">Empresa</th>
                      <th className="table-header text-left">Rota</th>
                      <th className="table-header text-left">Data</th>
                      <th className="table-header text-left">Obra</th>
                      <th className="table-header text-right">Valor</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {relatorio.passagens.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-sm">Sem passagens</td></tr>
                        : relatorio.passagens.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="table-cell"><span className="badge bg-sky-100 text-sky-700">{p.empresa || '-'}</span></td>
                            <td className="table-cell text-xs">{p.origem} → {p.destino}</td>
                            <td className="table-cell">{formatDate(p.data_viagem)}</td>
                            <td className="table-cell text-sm text-gray-500">{p.obra_nome || '-'}</td>
                            <td className="table-cell text-right font-semibold text-blue-600">{formatCurrency(p.valor)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
