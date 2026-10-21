import { useEffect, useState } from 'react'
import { authHeaders } from '../context/AuthContext'

async function req(url, options) {
  const token = localStorage.getItem('cb_token')
  const res = await fetch(url, { ...options, headers: { ...authHeaders(token), ...(options?.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)
  return data
}

function CampoClave({ titulo, descripcion, mascara, configurada, onGuardar }) {
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  const guardar = async () => {
    if (!valor) return
    setGuardando(true)
    try {
      await onGuardar(valor)
      setValor('')
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-xl shadow-sm border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-100 text-sm">{titulo}</p>
          <p className="text-xs text-slate-400">{descripcion}</p>
        </div>
        <span className={`text-xs font-semibold rounded px-2 py-0.5 border ${
          configurada ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-400 border-white/10'
        }`}>
          {configurada ? '✓ Configurada' : 'Sin configurar'}
        </span>
      </div>

      {configurada && <p className="text-xs text-slate-400">Actual: <span className="font-mono">{mascara}</span></p>}

      <div className="flex gap-2">
        <input
          type="password"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder={configurada ? 'Reemplazar por una nueva clave...' : 'Pegar la API key...'}
          className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]"
        />
        <button
          onClick={guardar}
          disabled={!valor || guardando}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      {ok && <p className="text-xs text-emerald-400">✓ Clave actualizada</p>}
    </div>
  )
}

/** Dónde está el Tango (dirección, empresa, túnel) y un botón para ver si responde. */
function ConexionTango({ datos, onCambio }) {
  const [url, setUrl] = useState(datos.tangoUrl || '')
  const [empresa, setEmpresa] = useState(datos.tangoEmpresa || '7')
  const [clavePuente, setClavePuente] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const guardar = async () => {
    setGuardando(true)
    setResultado(null)
    try {
      const cuerpo = { tangoUrl: url, tangoEmpresa: empresa }
      if (clavePuente) cuerpo.tangoClavePuente = clavePuente
      await req('/api/integraciones', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
      })
      setClavePuente('')
      setResultado({ ok: true, texto: 'Guardado' })
      onCambio()
    } catch (e) {
      setResultado({ ok: false, texto: e.message })
    } finally {
      setGuardando(false)
    }
  }

  const probar = async () => {
    setProbando(true)
    setResultado(null)
    try {
      await req('/api/integraciones/tango/probar', { method: 'POST' })
      setResultado({ ok: true, texto: 'Tango respondió: la dirección, el token y la empresa andan' })
    } catch (e) {
      setResultado({ ok: false, texto: e.message })
    } finally {
      setProbando(false)
    }
  }

  const clase = 'w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]'

  return (
    <div className="bg-white/5 rounded-xl shadow-sm border p-5 space-y-3">
      <div>
        <p className="font-semibold text-slate-100 text-sm">Tango — conexión</p>
        <p className="text-xs text-slate-400">
          Cómo llega la app al Tango de la bulonera: por el puente de Cloudflare (un Worker que pasa por un túnel hasta su
          servidor). El nombre &quot;servidor&quot; sólo funciona dentro del local.
        </p>
      </div>

      <label className="block text-xs text-slate-400">
        Dirección del puente
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://puente-tango-bulonera.….workers.dev" className={`${clase} mt-1`} />
      </label>
      <label className="block text-xs text-slate-400">
        Empresa (número)
        <input value={empresa} onChange={e => setEmpresa(e.target.value)} className={`${clase} mt-1`} />
      </label>
      <label className="block text-xs text-slate-400">
        Clave del puente{datos.tangoPuenteConfigurado ? ' — ya cargada; escribí otra sólo para cambiarla' : ''}
        <input type="password" value={clavePuente} onChange={e => setClavePuente(e.target.value)} placeholder="La misma que tiene el Worker" className={`${clase} mt-1`} />
      </label>

      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={guardar} disabled={guardando || !url}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={probar} disabled={probando || !datos.tangoConfigurada || !datos.tangoUrl}
          className="border border-white/20 text-slate-100 hover:bg-white/10 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg text-sm transition">
          {probando ? 'Probando...' : 'Probar conexión'}
        </button>
        {resultado && (
          <span className={`text-xs ${resultado.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{resultado.ok ? '✓ ' : ''}{resultado.texto}</span>
        )}
      </div>
    </div>
  )
}

export default function Integraciones() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  const cargar = () => req('/api/integraciones').then(setDatos).catch(e => setError(e.message))
  useEffect(() => { cargar() }, [])

  const guardarOpenAI = (valor) => req('/api/integraciones', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiApiKey: valor }),
  }).then(cargar)

  const guardarTango = (valor) => req('/api/integraciones', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tangoApiKey: valor }),
  }).then(cargar)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Integraciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">Claves de API usadas por el sistema</p>
      </div>

      {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {datos && (
        <div className="space-y-4">
          <CampoClave
            titulo="OpenAI"
            descripcion="Usada para interpretar fotos de pedidos manuscritos (carga de pedido por foto)."
            mascara={datos.openaiApiKey}
            configurada={datos.openaiConfigurada}
            onGuardar={guardarOpenAI}
          />
          <ConexionTango datos={datos} onCambio={cargar} />
          <CampoClave
            titulo="Tango — token de la API"
            descripcion="El token de desarrollador de Tango Delta (header ApiAuthorization)."
            mascara={datos.tangoApiKey}
            configurada={datos.tangoConfigurada}
            onGuardar={guardarTango}
          />
        </div>
      )}
    </div>
  )
}
