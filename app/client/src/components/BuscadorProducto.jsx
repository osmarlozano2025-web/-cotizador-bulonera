import { useState, useEffect, useRef } from 'react'
import { buscarProductos, obtenerFamilias } from '../utils/productosApi'
import { etiquetaFamilia } from '../utils/aprobaciones'

export default function BuscadorProducto({ onAgregar, config }) {
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
    // Sin texto y sin familia elegida: no hay nada que listar todavía. Con
    // familia elegida, se muestra lo que tiene esa familia aunque no se haya
    // escrito nada — así se elige de una lista en vez de tener que escribir.
    if (query.length < 2 && !familia) { setResultados([]); return }
    timer.current = setTimeout(() => {
      setBuscando(true)
      buscarProductos(query, familia)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 250)
  }, [query, familia])

  // Si se estaba mostrando el listado de una familia (sin texto escrito), la
  // lista se deja como está: así se agregan varios seguidos sin tener que
  // volver a elegir la familia cada vez. Sólo se limpia cuando fue una
  // búsqueda por texto, que es de un producto puntual.
  const agregar = (p) => {
    onAgregar(p)
    if (query) { setQuery(''); setResultados([]) }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por descripción, código o medida..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]"
          autoFocus
        />
        {familias.length > 0 && (
          <select
            value={familia}
            onChange={e => setFamilia(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]"
          >
            <option value="">Todas</option>
            {familias.map(f => (
              <option key={f} value={f}>{etiquetaFamilia(config, f)}</option>
            ))}
          </select>
        )}
      </div>

      {buscando && (
        <p className="text-xs text-blue-500 px-1 animate-pulse">Buscando...</p>
      )}

      {resultados.length > 0 && (
        <ul className="border rounded-lg overflow-hidden divide-y divide-white/5 max-h-72 overflow-y-auto shadow-sm">
          {resultados.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => agregar(p)}
                className="w-full text-left px-4 py-3 hover:bg-sky-500/10 transition flex items-center justify-between group"
              >
                <div>
                  <p className="font-medium text-sm">{p.descripcion}</p>
                  <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
                    {p.codigo && <span>Cód: {p.codigo}</span>}
                    {p.medida && <span>Med: {p.medida}</span>}
                    <span className="capitalize text-blue-500">{p.familia}</span>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  {/* El de lista, que es con el que arranca el renglón. */}
                  {p.precioLista > 0 && (
                    <p className="text-sm font-semibold text-emerald-400">${p.precioLista.toFixed(2)}</p>
                  )}
                  {/* Los bultos, para saber de antemano cuánto hay que pedir
                      para que el renglón caiga en fracción o en granel. */}
                  {(p.unidadGranel > 0 || p.unidadFraccion > 0) && (
                    <p className="text-[11px] text-slate-400">
                      {p.unidadFraccion > 0 && `fracc. ${p.unidadFraccion}`}
                      {p.unidadFraccion > 0 && p.unidadGranel > 0 && ' · '}
                      {p.unidadGranel > 0 && `granel ${p.unidadGranel}`}
                    </p>
                  )}
                  <p className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">+ Agregar</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!buscando && query.length >= 2 && resultados.length === 0 && (
        <p className="text-xs text-slate-400 px-1">Sin resultados para "{query}"</p>
      )}
      {!buscando && query.length < 2 && familia && resultados.length === 0 && (
        <p className="text-xs text-slate-400 px-1">Esta familia todavía no tiene productos cargados</p>
      )}
    </div>
  )
}
