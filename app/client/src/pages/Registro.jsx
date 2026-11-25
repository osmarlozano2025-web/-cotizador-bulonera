import { useState } from 'react'
import { Link } from 'react-router-dom'

/** Alta del personal. Los clientes no tienen cuenta: no ingresan a la aplicación. */
async function registrarPersonal({ nombre, email, password }) {
  const res = await fetch('/api/auth/registrar-personal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al registrarse')
  return data
}

export default function Registro() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8) { setError('La contraseña tiene que tener al menos 8 caracteres'); return }
    setCargando(true)
    try {
      await registrarPersonal({ nombre, email, password })
      setEnviado(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm tarjeta p-7 text-center space-y-3">
          <p className="text-2xl">📬</p>
          <p className="text-slate-100 font-semibold">Revisá tu correo</p>
          <p className="text-sm text-slate-400">
            Te mandamos un mail para confirmar tu cuenta. Hasta que no lo confirmes no vas a poder ingresar.
          </p>
          <Link to="/login" className="inline-block text-sky-400 hover:text-sky-300 text-sm font-medium mt-2">Volver al login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
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
            <p className="text-[11px] text-slate-400">Crear cuenta del equipo</p>
          </div>
        </div>

        <form onSubmit={submit} className="tarjeta p-7 space-y-4">
          <div>
            <label className="etiqueta block mb-1.5">Nombre y apellido</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus className="campo" />
          </div>
          <div>
            <label className="etiqueta block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              autoComplete="email" className="campo" />
          </div>
          <div>
            <label className="etiqueta block mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              autoComplete="new-password" className="campo" />
          </div>
          <div>
            <label className="etiqueta block mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required
              autoComplete="new-password" className="campo" />
          </div>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={cargando} className="btn-primario w-full py-2.5">
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          ¿Ya tenés cuenta? <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">Ingresar</Link>
        </p>
      </div>
    </div>
  )
}
