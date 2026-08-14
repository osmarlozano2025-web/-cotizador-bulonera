import { useState, useEffect, useRef } from 'react'
import { buscarProductos, obtenerFamilias } from '../utils/productosApi'

export default function BuscadorProducto({ onAgregar }) {
  const [query, setQuery]       = useState('')
  const [familia, setFamilia]   = useState('')
  const [familias, setFamilias] = useState([])
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    obtenerFamilias().then(setFamilias).catch(() => {})
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.length < 2) { setResultados([]); return }
    timer.current = setTimeout(() => {
      setBuscando(true)
      buscarProductos(query, familia)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 250)
  }, [query, familia])

  const agregar = (p) => { onAgregar(p); setQuery(''); setResultados([]) }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por descripción, código o medida..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
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

      {buscando && (
        <p className="text-xs text-blue-500 px-1 animate-pulse">Buscando...</p>
      )}

      {resultados.length > 0 && (
        <ul className="border rounded-lg overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto shadow-sm">
          {resultados.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => agregar(p)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center justify-between group"
              >
                <div>
                  <p className="font-medium text-sm">{p.descripcion}</p>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                    {p.codigo && <span>Cód: {p.codigo}</span>}
                    {p.medida && <span>Med: {p.medida}</span>}
                    <span className="capitalize text-blue-500">{p.familia}</span>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  {p.precioGranel > 0 && (
                    <p className="text-sm font-semibold text-green-700">${p.precioGranel.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">+ Agregar</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!buscando && query.length >= 2 && resultados.length === 0 && (
        <p className="text-xs text-gray-400 px-1">Sin resultados para "{query}"</p>
      )}
    </div>
  )
}
