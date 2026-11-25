import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function VerificarEmail() {
  const { tipo, token } = useParams()
  const [estado, setEstado] = useState('cargando') // 'cargando' | 'ok' | 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/auth/verificar-personal/${token}`, { method: 'POST' })
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'No se pudo confirmar el email')
        setEstado('ok')
      })
      .catch(e => { setError(e.message); setEstado('error') })
  }, [tipo, token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm tarjeta p-7 text-center space-y-3">
        {estado === 'cargando' && <p className="text-slate-300">Confirmando tu cuenta...</p>}

        {estado === 'ok' && (
          <>
            <p className="text-2xl">✅</p>
            <p className="text-slate-100 font-semibold">Cuenta confirmada</p>
            <p className="text-sm text-slate-400">
              Ya podés ingresar. Un administrador te va a asignar los permisos.
            </p>
          </>
        )}

        {estado === 'error' && (
          <>
            <p className="text-2xl">⚠️</p>
            <p className="text-slate-100 font-semibold">No pudimos confirmar tu cuenta</p>
            <p className="text-sm text-rose-300">{error}</p>
          </>
        )}

        <Link to="/login" className="inline-block text-sky-400 hover:text-sky-300 text-sm font-medium mt-2">Ir al login</Link>
      </div>
    </div>
  )
}
