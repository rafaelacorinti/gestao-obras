import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { CheckCircle, XCircle, Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const INITIAL = { nome: '', email: '', senha: '', perfil: 'financeiro', ativo: true, obras_ids: [] }

const PERFIL_BADGE = {
  administrador: 'bg-red-100 text-red-700',
  financeiro: 'bg-blue-100 text-blue-700',
  engenheiro: 'bg-green-100 text-green-700',
}

export default function UsuariosPage() {
  const [tab, setTab] = useState('ativos')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [confirm, setConfirm] = useState(null)
  // Modal de aprovação
  const [aprovando, setAprovando] = useState(null)
  const [obrasAprovacao, setObrasAprovacao] = useState({})
  const qc = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const { data: todasObras = [] } = useQuery({
    queryKey: ['obras-list'],
    queryFn: () => api.get('/obras').then(r => r.data)
  })

  const ativos = usuarios.filter(u => u.ativo)
  const pendentes = usuarios.filter(u => !u.ativo)

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/users/${editItem.id}`, d) : api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Salvo!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro')
  })

  const aprovaMutation = useMutation({
    mutationFn: ({ id, obras_ids }) => api.put(`/users/${id}`, { ativo: true, obras_ids }),
    onSuccess: () => { qc.invalidateQueries(['usuarios']); toast.success('Usuário aprovado!'); setAprovando(null) },
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
    setForm(item ? {
      nome: item.nome, email: item.email, senha: '', perfil: item.perfil,
      ativo: item.ativo, obras_ids: (item.obras_permitidas || []).map(o => o.id)
    } : INITIAL)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(INITIAL) }

  const toggleObra = (id, arr, setArr) => {
    setArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const confirmarAprovacao = () => {
    aprovaMutation.mutate({ id: aprovando.id, obras_ids: obrasAprovacao })
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
                <th className="table-header text-left">Obras Permitidas</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ativos.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum usuário ativo</td></tr>
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
                  <td className="table-cell">
                    {u.perfil === 'administrador' ? (
                      <span className="badge bg-red-100 text-red-700">Todas as obras</span>
                    ) : u.obras_permitidas?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.obras_permitidas.map(o => (
                          <span key={o.id} className="badge bg-gray-100 text-gray-600 text-xs">{o.nome}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Nenhuma obra</span>
                    )}
                  </td>
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
            <div key={u.id} className="card space-y-3">
              {/* Info do usuário */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{u.nome?.charAt(0)}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{u.nome}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <span className={`badge mt-1 ${PERFIL_BADGE[u.perfil]}`}>{u.perfil}</span>
                </div>
              </div>

              {/* Seleção de obras inline */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selecionar obras para liberar acesso:</p>
                {todasObras.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhuma obra cadastrada</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {todasObras.map(obra => {
                      const selecionadas = obrasAprovacao[u.id] || []
                      const marcada = selecionadas.includes(obra.id)
                      return (
                        <button
                          key={obra.id}
                          type="button"
                          onClick={() => setObrasAprovacao(prev => {
                            const atual = prev[u.id] || []
                            return {
                              ...prev,
                              [u.id]: marcada ? atual.filter(x => x !== obra.id) : [...atual, obra.id]
                            }
                          })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${marcada ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                        >
                          <Building2 size={13} />
                          {obra.nome}
                          {marcada && <CheckCircle size={13} />}
                        </button>
                      )
                    })}
                  </div>
                )}
                {(obrasAprovacao[u.id] || []).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Sem obras selecionadas, o usuário não verá nenhum dado</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => aprovaMutation.mutate({ id: u.id, obras_ids: obrasAprovacao[u.id] || [] })}
                  disabled={aprovaMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <CheckCircle size={15} /> Aprovar
                </button>
                <button
                  onClick={() => recusaMutation.mutate(u.id)}
                  disabled={recusaMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors font-medium">
                  <XCircle size={15} /> Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Aprovação com seleção de obras */}
      <Modal open={!!aprovando} title="Aprovar usuário — selecionar obras" onClose={() => setAprovando(null)} size="md">
        {aprovando && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{aprovando.nome?.charAt(0)}</div>
              <div>
                <p className="font-semibold text-gray-900">{aprovando.nome}</p>
                <p className="text-sm text-gray-500">{aprovando.email} · <span className={`badge ${PERFIL_BADGE[aprovando.perfil]}`}>{aprovando.perfil}</span></p>
              </div>
            </div>

            <div>
              <p className="label mb-2">Selecione as obras que este usuário pode acessar:</p>
              {todasObras.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhuma obra cadastrada ainda</p>
              ) : (
                <div className="border border-gray-200 rounded-xl divide-y max-h-64 overflow-y-auto">
                  {todasObras.map(obra => (
                    <label key={obra.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600"
                        checked={obrasAprovacao.includes(obra.id)}
                        onChange={() => toggleObra(obra.id, obrasAprovacao, setObrasAprovacao)}
                      />
                      <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{obra.nome}</p>
                        {obra.cliente && <p className="text-xs text-gray-400">{obra.cliente}</p>}
                      </div>
                      <span className={`badge text-xs ${obra.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{obra.status}</span>
                    </label>
                  ))}
                </div>
              )}
              {obrasAprovacao.length > 0 && (
                <p className="text-sm text-blue-600 mt-2 font-medium">{obrasAprovacao.length} obra(s) selecionada(s)</p>
              )}
              {obrasAprovacao.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">⚠️ Sem obras selecionadas, o usuário não verá nenhum dado</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAprovando(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={confirmarAprovacao}
                disabled={aprovaMutation.isPending}
                className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700">
                {aprovaMutation.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal editar/criar usuário */}
      <Modal open={showModal} title={`${editItem ? 'Editar' : 'Novo'} Usuário`} onClose={closeModal}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Nome *</label><input className="input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">{editItem ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
            <input type="password" className="input" minLength={6} required={!editItem} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
          </div>
          <div><label className="label">Perfil</label>
            <select className="input" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
              <option value="administrador">Administrador</option>
              <option value="financeiro">Financeiro</option>
              <option value="engenheiro">Engenheiro</option>
            </select>
          </div>
          {form.perfil !== 'administrador' && (
            <div>
              <label className="label">Obras Permitidas</label>
              <div className="border border-gray-200 rounded-xl divide-y max-h-48 overflow-y-auto">
                {todasObras.map(obra => (
                  <label key={obra.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-blue-600"
                      checked={form.obras_ids.includes(obra.id)}
                      onChange={() => setForm(f => ({
                        ...f,
                        obras_ids: f.obras_ids.includes(obra.id)
                          ? f.obras_ids.filter(x => x !== obra.id)
                          : [...f.obras_ids, obra.id]
                      }))}
                    />
                    <span className="text-sm text-gray-900">{obra.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
