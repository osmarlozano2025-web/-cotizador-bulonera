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
    <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{titulo}</p>
          <p className="text-xs text-gray-400">{descripcion}</p>
        </div>
        <span className={`text-xs font-semibold rounded px-2 py-0.5 border ${
          configurada ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
        }`}>
          {configurada ? '✓ Configurada' : 'Sin configurar'}
        </span>
      </div>

      {configurada && <p className="text-xs text-gray-400">Actual: <span className="font-mono">{mascara}</span></p>}

      <div className="flex gap-2">
        <input
          type="password"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder={configurada ? 'Reemplazar por una nueva clave...' : 'Pegar la API key...'}
          className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={guardar}
          disabled={!valor || guardando}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      {ok && <p className="text-xs text-green-600">✓ Clave actualizada</p>}
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
        <h2 className="text-2xl font-bold text-gray-800">Integraciones</h2>
        <p className="text-sm text-gray-400 mt-0.5">Claves de API usadas por el sistema</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {datos && (
        <div className="space-y-4">
          <CampoClave
            titulo="OpenAI"
            descripcion="Usada para interpretar fotos de pedidos manuscritos (carga de pedido por foto)."
            mascara={datos.openaiApiKey}
            configurada={datos.openaiConfigurada}
            onGuardar={guardarOpenAI}
          />
          <CampoClave
            titulo="Tango 5"
            descripcion="Conexión con el ERP Tango para sincronizar productos y stock. La conexión en sí todavía no está implementada — por ahora solo se guarda la clave."
            mascara={datos.tangoApiKey}
            configurada={datos.tangoConfigurada}
            onGuardar={guardarTango}
          />
        </div>
      )}
    </div>
  )
}
