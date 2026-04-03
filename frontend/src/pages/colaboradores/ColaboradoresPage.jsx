import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatDate, STATUS_BADGE } from '../../utils/helpers'
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

const INITIAL = { nome:'', apelido:'', indicacao:'', data_admissao:'', funcao:'', data_nascimento:'', rg:'', cpf:'', telefone:'', email:'', cidade_origem:'', estado_origem:'', status:'ativo', observacoes:'' }

export default function ColaboradoresPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data = [], isLoading } = useQuery({
    queryKey: ['colaboradores', search, statusFilter],
    queryFn: () => api.get('/colaboradores', { params: { search, status: statusFilter } }).then(r => r.data)
  })

  const { paged, page, setPage, totalPages, total } = usePagination(data, 20)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/colaboradores/${editItem.id}`, d) : api.post('/colaboradores', d),
    onSuccess: () => { qc.invalidateQueries(['colaboradores']); toast.success(editItem ? 'Atualizado!' : 'Cadastrado!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro ao salvar')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/colaboradores/${id}`),
    onSuccess: () => { qc.invalidateQueries(['colaboradores']); toast.success('Inativado!'); setConfirm(null) }
  })

  const openModal = (item = null) => { setEditItem(item); setForm(item ? { ...INITIAL, ...item } : INITIAL); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="text-gray-500 text-sm">{total} registros</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Novo Colaborador</button>
      </div>

      <div className="card !p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome, apelido ou CPF..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input sm:w-44" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="ferias">Férias</option>
          <option value="afastado">Afastado</option>
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-left">Função</th>
                <th className="table-header text-left">Origem</th>
                <th className="table-header text-left">Admissão</th>
                <th className="table-header text-left">Telefone</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum colaborador encontrado</td></tr>
              ) : paged.map(col => (
                <tr key={col.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                        {col.nome?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{col.nome}</p>
                        {col.apelido && <p className="text-xs text-gray-400">{col.apelido}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{col.funcao || '-'}</td>
                  <td className="table-cell">{col.cidade_origem ? `${col.cidade_origem}/${col.estado_origem}` : '-'}</td>
                  <td className="table-cell">{formatDate(col.data_admissao)}</td>
                  <td className="table-cell">{col.telefone || '-'}</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[col.status] || 'bg-gray-100 text-gray-700'}`}>{col.status}</span></td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate(`/colaboradores/${col.id}`)} title="Ver perfil" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Eye size={14} /></button>
                      <button onClick={() => openModal(col)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirm(col.id)} title="Inativar" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={setPage} />
      </div>

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Novo'} Colaborador`} onClose={closeModal} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Nome Completo *</label><input className="input" required {...F('nome')} /></div>
            <div><label className="label">Apelido</label><input className="input" {...F('apelido')} /></div>
            <div><label className="label">Indicação</label><input className="input" {...F('indicacao')} /></div>
            <div><label className="label">Função</label><input className="input" {...F('funcao')} /></div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                <option value="ferias">Férias</option><option value="afastado">Afastado</option>
              </select>
            </div>
            <div><label className="label">Data Admissão</label><input type="date" className="input" {...F('data_admissao')} /></div>
            <div><label className="label">Data Nascimento</label><input type="date" className="input" {...F('data_nascimento')} /></div>
            <div><label className="label">CPF</label><input className="input" {...F('cpf')} placeholder="000.000.000-00" /></div>
            <div><label className="label">RG</label><input className="input" {...F('rg')} /></div>
            <div><label className="label">Telefone</label><input className="input" {...F('telefone')} placeholder="(00) 00000-0000" /></div>
            <div><label className="label">Email</label><input type="email" className="input" {...F('email')} /></div>
            <div><label className="label">Cidade de Origem</label><input className="input" {...F('cidade_origem')} /></div>
            <div><label className="label">Estado (UF)</label><input className="input" maxLength={2} {...F('estado_origem')} placeholder="SP" /></div>
            <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input h-16 resize-none" {...F('observacoes')} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Inativar colaborador?" message="O colaborador será marcado como inativo. Ele pode ser reativado a qualquer momento editando o registro." confirmLabel="Inativar" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
