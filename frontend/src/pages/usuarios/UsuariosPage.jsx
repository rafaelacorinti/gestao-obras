import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Plus, Edit2, Trash2, Search, ShieldCheck, KeyRound } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const PERFIS = { administrador: 'Administrador', financeiro: 'Financeiro', engenheiro: 'Engenheiro' }
const PERFIL_COLOR = { administrador: 'bg-red-100 text-red-700', financeiro: 'bg-blue-100 text-blue-700', engenheiro: 'bg-green-100 text-green-700' }

const INITIAL = { nome: '', email: '', senha: '', perfil: 'engenheiro', ativo: true }

export default function UsuariosPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [senhaModal, setSenhaModal] = useState(null) // id do usuario
  const [novaSenha, setNovaSenha] = useState('')
  const [confirm, setConfirm] = useState(null)
  const qc = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const filtered = data.filter(u =>
    !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/users/${editItem.id}`, d) : api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success(editItem ? 'Atualizado!' : 'Usuário criado!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro ao salvar')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Usuário desativado!'); setConfirm(null) }
  })

  const senhaMutation = useMutation({
    mutationFn: ({ id, senha }) => api.put(`/users/${id}/senha`, { nova_senha: senha }),
    onSuccess: () => { toast.success('Senha redefinida!'); setSenhaModal(null); setNovaSenha('') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })

  const openModal = (item = null) => {
    setEditItem(item)
    setForm(item ? { nome: item.nome, email: item.email, senha: '', perfil: item.perfil, ativo: item.ativo } : INITIAL)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }
  const F = (key) => ({ value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm">{data.length} usuários cadastrados</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><Plus size={16} /> Novo Usuário</button>
      </div>

      <div className="card !p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header text-left">Usuário</th>
              <th className="table-header text-left">Email</th>
              <th className="table-header text-left">Perfil</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Criado em</th>
              <th className="table-header text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                      {u.nome?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.nome}</span>
                  </div>
                </td>
                <td className="table-cell text-gray-500">{u.email}</td>
                <td className="table-cell">
                  <span className={`badge ${PERFIL_COLOR[u.perfil]}`}>
                    <ShieldCheck size={10} className="mr-1" />
                    {PERFIS[u.perfil]}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={`badge ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="table-cell text-gray-400 text-xs">
                  {new Intl.DateTimeFormat('pt-BR').format(new Date(u.criado_em))}
                </td>
                <td className="table-cell text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openModal(u)} title="Editar" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => { setSenhaModal(u.id); setNovaSenha('') }} title="Redefinir senha" className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"><KeyRound size={14} /></button>
                    <button onClick={() => setConfirm(u.id)} title="Desativar" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      <Modal open={showModal} title={editItem ? 'Editar Usuário' : 'Novo Usuário'} onClose={closeModal} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Nome *</label><input className="input" required {...F('nome')} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required {...F('email')} /></div>
          {!editItem && (
            <div><label className="label">Senha *</label><input type="password" className="input" required minLength={6} {...F('senha')} /></div>
          )}
          <div>
            <label className="label">Perfil *</label>
            <select className="input" required value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
              <option value="engenheiro">Engenheiro</option>
              <option value="financeiro">Financeiro</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          {editItem && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Usuário ativo</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal redefinir senha */}
      <Modal open={!!senhaModal} title="Redefinir Senha" onClose={() => setSenhaModal(null)} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); senhaMutation.mutate({ id: senhaModal, senha: novaSenha }) }} className="space-y-4">
          <div>
            <label className="label">Nova Senha *</label>
            <input type="password" className="input" required minLength={6} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSenhaModal(null)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={senhaMutation.isPending} className="btn-primary flex-1 justify-center">
              {senhaMutation.isPending ? 'Salvando...' : 'Redefinir'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog desativar */}
      <ConfirmDialog
        open={!!confirm}
        title="Desativar usuário?"
        message="O usuário não conseguirá mais acessar o sistema. Esta ação pode ser revertida editando o usuário."
        confirmLabel="Desativar"
        onConfirm={() => deleteMutation.mutate(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
