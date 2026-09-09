import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { primeraRutaPermitida } from '../utils/secciones'

export default function RequireAuth({ seccion, children }) {
  const { user, listo, tieneSeccion } = useAuth()
  const location = useLocation()

  if (!listo) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  if (seccion && !tieneSeccion(seccion)) {
    const rutaValida = primeraRutaPermitida(user)
    if (rutaValida && rutaValida !== location.pathname) {
      return <Navigate to={rutaValida} replace />
    }
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white/5 border rounded-xl p-8 text-center max-w-sm">
          <p className="text-slate-200 font-medium">Todavía no tenés ninguna sección habilitada. Pedile a un administrador que te asigne permisos.</p>
        </div>
      </div>
    )
  }

  return children
}
