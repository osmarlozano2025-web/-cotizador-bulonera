import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarAprobaciones } from '../utils/aprobaciones'

const TABS = [
  { key: 'espera', label: 'En espera', estados: ['esperando_confirmacion'] },
  { key: 'aprobadas', label: 'Aprobadas', estados: ['confirmado'] },
]

export default function Cotizaciones() {
  const [pedidos, setPedidos] = useState([])
  const [tab, setTab] = useState('espera')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    listarAprobaciones().then(setPedidos).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const tabActivo = TABS.find(t => t.key === tab)
  const filtrados = pedidos.filter(p => tabActivo.estados.includes(p.estado))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Cotizaciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">Pedidos aprobados internamente y enviados al cliente</p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.key ? 'border-blue-700 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {t.label} ({pedidos.filter(p => t.estados.includes(p.estado)).length})
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white/5 border rounded-xl p-10 text-center">
          {tab === 'espera'
            ? 'No hay cotizaciones esperando confirmación del cliente.'
            : 'Todavía no hay cotizaciones confirmadas por el cliente.'}
        </p>
      ) : (
        <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Fecha</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Cliente</th>
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Ítems</th>
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Descuento</th>
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Total</th>
                {tab === 'aprobadas' && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(p => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-2.5 text-slate-300">
                    {new Date(p.fechaCreacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{p.clienteNombre || 'Sin cliente'}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">
                    {p.subpedidos.reduce((s, sub) => s + sub.items.length, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{p.descuento ? `${p.descuento}%` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">
                    ${p.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  {tab === 'aprobadas' && (
                    <td className="px-4 py-2.5 text-right">
                      <Link to={`/proforma/${p.token}`} className="text-xs text-sky-400 hover:underline font-medium">
                        Ver proforma
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
