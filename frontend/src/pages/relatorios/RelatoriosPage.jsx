import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { formatCurrency, MESES, CATEGORIAS_CUSTO, TIPOS_ALOJAMENTO } from '../../utils/helpers'
import { FileText, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RelatoriosPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [obraId, setObraId] = useState('')
  const [loading, setLoading] = useState('')

  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ['relatorio-mensal', mes, ano, obraId],
    queryFn: () => api.get('/relatorios/mensal', { params: { mes, ano, obra_id: obraId } }).then(r => r.data)
  })

  const download = async (formato) => {
    setLoading(formato)
    try {
      const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
      const params = new URLSearchParams({ mes, ano, formato, ...(obraId && { obra_id: obraId }) })
      const resp = await fetch(`${apiBase}/relatorios/mensal?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!resp.ok) throw new Error('Erro ao gerar arquivo')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${ano}-${String(mes).padStart(2,'0')}.${formato === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar relatório')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório Mensal</h1>
        <p className="text-gray-500 text-sm">Consolidado de custos por período e obra</p>
      </div>

      <div className="card !p-4 flex flex-wrap items-end gap-3">
        <div><label className="label">Mês</label>
          <select className="input w-36" value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div><label className="label">Ano</label>
          <select className="input w-28" value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-48"><label className="label">Obra (opcional)</label>
          <select className="input" value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => download('excel')} disabled={!!loading} className="btn-secondary">
            <FileSpreadsheet size={16} className="text-green-600" />{loading==='excel' ? 'Gerando...' : 'Excel'}
          </button>
          <button onClick={() => download('pdf')} disabled={!!loading} className="btn-secondary">
            <FileText size={16} className="text-red-500" />{loading==='pdf' ? 'Gerando...' : 'PDF'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : relatorio ? (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-bold text-gray-900 text-lg mb-1">
              {MESES[relatorio.periodo.mes - 1]} / {relatorio.periodo.ano}
            </h2>
            <p className="text-gray-500 text-sm mb-4">Obra: {relatorio.obra} | {relatorio.mobilizacao.colaboradores} colaboradores</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Mobilização', value: relatorio.mobilizacao.total, color:'border-l-blue-500' },
                { label:'Passagens', value: relatorio.passagens.total, color:'border-l-sky-500' },
                { label:'Alojamento', value: relatorio.alojamento.reduce((a,r)=>a+r.total,0), color:'border-l-purple-500' },
                { label:'Total Geral', value: relatorio.total_geral, color:'border-l-red-500' },
              ].map(c => (
                <div key={c.label} className={`border-l-4 ${c.color} bg-gray-50 rounded-r-xl p-3`}>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(c.value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Custos por Categoria</h3>
              {relatorio.custos.length === 0 ? <p className="text-gray-400 text-sm">Nenhum custo no período</p> : (
                <div className="space-y-2">
                  {relatorio.custos.map(c => (
                    <div key={c.categoria} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{c.label}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Alojamento por Tipo</h3>
              {relatorio.alojamento.length === 0 ? <p className="text-gray-400 text-sm">Nenhum lançamento no período</p> : (
                <div className="space-y-2">
                  {relatorio.alojamento.map(a => (
                    <div key={a.tipo} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{a.label}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(a.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Consolidado Geral</h3>
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="table-header text-left">Item</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-right">%</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label:'Mobilização', value: relatorio.mobilizacao.total },
                  { label:'Passagens', value: relatorio.passagens.total },
                  ...relatorio.custos.map(c => ({ label: c.label, value: c.total })),
                  ...relatorio.alojamento.map(a => ({ label: `Aloj. - ${a.label}`, value: a.total })),
                ].map((item,i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell">{item.label}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(item.value)}</td>
                    <td className="table-cell text-right text-gray-400">{relatorio.total_geral > 0 ? ((item.value / relatorio.total_geral) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="table-cell font-bold text-blue-900">TOTAL GERAL</td>
                <td className="table-cell text-right font-bold text-blue-900">{formatCurrency(relatorio.total_geral)}</td>
                <td className="table-cell text-right font-bold text-blue-900">100%</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
