import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { primeraRutaPermitida } from '../utils/secciones'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      const usuarioLogueado = await login(usuario, password)
      const destinoSolicitado = location.state?.from
      const puedeVerDestino = destinoSolicitado && usuarioLogueado.permisos?.secciones?.some(
        s => destinoSolicitado === '/' ? s === 'nuevo-pedido' : destinoSolicitado.startsWith(`/${s}`)
      )
      const destino = puedeVerDestino ? destinoSolicitado : primeraRutaPermitida(usuarioLogueado)
      navigate(destino || '/', { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white border rounded-xl shadow-sm p-8 w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <p className="text-xl font-bold text-blue-900">Córdoba Bulones</p>
          <p className="text-xs text-gray-400">Panel interno</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Usuario</label>
          <input
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            autoFocus
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
