import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDate, formatCurrency, STATUS_BADGE } from '../../utils/helpers'
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

const INITIAL = { colaborador_id:'', obra_id:'', data_mobilizacao:'', data_desmobilizacao:'', cidade_origem:'', estado_origem:'', cidade_destino:'', estado_destino:'', km:'', valor_reembolso:'', tipo:'mobilizacao', status:'pendente', observacoes:'' }

export default function MobilizacaoPage() {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const [filters, setFilters] = useState({ tipo:'', status:'', obra_id:'' })
  const qc = useQueryClient()

  const { data: result = { data:[], total:0 }, isLoading } = useQuery({
    queryKey: ['mobilizacao', filters],
    queryFn: () => api.get('/mobilizacao', { params: filters }).then(r => r.data)
  })
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores-list'], queryFn: () => api.get('/colaboradores?status=ativo').then(r => r.data) })
  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const { paged, page, setPage, totalPages, total } = usePagination(result.data, 20)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/mobilizacao/${editItem.id}`, d) : api.post('/mobilizacao', d),
    onSuccess: () => { qc.invalidateQueries(['mobilizacao']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/mobilizacao/${id}`),
    onSuccess: () => { qc.invalidateQueries(['mobilizacao']); toast.success('Removido!'); setConfirm(null) }
  })

  const syncMutation = useMutation({
    mutationFn: (obra_id) => api.post('/sync/mobilizacao', { obra_id }),
    onSuccess: (r) => {
      qc.invalidateQueries(['mobilizacao'])
      qc.invalidateQueries(['colaboradores-list'])
      toast.success(`Sync concluído! ${r.data.criados} registros importados.`)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro ao sincronizar')
  })

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/sync/status').then(r => r.data),
    refetchInterval: 30000
  })

  const openModal = (item = null) => { setEditItem(item); setForm(item ? { ...INITIAL, ...item } : INITIAL); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobilização</h1>
          <p className="text-gray-500 text-sm">{total} registros | Total: <span className="font-semibold text-blue-600">{formatCurrency(result.total)}</span></p>
          {syncStatus?.ultima_sync && (
            <p className="text-xs text-gray-400 mt-0.5">
              Última sync Google Sheets: {new Date(syncStatus.ultima_sync).toLocaleString('pt-BR')} · {syncStatus.registros_sincronizados} registros
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate(filters.obra_id || null)}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? 'Sincronizando...' : 'Sync Google Sheets'}
          </button>
          <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Nova Mobilização</button>
        </div>
      </div>

      <div className="card !p-4 flex flex-wrap gap-3">
        <select className="input w-44" value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
          <option value="">Todos os tipos</option>
          <option value="mobilizacao">Mobilização</option>
          <option value="desmobilizacao">Desmobilização</option>
          <option value="folga_campo">Folga de Campo</option>
          <option value="compra_folga">Compra de Folga</option>
        </select>
        <select className="input w-40" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select className="input w-48" value={filters.obra_id} onChange={e => setFilters(f => ({ ...f, obra_id: e.target.value }))}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header text-left">Colaborador</th>
                <th className="table-header text-left">Tipo</th>
                <th className="table-header text-left">Obra</th>
                <th className="table-header text-left">Data</th>
                <th className="table-header text-left">Trajeto</th>
                <th className="table-header text-right">KM</th>
                <th className="table-header text-right">Reembolso</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
              ) : paged.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{m.colaborador_nome || '-'}</td>
                  <td className="table-cell"><span className="badge bg-blue-100 text-blue-700 capitalize">{m.tipo?.replace('_', ' ')}</span></td>
                  <td className="table-cell text-gray-500 text-sm">{m.obra_nome || '-'}</td>
                  <td className="table-cell">{formatDate(m.data_mobilizacao)}</td>
                  <td className="table-cell text-xs text-gray-500">{m.cidade_origem ? `${m.cidade_origem}/${m.estado_origem} → ${m.cidade_destino}/${m.estado_destino}` : '-'}</td>
                  <td className="table-cell text-right text-gray-500">{m.km ? `${m.km}km` : '-'}</td>
                  <td className="table-cell text-right font-semibold text-green-600">{formatCurrency(m.valor_reembolso)}</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span></td>
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openModal(m)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirm(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {result.data.length > 0 && (
              <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={6} className="table-cell font-semibold text-gray-600">Total</td>
                <td className="table-cell text-right font-bold text-green-600">{formatCurrency(result.total)}</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            )}
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={setPage} />
      </div>

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Nova'} Mobilização`} onClose={closeModal} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Colaborador *</label>
            <select className="input" required {...F('colaborador_id')}><option value="">Selecione...</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome} {c.apelido ? `(${c.apelido})` : ''}</option>)}</select>
          </div>
          <div className="col-span-2"><label className="label">Obra</label>
            <select className="input" {...F('obra_id')}><option value="">Selecione...</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select>
          </div>
          <div><label className="label">Tipo</label>
            <select className="input" {...F('tipo')}><option value="mobilizacao">Mobilização</option><option value="desmobilizacao">Desmobilização</option><option value="folga_campo">Folga de Campo</option><option value="compra_folga">Compra de Folga</option></select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" {...F('status')}><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select>
          </div>
          <div><label className="label">Data Mobilização *</label><input type="date" className="input" required {...F('data_mobilizacao')} /></div>
          <div><label className="label">Data Desmobilização</label><input type="date" className="input" {...F('data_desmobilizacao')} /></div>
          <div><label className="label">Cidade Origem</label><input className="input" {...F('cidade_origem')} /></div>
          <div><label className="label">Estado Origem</label><input className="input" maxLength={2} {...F('estado_origem')} /></div>
          <div><label className="label">Cidade Destino</label><input className="input" {...F('cidade_destino')} /></div>
          <div><label className="label">Estado Destino</label><input className="input" maxLength={2} {...F('estado_destino')} /></div>
          <div><label className="label">KM</label><input type="number" step="0.01" className="input" {...F('km')} /></div>
          <div><label className="label">Valor Reembolso (R$)</label><input type="number" step="0.01" className="input" {...F('valor_reembolso')} /></div>
          <div className="col-span-2"><label className="label">Observações</label><textarea className="input h-16 resize-none" {...F('observacoes')} /></div>
          <div className="col-span-2 flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Remover registro?" message="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
