import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HardHat, ArrowLeft, Mail } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <HardHat className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">GestaoObras</h1>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {enviado ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email enviado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Se o email <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir a senha em instantes.
              </p>
              <p className="text-xs text-gray-400 mb-6">Verifique também a caixa de spam.</p>
              <Link to="/login" className="btn-primary w-full justify-center">Voltar para o login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Esqueci minha senha</h2>
              <p className="text-sm text-gray-500 mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email cadastrado</label>
                  <input type="email" className="input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-6">
                <ArrowLeft size={14} /> Voltar para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
