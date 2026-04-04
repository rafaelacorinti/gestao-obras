import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { HardHat, Eye, EyeOff, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function RedefinirSenhaPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (senha !== confirma) return toast.error('As senhas não coincidem')
    if (senha.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres')
    setLoading(true)
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      setSucesso(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Link inválido ou expirado')
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
          {sucesso ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
              <p className="text-gray-500 text-sm">Redirecionando para o login...</p>
            </div>
          ) : !token ? (
            <div className="text-center">
              <p className="text-red-500 mb-4">Link inválido ou expirado.</p>
              <Link to="/esqueci-senha" className="text-blue-600 font-semibold hover:underline">Solicitar novo link</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Redefinir senha</h2>
              <p className="text-sm text-gray-500 mb-6">Digite sua nova senha abaixo.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
                    <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input type={show ? 'text' : 'password'} className="input" placeholder="Repita a senha" value={confirma} onChange={e => setConfirma(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
