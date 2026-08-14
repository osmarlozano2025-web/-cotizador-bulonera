import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Sidebar from './components/Sidebar'
import NuevoPedido from './pages/NuevoPedido'
import VistaPrevia from './pages/VistaPrevia'
import Clientes from './pages/Clientes'
import Aprobaciones from './pages/Aprobaciones'
import Cotizaciones from './pages/Cotizaciones'
import Productos from './pages/Productos'
import Integraciones from './pages/Integraciones'
import Personal from './pages/Personal'
import Configuraciones from './pages/Configuraciones'
import ConfirmarPedido from './pages/ConfirmarPedido'
import Proforma from './pages/Proforma'
import NotaDeposito from './pages/NotaDeposito'
import Login from './pages/Login'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 py-6">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

function Pagina({ seccion, children }) {
  return (
    <RequireAuth seccion={seccion}>
      <Layout>{children}</Layout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/confirmar/:token" element={<ConfirmarPedido />} />
        <Route path="/proforma/:token" element={<Proforma />} />
        <Route path="/" element={<Pagina seccion="nuevo-pedido"><NuevoPedido /></Pagina>} />
        <Route path="/vista-previa" element={<Pagina seccion="nuevo-pedido"><VistaPrevia /></Pagina>} />
        <Route path="/aprobaciones" element={<Pagina seccion="aprobaciones"><Aprobaciones /></Pagina>} />
        <Route path="/nota-deposito/:id" element={<Pagina seccion="aprobaciones"><NotaDeposito /></Pagina>} />
        <Route path="/cotizaciones" element={<Pagina seccion="cotizaciones"><Cotizaciones /></Pagina>} />
        <Route path="/clientes" element={<Pagina seccion="clientes"><Clientes /></Pagina>} />
        <Route path="/productos" element={<Pagina seccion="productos"><Productos /></Pagina>} />
        <Route path="/integraciones" element={<Pagina seccion="integraciones"><Integraciones /></Pagina>} />
        <Route path="/personal" element={<Pagina seccion="personal"><Personal /></Pagina>} />
        <Route path="/configuraciones" element={<Pagina seccion="configuraciones"><Configuraciones /></Pagina>} />
      </Routes>
    </AuthProvider>
  )
}
