import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, TIPOS_ALOJAMENTO } from '../../utils/helpers'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

const INITIAL = { obra_id:'', tipo:'aluguel', descricao:'', valor:'', data_lancamento:'', fornecedor:'', numero_colaboradores:'' }

export default function AlojamentoPage() {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const [filters, setFilters] = useState({ tipo:'', obra_id:'', mes:'', ano: new Date().getFullYear() })
  const qc = useQueryClient()

  const { data: result = { data:[], total:0 }, isLoading } = useQuery({
    queryKey: ['alojamento', filters],
    queryFn: () => api.get('/alojamento', { params: filters }).then(r => r.data)
  })
  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })
  const { paged, page, setPage, totalPages, total } = usePagination(result.data, 20)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/alojamento/${editItem.id}`, d) : api.post('/alojamento', d),
    onSuccess: () => { qc.invalidateQueries(['alojamento']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/alojamento/${id}`),
    onSuccess: () => { qc.invalidateQueries(['alojamento']); toast.success('Removido!'); setConfirm(null) }
  })

  const openModal = (item = null) => { setEditItem(item); setForm(item ? { ...INITIAL, ...item } : INITIAL); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alojamento</h1>
          <p className="text-gray-500 text-sm">Total: <span className="font-semibold text-purple-600">{formatCurrency(result.total)}</span></p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Novo Lançamento</button>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <select className="input w-52" value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS_ALOJAMENTO).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-44" value={filters.obra_id} onChange={e => setFilters(f => ({ ...f, obra_id: e.target.value }))}>
          <option value="">Todas obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className="input w-32" value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))}>
          <option value="">Todos meses</option>
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
        </select>
        <input type="number" className="input w-24" value={filters.ano} onChange={e => setFilters(f => ({ ...f, ano: e.target.value }))} />
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header text-left">Data</th>
                <th className="table-header text-left">Tipo</th>
                <th className="table-header text-left">Descrição</th>
                <th className="table-header text-left">Obra</th>
                <th className="table-header text-left">Fornecedor</th>
                <th className="table-header text-center">Colaboradores</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum lançamento encontrado</td></tr>
              ) : paged.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-cell">{formatDate(a.data_lancamento)}</td>
                  <td className="table-cell"><span className="badge bg-purple-100 text-purple-700 text-xs">{TIPOS_ALOJAMENTO[a.tipo] || a.tipo}</span></td>
                  <td className="table-cell text-gray-600">{a.descricao || '-'}</td>
                  <td className="table-cell text-sm text-gray-500">{a.obra_nome || '-'}</td>
                  <td className="table-cell text-sm">{a.fornecedor || '-'}</td>
                  <td className="table-cell text-center">{a.numero_colaboradores || '-'}</td>
                  <td className="table-cell text-right font-semibold text-purple-600">{formatCurrency(a.valor)}</td>
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openModal(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirm(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {result.data.length > 0 && (
              <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={6} className="table-cell font-semibold text-gray-600">Total</td>
                <td className="table-cell text-right font-bold text-purple-600">{formatCurrency(result.total)}</td>
                <td></td>
              </tr></tfoot>
            )}
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={setPage} />
      </div>

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Novo'} Lançamento`} onClose={closeModal} size="md">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Tipo *</label>
            <select className="input" required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {Object.entries(TIPOS_ALOJAMENTO).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Obra</label>
            <select className="input" {...F('obra_id')}><option value="">Selecione...</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select>
          </div>
          <div><label className="label">Descrição</label><input className="input" {...F('descricao')} /></div>
          <div><label className="label">Fornecedor</label><input className="input" {...F('fornecedor')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Valor (R$) *</label><input type="number" step="0.01" className="input" required {...F('valor')} /></div>
            <div><label className="label">Data *</label><input type="date" className="input" required {...F('data_lancamento')} /></div>
          </div>
          <div><label className="label">Nº de Colaboradores no Alojamento</label><input type="number" min="0" className="input" {...F('numero_colaboradores')} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Remover lançamento?" message="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
