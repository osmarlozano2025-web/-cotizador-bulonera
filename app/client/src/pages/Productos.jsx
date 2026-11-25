import { useEffect, useState } from 'react'
import { buscarProductos, obtenerFamilias, obtenerFrecuentes } from '../utils/productosApi'

const pesos = n => (Number(n) > 0 ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—')

function TablaProductos({ productos, conVeces }) {
  return (
    <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 border-b">
          <tr>
            <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Código</th>
            <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Descripción</th>
            <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Medida</th>
            <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Familia</th>
            {conVeces && <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Pedido</th>}
            <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Precio de lista</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {productos.map((p, i) => (
            <tr key={p.id ?? i} className="hover:bg-white/5">
              <td className="px-4 py-2.5 text-slate-400 text-xs">{p.codigo || '—'}</td>
              <td className="px-4 py-2.5">{p.descripcion}</td>
              <td className="px-4 py-2.5 text-slate-400">{p.medida || '—'}</td>
              <td className="px-4 py-2.5 capitalize text-sky-400">{p.familia}</td>
              {conVeces && (
                <td className="px-4 py-2.5 text-right text-slate-300 text-xs whitespace-nowrap">
                  {p.veces > 0 ? `${p.veces} ${p.veces === 1 ? 'vez' : 'veces'} · ${Number(p.unidades).toLocaleString('es-AR')} u.` : '—'}
                </td>
              )}
              <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">{pesos(p.precioLista || p.precioGranel)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Productos() {
  const [query, setQuery]         = useState('')
  const [familia, setFamilia]     = useState('')
  const [familias, setFamilias]   = useState([])
  const [resultados, setResultados] = useState([])
  const [frecuentes, setFrecuentes] = useState(null)
  const [buscando, setBuscando]   = useState(false)

  useEffect(() => {
    obtenerFamilias().then(setFamilias).catch(() => {})
    obtenerFrecuentes(15).then(setFrecuentes).catch(() => setFrecuentes({ masPedidos: 0, productos: [] }))
  }, [])

  useEffect(() => {
    if (query.length < 2) { setResultados([]); return }
    const timer = setTimeout(() => {
      setBuscando(true)
      buscarProductos(query, familia)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, familia])

  const sinBusqueda = query.length < 2

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Productos</h2>
        <p className="text-sm text-slate-400 mt-0.5">Catálogo con el precio de la lista de venta de Tango</p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por descripción, código o medida..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]"
        />
        {familias.length > 0 && (
          <select
            value={familia}
            onChange={e => setFamilia(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]"
          >
            <option value="">Todas</option>
            {familias.map(f => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}
      </div>

      {sinBusqueda ? (
        frecuentes === null ? (
          <p className="text-sm text-slate-400 px-1">Cargando...</p>
        ) : (
          <div className="space-y-2">
            <p className="etiqueta">
              {frecuentes.masPedidos > 0 ? 'Los más pedidos' : 'Últimos productos cargados'}
              {frecuentes.masPedidos > 0 && frecuentes.masPedidos < frecuentes.productos.length && ' (completado con los últimos cargados)'}
            </p>
            <TablaProductos productos={frecuentes.productos} conVeces />
            <p className="text-xs text-slate-400">Escribí al menos 2 letras para buscar en todo el catálogo.</p>
          </div>
        )
      ) : buscando ? (
        <p className="text-sm text-slate-400 px-1">Buscando...</p>
      ) : resultados.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white/5 border rounded-xl p-10 text-center">
          Sin resultados para "{query}".
        </p>
      ) : (
        <TablaProductos productos={resultados} />
      )}
    </div>
  )
}
