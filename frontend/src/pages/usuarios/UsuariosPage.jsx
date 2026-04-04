import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { CheckCircle, XCircle, Plus, Edit2, Trash2, Users } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const INITIAL = { nome: '', email: '', senha: '', perfil: 'financeiro', ativo: true }

export default function UsuariosPage() {
  const [tab, setTab] = useState('ativos')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  const qc = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const ativos = usuarios.filter(u => u.ativo)
  const pendentes = usuarios.filter(u => !u.ativo)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/users/${editItem.id}`, d) : api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })

  const aprovaMutation = useMutation({
    mutationFn: (id) => api.put(`/users/${id}`, { ativo: true }),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Usuário aprovado!') },
    onError: () => toast.error('Erro ao aprovar')
  })

  const recusaMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Solicitação recusada') },
    onError: () => toast.error('Erro ao recusar')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Removido!'); setConfirm(null) }
  })

  const openModal = (item = null) => {
    setEditItem(item)
    setForm(item ? { nome: item.nome, email: item.email, senha: '', perfil: item.perfil, ativo: item.ativo } : INITIAL)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  const PERFIL_BADGE = {
    administrador: 'bg-red-100 text-red-700',
    financeiro: 'bg-blue-100 text-blue-700',
    engenheiro: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm">{ativos.length} ativos · {pendentes.length} aguardando aprovação</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Novo Usuário</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('ativos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'ativos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Ativos ({ativos.length})
        </button>
        <button onClick={() => setTab('pendentes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'pendentes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Aguardando Aprovação
          {pendentes.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendentes.length}</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : tab === 'ativos' ? (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header text-left">Usuário</th>
                <th className="table-header text-left">Email</th>
                <th className="table-header text-left">Perfil</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ativos.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum usuário ativo</td></tr>
              ) : ativos.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{u.nome?.charAt(0)}</div>
                      <span className="font-medium text-gray-900">{u.nome}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{u.email}</td>
                  <td className="table-cell"><span className={`badge ${PERFIL_BADGE[u.perfil]}`}>{u.perfil}</span></td>
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openModal(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirm(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.length === 0 ? (
            <div className="card flex flex-col items-center py-16 text-center">
              <Users size={48} className="text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">Nenhuma solicitação pendente</p>
            </div>
          ) : pendentes.map(u => (
            <div key={u.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{u.nome?.charAt(0)}</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{u.nome}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
                <span className={`badge mt-1 ${PERFIL_BADGE[u.perfil]}`}>{u.perfil}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => aprovaMutation.mutate(u.id)} disabled={aprovaMutation.isPending} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <CheckCircle size={16} /> Aprovar
                </button>
                <button onClick={() => recusaMutation.mutate(u.id)} disabled={recusaMutation.isPending} className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors font-medium">
                  <XCircle size={16} /> Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Novo'} Usuário`} onClose={closeModal}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Nome *</label><input className="input" required {...F('nome')} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required {...F('email')} /></div>
          <div><label className="label">{editItem ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
            <input type="password" className="input" minLength={6} required={!editItem} {...F('senha')} />
          </div>
          <div><label className="label">Perfil</label>
            <select className="input" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
              <option value="administrador">Administrador</option>
              <option value="financeiro">Financeiro</option>
              <option value="engenheiro">Engenheiro</option>
            </select>
          </div>
          {editItem && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Usuário ativo</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Remover usuário?" message="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => deleteMutation.mutate(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
