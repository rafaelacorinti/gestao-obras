import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, STATUS_BADGE } from '../../utils/helpers'
import { Plus, Edit2, Trash2, Filter } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

const INITIAL = { colaborador_id:'', obra_id:'', data_compra:'', data_viagem:'', valor:'', parcelas:'1', empresa:'', cartao_utilizado:'', origem:'', destino:'', tipo:'ida', status:'confirmado', observacoes:'' }

export default function PassagensPage() {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const [filters, setFilters] = useState({ empresa:'', obra_id:'', colaborador_id:'', status:'', data_inicio:'', data_fim:'' })
  const [showFilters, setShowFilters] = useState(false)
  const qc = useQueryClient()

  const { data: result = { data:[], total:0, count:0 }, isLoading } = useQuery({
    queryKey: ['passagens', filters],
    queryFn: () => api.get('/passagens', { params: filters }).then(r => r.data)
  })

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores-list'], queryFn: () => api.get('/colaboradores').then(r => r.data) })
  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const { paged, page, setPage, totalPages, total } = usePagination(result.data, 20)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/passagens/${editItem.id}`, d) : api.post('/passagens', d),
    onSuccess: () => { qc.invalidateQueries(['passagens']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/passagens/${id}`),
    onSuccess: () => { qc.invalidateQueries(['passagens']); toast.success('Removido!'); setConfirm(null) }
  })

  const openModal = (item = null) => { setEditItem(item); setForm(item ? { ...INITIAL, ...item } : INITIAL); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })
  const SF = (key) => ({ value: filters[key] || '', onChange: e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1) } })

  const activeFilters = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Passagens</h1>
          <p className="text-gray-500 text-sm">{result.count} passagens | Total: <span className="font-semibold text-blue-600">{formatCurrency(result.total)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(s => !s)} className="btn-secondary relative">
            <Filter size={16} /> Filtros
            {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters}</span>}
          </button>
          <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Nova Passagem</button>
        </div>
      </div>

      {/* Filtros expandíveis */}
      {showFilters && (
        <div className="card !p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="label">Obra</label>
            <select className="input" {...SF('obra_id')}>
              <option value="">Todas</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Colaborador</label>
            <select className="input" {...SF('colaborador_id')}>
              <option value="">Todos</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Empresa</label>
            <input className="input" placeholder="GOL, Azul..." {...SF('empresa')} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...SF('status')}>
              <option value="">Todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
              <option value="reembolsado">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="label">Data Início</label>
            <input type="date" className="input" {...SF('data_inicio')} />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input type="date" className="input" {...SF('data_fim')} />
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header text-left">Colaborador</th>
                <th className="table-header text-left">Empresa</th>
                <th className="table-header text-left">Rota</th>
                <th className="table-header text-left">Data Viagem</th>
                <th className="table-header text-left">Cartão</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-center">Parc.</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma passagem encontrada</td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.colaborador_nome || '-'}</td>
                  <td className="table-cell"><span className="badge bg-sky-100 text-sky-700">{p.empresa || '-'}</span></td>
                  <td className="table-cell text-xs text-gray-500">{p.origem} → {p.destino}</td>
                  <td className="table-cell">{formatDate(p.data_viagem)}</td>
                  <td className="table-cell text-xs text-gray-400">{p.cartao_utilizado || '-'}</td>
                  <td className="table-cell text-right font-semibold text-blue-600">{formatCurrency(p.valor)}</td>
                  <td className="table-cell text-center text-gray-500">{p.parcelas}x</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openModal(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirm(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {result.data.length > 0 && (
              <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={5} className="table-cell font-semibold text-gray-600">Total ({result.count} passagens)</td>
                <td className="table-cell text-right font-bold text-blue-600">{formatCurrency(result.total)}</td>
                <td colSpan={3}></td>
              </tr></tfoot>
            )}
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={setPage} />
      </div>

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Nova'} Passagem`} onClose={closeModal} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Colaborador</label>
            <select className="input" {...F('colaborador_id')}><option value="">Selecione...</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </div>
          <div className="col-span-2"><label className="label">Obra</label>
            <select className="input" {...F('obra_id')}><option value="">Selecione...</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select>
          </div>
          <div><label className="label">Empresa</label><input className="input" placeholder="GOL, Azul, LATAM..." {...F('empresa')} /></div>
          <div><label className="label">Cartão Utilizado</label><input className="input" {...F('cartao_utilizado')} /></div>
          <div><label className="label">Origem</label><input className="input" {...F('origem')} /></div>
          <div><label className="label">Destino</label><input className="input" {...F('destino')} /></div>
          <div><label className="label">Data da Compra</label><input type="date" className="input" {...F('data_compra')} /></div>
          <div><label className="label">Data da Viagem *</label><input type="date" className="input" required {...F('data_viagem')} /></div>
          <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" className="input" required {...F('valor')} /></div>
          <div><label className="label">Parcelas</label><input type="number" min="1" max="24" className="input" {...F('parcelas')} /></div>
          <div><label className="label">Tipo</label>
            <select className="input" {...F('tipo')}><option value="ida">Ida</option><option value="volta">Volta</option><option value="ida_volta">Ida e Volta</option></select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" {...F('status')}><option value="confirmado">Confirmado</option><option value="cancelado">Cancelado</option><option value="reembolsado">Reembolsado</option></select>
          </div>
          <div className="col-span-2"><label className="label">Observações</label><textarea className="input h-16 resize-none" {...F('observacoes')} /></div>
          <div className="col-span-2 flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Remover passagem?" message="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
