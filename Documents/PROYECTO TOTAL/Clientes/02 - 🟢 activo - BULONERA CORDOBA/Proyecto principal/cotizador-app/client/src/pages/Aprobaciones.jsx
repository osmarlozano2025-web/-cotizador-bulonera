import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  listarAprobaciones, aprobarFamilia, marcarEnviado,
  FAMILIAS_LABEL, linkConfirmacion, linkWhatsApp, linkGmail, linkOutlook,
} from '../utils/aprobaciones'
import { useAuth } from '../context/AuthContext'

function TablaItems({ items }) {
  return (
    <table className="w-full text-xs">
      <tbody className="divide-y divide-gray-100">
        {items.map((it, i) => (
          <tr key={i}>
            <td className="py-1.5 pr-2">{it.cantidad}×</td>
            <td className="py-1.5 pr-2">{it.descripcion}</td>
            <td className="py-1.5 text-gray-400">{it.medida || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EnviarCliente({ pedido, onEnviado }) {
  const [copiado, setCopiado] = useState(false)
  const link = linkConfirmacion(pedido.token)

  const marcar = async () => { try { await marcarEnviado(pedido.id) } catch {} onEnviado?.() }

  const copiar = async () => {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-green-800">✓ Aprobado internamente — listo para enviar al cliente</p>
      <div className="flex flex-wrap gap-2">
        <a href={linkWhatsApp(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por WhatsApp
        </a>
        <a href={linkGmail(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por Gmail
        </a>
        <a href={linkOutlook(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por Outlook
        </a>
        <button onClick={() => { copiar(); marcar() }}
          className="border border-gray-300 hover:bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-2 rounded-lg transition">
          {copiado ? '✓ Copiado' : 'Copiar link'}
        </button>
      </div>
      {pedido.fechaEnvioCliente && (
        <p className="text-xs text-green-600">Enviado el {new Date(pedido.fechaEnvioCliente).toLocaleString('es-AR')}</p>
      )}
    </div>
  )
}

function TarjetaPedido({ pedido, recargar, puedeAprobar, puedeEnviar }) {
  const [aprobando, setAprobando] = useState(null)

  const aprobar = async (familia) => {
    setAprobando(familia)
    try { await aprobarFamilia(pedido.id, familia) } catch {}
    setAprobando(null)
    recargar()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">{pedido.clienteNombre}</p>
          <p className="text-xs text-gray-400">
            {new Date(pedido.fechaCreacion).toLocaleString('es-AR')} · ${pedido.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {pedido.subpedidos.map(sub => (
          <div key={sub.familia} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {FAMILIAS_LABEL[sub.familia] || sub.familia} · Depósito
              </p>
              {sub.aprobado ? (
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                  ✓ Aprobado
                </span>
              ) : puedeAprobar ? (
                <button
                  onClick={() => aprobar(sub.familia)}
                  disabled={aprobando === sub.familia}
                  className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded px-3 py-1 transition"
                >
                  {aprobando === sub.familia ? 'Aprobando...' : 'Aprobar stock'}
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  Esperando aprobación
                </span>
              )}
            </div>
            <TablaItems items={sub.items} />
          </div>
        ))}
      </div>

      {pedido.estado === 'esperando_confirmacion' && puedeEnviar && (
        <div className="p-4 border-t">
          <EnviarCliente pedido={pedido} onEnviado={recargar} />
        </div>
      )}
    </div>
  )
}

export default function Aprobaciones() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const { state } = useLocation()
  const { user } = useAuth()
  const puedeAprobar = user?.permisos?.puedeAprobarFamilias ?? false
  const puedeEnviar = user?.permisos?.puedeEnviarCliente ?? false

  const cargar = () => {
    listarAprobaciones().then(data => { setPedidos(data); setCargando(false) }).catch(() => setCargando(false))
  }

  useEffect(cargar, [])

  const pendientes = pedidos.filter(p => p.estado !== 'confirmado')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Aprobaciones</h2>
        <p className="text-sm text-gray-400 mt-0.5">Pedidos separados por depósito, pendientes de aprobar stock o de confirmar con el cliente</p>
      </div>

      {state?.creado && (
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          Pedido enviado a aprobación correctamente.
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white border rounded-xl p-10 text-center">
          No hay pedidos pendientes de aprobación.
        </p>
      ) : (
        <div className="space-y-4">
          {pendientes.map(p => (
            <TarjetaPedido key={p.id} pedido={p} recargar={cargar} puedeAprobar={puedeAprobar} puedeEnviar={puedeEnviar} />
          ))}
        </div>
      )}
    </div>
  )
}
