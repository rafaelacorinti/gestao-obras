import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import EsqueciSenhaPage from './pages/auth/EsqueciSenhaPage'
import RedefinirSenhaPage from './pages/auth/RedefinirSenhaPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ColaboradoresPage from './pages/colaboradores/ColaboradoresPage'
import ColaboradorPerfilPage from './pages/colaboradores/ColaboradorPerfilPage'
import MobilizacaoPage from './pages/mobilizacao/MobilizacaoPage'
import PassagensPage from './pages/passagens/PassagensPage'
import CustosPage from './pages/custos/CustosPage'
import AlojamentoPage from './pages/custos/AlojamentoPage'
import ObrasPage from './pages/obras/ObrasPage'
import RelatoriosPage from './pages/relatorios/RelatoriosPage'
import RelatorioColaboradorPage from './pages/relatorios/RelatorioColaboradorPage'
import RelatorioObraPage from './pages/relatorios/RelatorioObraPage'
import ImportPage from './pages/ImportPage'
import UsuariosPage from './pages/usuarios/UsuariosPage'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.perfil !== 'administrador') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="obras" element={<ObrasPage />} />
            <Route path="colaboradores" element={<ColaboradoresPage />} />
            <Route path="colaboradores/:id" element={<ColaboradorPerfilPage />} />
            <Route path="mobilizacao" element={<MobilizacaoPage />} />
            <Route path="passagens" element={<PassagensPage />} />
            <Route path="custos" element={<CustosPage />} />
            <Route path="alojamento" element={<AlojamentoPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="relatorios/colaborador" element={<RelatorioColaboradorPage />} />
            <Route path="relatorios/obra" element={<RelatorioObraPage />} />
            <Route path="importar" element={<ImportPage />} />
            <Route path="usuarios" element={<PrivateRoute adminOnly><UsuariosPage /></PrivateRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
