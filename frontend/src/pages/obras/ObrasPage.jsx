import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, STATUS_BADGE } from '../../utils/helpers'
import { Plus, Edit2, Trash2, Search, X, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const INITIAL = { nome:'', codigo:'', cliente:'', endereco:'', cidade:'', estado:'', data_inicio:'', data_previsao_fim:'', status:'ativa', descricao:'', orcamento:'' }

function ObraDetalheModal({ obra, onClose, onEdit }) {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)

  const { data: rel, isLoading } = useQuery({
    queryKey: ['relatorio-obra', obra.id, ano],
    queryFn: () => api.get(`/relatorios/obra/${obra.id}`, { params: { ano } }).then(r => r.data)
  })

  const receita = parseFloat(obra.orcamento || 0)
  const totalMob = parseFloat(rel?.mobilizacao?.total || 0)
  const totalPass = parseFloat(rel?.passagens?.total || 0)
  const totalCust = (rel?.custos || []).reduce((a, c) => a + parseFloat(c.total || 0), 0)
  const totalAloj = (rel?.alojamento || []).reduce((a, c) => a + parseFloat(c.total || 0), 0)
  const totalAno = totalMob + totalPass + totalCust + totalAloj
  // Usa acumulado total se disponível, senão usa o do ano selecionado
  const acumulado = parseFloat(rel?.acumulado?.total || 0)
  const totalDespesas = acumulado > 0 ? acumulado : totalAno
  const saldo = receita - totalDespesas
  const percentGasto = receita > 0 ? Math.min((totalDespesas / receita) * 100, 999) : 0

  return (
    <Modal open title={obra.nome} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Cabeçalho da obra */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`badge ${STATUS_BADGE[obra.status]}`}>{obra.status}</span>
            {obra.cliente && <span className="text-sm text-gray-500">{obra.cliente}</span>}
            {obra.cidade && <span className="text-sm text-gray-400">{obra.cidade}/{obra.estado}</span>}
          </div>
          <select
            className="input w-28 text-sm py-1"
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
          >
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Cards principais: Receita / Despesa / Saldo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={15} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Receita (Contrato)</p>
            </div>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(receita)}</p>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={15} className="text-red-600" />
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Despesas Acumuladas</p>
            </div>
            {isLoading ? (
              <p className="text-xl font-bold text-red-700">...</p>
            ) : (
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalDespesas)}</p>
            )}
          </div>

          <div className={`${saldo >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className={saldo >= 0 ? 'text-green-600' : 'text-orange-500'} />
              <p className={`text-xs font-semibold uppercase tracking-wide ${saldo >= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                {saldo >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
              </p>
            </div>
            {isLoading ? (
              <p className="text-xl font-bold">...</p>
            ) : (
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-700' : 'text-orange-600'}`}>
                {formatCurrency(Math.abs(saldo))}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso do orçamento */}
        {receita > 0 && !isLoading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Orçamento utilizado</span>
              <span className="font-semibold">{percentGasto.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${percentGasto > 90 ? 'bg-red-500' : percentGasto > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min(percentGasto, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Detalhamento das despesas */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Carregando despesas...</div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={15} className="text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Despesas por Categoria — {ano}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Mobilização', valor: totalMob },
                { label: 'Passagens', valor: totalPass },
                ...(rel?.custos || []).map(c => ({ label: c.label, valor: parseFloat(c.total) })),
                ...(rel?.alojamento || []).map(a => ({ label: `Alojamento — ${a.label}`, valor: parseFloat(a.total) })),
              ].filter(i => i.valor > 0).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-48 truncate">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-400"
                      style={{ width: totalDespesas > 0 ? `${(item.valor / totalDespesas) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 w-28 text-right">{formatCurrency(item.valor)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {totalDespesas > 0 ? `${((item.valor / totalDespesas) * 100).toFixed(0)}%` : '0%'}
                  </span>
                </div>
              ))}
              {totalDespesas === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma despesa registrada em {ano}</p>
              )}
            </div>

            {/* Colaboradores */}
            {rel?.colaboradores?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Colaboradores ({rel.colaboradores.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rel.colaboradores.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {c.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={() => { onClose(); onEdit() }} className="btn-secondary flex-1 justify-center">
            <Edit2 size={14} /> Editar Obra
          </button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center">Fechar</button>
        </div>
      </div>
    </Modal>
  )
}

export default function ObrasPage() {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [obraDetalhe, setObraDetalhe] = useState(null)
  const qc = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ['obras', search, statusFilter],
    queryFn: () => api.get('/obras', { params: { search, status: statusFilter } }).then(r => r.data)
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/obras/${editItem.id}`, d) : api.post('/obras', d),
    onSuccess: () => { qc.invalidateQueries(['obras']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/obras/${id}`),
    onSuccess: () => { qc.invalidateQueries(['obras']); toast.success('Removido!'); setConfirm(null) }
  })

  const openModal = (item = null) => { setEditItem(item); setForm(item ? { ...INITIAL, ...item } : INITIAL); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
          <p className="text-gray-500 text-sm">{data.length} obras cadastradas</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Nova Obra</button>
      </div>

      <div className="card !p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar obra..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos status</option>
          <option value="ativa">Ativa</option>
          <option value="concluida">Concluída</option>
          <option value="suspensa">Suspensa</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">Nenhuma obra encontrada</div>
          ) : data.map(obra => (
            <div
              key={obra.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setObraDetalhe(obra)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{obra.nome}</p>
                  {obra.codigo && <p className="text-xs text-gray-400">#{obra.codigo}</p>}
                </div>
                <span className={`badge ${STATUS_BADGE[obra.status]} ml-2 flex-shrink-0`}>{obra.status}</span>
              </div>
              {obra.cliente && <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Cliente:</span> {obra.cliente}</p>}
              {obra.cidade && <p className="text-sm text-gray-500 mb-1">{obra.cidade}/{obra.estado}</p>}
              {obra.data_inicio && <p className="text-xs text-gray-400">Início: {formatDate(obra.data_inicio)}</p>}
              {obra.data_previsao_fim && <p className="text-xs text-gray-400">Previsão: {formatDate(obra.data_previsao_fim)}</p>}
              {obra.orcamento > 0 && (
                <p className="text-sm font-semibold text-blue-600 mt-2">{formatCurrency(obra.orcamento)}</p>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={e => { e.stopPropagation(); openModal(obra) }}
                  className="btn-secondary flex-1 justify-center text-xs py-1.5"
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirm(obra.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe financeiro da obra */}
      {obraDetalhe && (
        <ObraDetalheModal
          obra={obraDetalhe}
          onClose={() => setObraDetalhe(null)}
          onEdit={() => openModal(obraDetalhe)}
        />
      )}

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Nova'} Obra`} onClose={closeModal} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Nome da Obra *</label><input className="input" required {...F('nome')} /></div>
          <div><label className="label">Código</label><input className="input" {...F('codigo')} /></div>
          <div><label className="label">Cliente</label><input className="input" {...F('cliente')} /></div>
          <div className="col-span-2"><label className="label">Endereço</label><input className="input" {...F('endereco')} /></div>
          <div><label className="label">Cidade</label><input className="input" {...F('cidade')} /></div>
          <div><label className="label">Estado (UF)</label><input className="input" maxLength={2} {...F('estado')} /></div>
          <div><label className="label">Data Início</label><input type="date" className="input" {...F('data_inicio')} /></div>
          <div><label className="label">Previsão de Fim</label><input type="date" className="input" {...F('data_previsao_fim')} /></div>
          <div><label className="label">Valor do Contrato (R$)</label><input type="number" step="0.01" className="input" {...F('orcamento')} /></div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="ativa">Ativa</option><option value="concluida">Concluída</option>
              <option value="suspensa">Suspensa</option><option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Descrição</label><textarea className="input h-20 resize-none" {...F('descricao')} /></div>
          <div className="col-span-2 flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Remover obra?" message="Esta ação removerá a obra permanentemente." confirmLabel="Remover" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
