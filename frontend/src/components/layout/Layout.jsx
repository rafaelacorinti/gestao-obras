import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, HardHat, Users, Plane, DollarSign,
  Home, FileText, Upload, Building2, LogOut, Menu, X,
  UserCog, ChevronDown, ChevronRight, KeyRound
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import Modal from '../ui/Modal'
import toast from 'react-hot-toast'
import api from '../../services/api'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/obras', label: 'Obras', icon: Building2 },
  { to: '/colaboradores', label: 'Colaboradores', icon: Users },
  { to: '/mobilizacao', label: 'Mobilização', icon: HardHat },
  { to: '/passagens', label: 'Passagens', icon: Plane },
  { to: '/custos', label: 'Custos', icon: DollarSign },
  { to: '/alojamento', label: 'Alojamento', icon: Home },
  {
    label: 'Relatórios', icon: FileText, children: [
      { to: '/relatorios', label: 'Mensal' },
      { to: '/relatorios/colaborador', label: 'Por Colaborador' },
      { to: '/relatorios/obra', label: 'Por Obra' },
    ]
  },
  { to: '/importar', label: 'Importar Planilha', icon: Upload },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
]

function NavItem({ item, onClick }) {
  const [open, setOpen] = useState(false)
  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <item.icon size={18} />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map(child => (
              <NavLink key={child.to} to={child.to} onClick={onClick}
                className={({ isActive }) => clsx('block px-3 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <NavLink to={item.to} onClick={onClick}
      className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
      <item.icon size={18} />
      {item.label}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [senhaModal, setSenhaModal] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' })
  const [savingSenha, setSavingSenha] = useState(false)

  const navItems = NAV.filter(n => !n.adminOnly || user?.perfil === 'administrador')

  const handleLogout = () => { logout(); navigate('/login') }

  const handleSenha = async (e) => {
    e.preventDefault()
    if (senhaForm.nova_senha !== senhaForm.confirmar) return toast.error('As senhas não coincidem')
    setSavingSenha(true)
    try {
      await api.put('/auth/senha', { senha_atual: senhaForm.senha_atual, nova_senha: senhaForm.nova_senha })
      toast.success('Senha alterada com sucesso!')
      setSenhaModal(false)
      setSenhaForm({ senha_atual: '', nova_senha: '', confirmar: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setSavingSenha(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx('fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <HardHat className="text-blue-400" size={24} />
            <div>
              <p className="text-white font-bold text-lg leading-none">GestaoObras</p>
              <p className="text-gray-400 text-xs">Sistema de Gestão</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item, i) => <NavItem key={i} item={item} onClick={() => setSidebarOpen(false)} />)}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.nome}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.perfil}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSenhaModal(true)} className="flex-1 flex items-center gap-2 text-gray-400 hover:text-yellow-400 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <KeyRound size={14} /> Senha
            </button>
            <button onClick={handleLogout} className="flex-1 flex items-center gap-2 text-gray-400 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500"><Menu size={22} /></button>
          <div className="flex items-center gap-2">
            <HardHat className="text-blue-600" size={20} />
            <span className="font-bold text-gray-900">GestaoObras</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
      </div>

      {/* Modal trocar senha */}
      <Modal open={senhaModal} title="Alterar Senha" onClose={() => setSenhaModal(false)} size="sm">
        <form onSubmit={handleSenha} className="space-y-4">
          <div>
            <label className="label">Senha Atual</label>
            <input type="password" className="input" required value={senhaForm.senha_atual} onChange={e => setSenhaForm(f => ({ ...f, senha_atual: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nova Senha</label>
            <input type="password" className="input" required minLength={6} value={senhaForm.nova_senha} onChange={e => setSenhaForm(f => ({ ...f, nova_senha: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirmar Nova Senha</label>
            <input type="password" className="input" required value={senhaForm.confirmar} onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSenhaModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={savingSenha} className="btn-primary flex-1 justify-center">
              {savingSenha ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
