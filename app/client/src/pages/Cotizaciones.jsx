import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarAprobaciones, obtenerConfiguraciones } from '../utils/aprobaciones'

/**
 * En espera = lo que está en los depósitos para que aprueben el stock. Es lo
 * que ya cargaron los vendedores y todavía no se pudo facturar.
 * Aprobadas = lo que los depósitos ya aprobaron: queda listo para facturar.
 */
const TABS = [
  { key: 'espera', label: 'En espera', estados: ['en_aprobacion'] },
  { key: 'aprobadas', label: 'Aprobadas', estados: ['confirmado'] },
]

const dinero = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

/** Estado de cada depósito en un pedido: cuáles ya aprobaron y cuáles faltan. */
function estadoPorDeposito(pedido, depositos) {
  return (depositos || [])
    .map(dep => {
      const subs = (pedido.subpedidos || []).filter(s => (dep.familias || []).includes(s.familia))
      if (!subs.length) return null
      return { numero: dep.numero, nombre: dep.nombre, aprobado: subs.every(s => s.aprobado) }
    })
    .filter(Boolean)
}

export default function Cotizaciones() {
  const [pedidos, setPedidos] = useState([])
  const [config, setConfig] = useState(null)
  const [tab, setTab] = useState('espera')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    listarAprobaciones().then(setPedidos).catch(() => {}).finally(() => setCargando(false))
    obtenerConfiguraciones().then(setConfig).catch(() => {})
  }, [])

  const tabActivo = TABS.find(t => t.key === tab)
  const filtrados = pedidos.filter(p => tabActivo.estados.includes(p.estado))

  // Cuántos pedidos y cuántos renglones espera cada cliente.
  const porCliente = useMemo(() => {
    const mapa = new Map()
    for (const p of pedidos.filter(x => x.estado === 'en_aprobacion')) {
      const clave = p.clienteId || p.clienteNombre
      const renglones = (p.subpedidos || []).reduce((s, sub) => s + sub.items.length, 0)
      const actual = mapa.get(clave) || { nombre: p.clienteNombre || 'Sin cliente', pedidos: 0, renglones: 0 }
      actual.pedidos += 1
      actual.renglones += renglones
      mapa.set(clave, actual)
    }
    return [...mapa.values()].sort((a, b) => b.pedidos - a.pedidos || b.renglones - a.renglones)
  }, [pedidos])

  const totalEspera = pedidos.filter(p => p.estado === 'en_aprobacion').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Cotizaciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">Pedidos cargados: los que esperan la aprobación de los depósitos y los que ya están listos para facturar</p>
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

      {tab === 'espera' && porCliente.length > 0 && (
        <div className="bg-white/5 rounded-xl border p-4">
          <p className="text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200">{totalEspera}</span> pedido{totalEspera === 1 ? '' : 's'} en depósito, de{' '}
            <span className="font-semibold text-slate-200">{porCliente.length}</span> cliente{porCliente.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            {porCliente.map(c => (
              <span key={c.nombre} className="text-xs rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-200 px-2.5 py-1">
                {c.nombre} · {c.pedidos} pedido{c.pedidos === 1 ? '' : 's'} · {c.renglones} {c.renglones === 1 ? 'renglón' : 'renglones'}
              </span>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white/5 border rounded-xl p-10 text-center">
          {tab === 'espera'
            ? 'No hay pedidos esperando la aprobación de un depósito.'
            : 'Todavía no hay pedidos aprobados por los depósitos.'}
        </p>
      ) : (
        <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Fecha</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Cliente</th>
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Ítems</th>
                {tab === 'espera' && <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Depósitos</th>}
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Total</th>
                <th className="px-4 py-2"></th>
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
                  {tab === 'espera' && (
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {estadoPorDeposito(p, config?.depositos).map(d => (
                          <span
                            key={d.numero}
                            className={`text-[11px] font-medium rounded px-1.5 py-0.5 border ${
                              d.aprobado
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {d.nombre}: {d.aprobado ? 'aprobado' : 'pendiente'}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">{dinero(p.total)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {tab === 'aprobadas' ? (
                      <Link to={`/proforma/${p.token}`} className="text-xs text-sky-400 hover:underline font-medium">
                        Ver proforma
                      </Link>
                    ) : (
                      <Link to="/aprobaciones" className="text-xs text-sky-400 hover:underline font-medium">
                        Ver en Depósito
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
