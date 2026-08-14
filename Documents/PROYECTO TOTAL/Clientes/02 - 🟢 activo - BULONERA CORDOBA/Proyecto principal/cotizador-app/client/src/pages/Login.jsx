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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(1100px 600px at 15% -10%, var(--cb-700) 0%, transparent 55%), var(--cb-900)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
            style={{ backgroundColor: 'var(--cb-600)' }}
          >
            CB
          </div>
          <div>
            <p className="text-lg font-semibold text-white leading-tight">Córdoba Bulones</p>
            <p className="text-[11px] text-slate-400">Ferretería Industrial</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-2xl p-7 space-y-4 border border-white/10"
        >
          <div>
            <label className="etiqueta block mb-1.5">Usuario</label>
            <input
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              autoFocus
              autoComplete="username"
              className="campo"
            />
          </div>

          <div>
            <label className="etiqueta block mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="campo"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={cargando} className="btn-primario w-full py-2.5">
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500 mt-5">Panel interno</p>
      </div>
    </div>
  )
}
