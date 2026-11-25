import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { esSoloLectura } from './utils/roles'
import RequireAuth from './components/RequireAuth'
import Sidebar from './components/Sidebar'
import Watermark from './components/Watermark'
import NuevoPedido from './pages/NuevoPedido'
import VistaPrevia from './pages/VistaPrevia'
import Clientes from './pages/Clientes'
import Aprobaciones from './pages/Aprobaciones'
import Cotizaciones from './pages/Cotizaciones'
import Productos from './pages/Productos'
import Integraciones from './pages/Integraciones'
import Personal from './pages/Personal'
import Configuraciones from './pages/Configuraciones'
import Proforma from './pages/Proforma'
import NotaDeposito from './pages/NotaDeposito'
import Login from './pages/Login'
import Registro from './pages/Registro'
import VerificarEmail from './pages/VerificarEmail'

/**
 * Aviso fijo para quien entra en modo sólo lectura.
 *
 * Las pantallas se muestran enteras, con sus botones: el backend es el que
 * corta la escritura. Sin este cartel, el primer intento de guardar sería un
 * error rojo sin explicación — así se sabe de entrada y en todas las
 * pantallas, no sólo en la que se llegó a tocar.
 */
function AvisoSoloLectura() {
  const { user } = useAuth()
  if (!esSoloLectura(user)) return null

  return (
    <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
      👁 Estás en <strong>modo sólo lectura</strong>: podés ver todo, pero los cambios no se van a guardar.
    </div>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <AvisoSoloLectura />
          {children}
        </div>
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
        <Route path="/registro" element={<Registro />} />
        <Route path="/verificar-email/:tipo/:token" element={<VerificarEmail />} />
        <Route path="/proforma/:token" element={<RequireAuth><Proforma /></RequireAuth>} />
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
      <Watermark />
    </AuthProvider>
  )
}
