import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, STATUS_BADGE } from '../../utils/helpers'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const INITIAL = { nome:'', codigo:'', cliente:'', endereco:'', cidade:'', estado:'', data_inicio:'', data_previsao_fim:'', status:'ativa', descricao:'', orcamento:'' }

export default function ObrasPage() {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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
            <div key={obra.id} className="card hover:shadow-md transition-shadow">
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
              {obra.orcamento > 0 && <p className="text-sm font-semibold text-blue-600 mt-2">{formatCurrency(obra.orcamento)}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => openModal(obra)} className="btn-secondary flex-1 justify-center text-xs py-1.5"><Edit2 size={13} /> Editar</button>
                <button onClick={() => setConfirm(obra.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
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
          <div><label className="label">Orçamento (R$)</label><input type="number" step="0.01" className="input" {...F('orcamento')} /></div>
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
