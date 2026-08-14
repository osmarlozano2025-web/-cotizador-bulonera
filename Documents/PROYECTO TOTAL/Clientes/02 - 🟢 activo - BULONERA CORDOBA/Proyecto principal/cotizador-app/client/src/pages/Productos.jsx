import { useEffect, useState } from 'react'
import { buscarProductos, obtenerFamilias } from '../utils/productosApi'

export default function Productos() {
  const [query, setQuery]         = useState('')
  const [familia, setFamilia]     = useState('')
  const [familias, setFamilias]   = useState([])
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando]   = useState(false)

  useEffect(() => {
    obtenerFamilias().then(setFamilias).catch(() => {})
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Productos</h2>
        <p className="text-sm text-slate-500 mt-0.5">Catálogo del servidor (mismo origen que usa la interpretación de fotos y los pedidos)</p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por descripción, código o medida..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {familias.length > 0 && (
          <select
            value={familia}
            onChange={e => setFamilia(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {familias.map(f => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        )}
      </div>

      {query.length < 2 ? (
        <p className="text-sm text-slate-500 bg-white border rounded-xl p-10 text-center">
          Escribí al menos 2 letras para buscar en el catálogo.
        </p>
      ) : buscando ? (
        <p className="text-sm text-slate-500 px-1">Buscando...</p>
      ) : resultados.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border rounded-xl p-10 text-center">
          Sin resultados para "{query}".
        </p>
      ) : (
        <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Código</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Descripción</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Medida</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Familia</th>
                <th className="text-right px-4 py-2 text-slate-400 text-xs font-semibold">Precio granel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {resultados.map((p, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{p.codigo || '—'}</td>
                  <td className="px-4 py-2.5">{p.descripcion}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.medida || '—'}</td>
                  <td className="px-4 py-2.5 capitalize text-sky-400">{p.familia}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">
                    {p.precioGranel > 0 ? `$${p.precioGranel.toFixed(2)}` : '—'}
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
