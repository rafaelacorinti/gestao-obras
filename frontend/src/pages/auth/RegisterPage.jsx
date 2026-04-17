import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HardHat, Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'financeiro' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Solicitação enviada! Aguarde a aprovação do administrador.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const F = (key) => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <HardHat className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">GestaoObras</h1>
          <p className="text-gray-400 mt-1 text-sm">Solicitar acesso ao sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-6">Sua solicitação será analisada pelo administrador antes de liberar o acesso.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" placeholder="Seu nome" required {...F('nome')} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="seu@email.com" required {...F('email')} />
            </div>
            <div>
              <label className="label">Senha *</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="Mínimo 6 caracteres" required minLength={6} {...F('senha')} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Perfil desejado *</label>
              <select className="input" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
                <option value="diretor">Diretor</option>
                <option value="financeiro">Financeiro</option>
                <option value="engenheiro">Engenheiro</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
              {loading ? 'Enviando...' : 'Solicitar Acesso'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem acesso?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
