import { useState, useEffect } from 'react'
import { listarClientes } from '../utils/clientesApi'

const COLORES = {
  A: 'bg-gray-100 text-gray-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-green-100 text-green-700',
  D: 'bg-purple-100 text-purple-700',
}

export default function SelectorCliente({ value, onChange }) {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto]   = useState(false)

  useEffect(() => {
    listarClientes().then(setClientes).catch(() => {})
  }, [])

  const filtrados = busqueda.length > 0
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.localidad || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes.slice(0, 8)

  const seleccionar = (c) => { onChange(c); setAbierto(false) }
  const limpiar     = ()  => { onChange(null); setBusqueda('') }

  return (
    <div className="relative">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          {value ? (
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
              <span className="font-medium text-sm">{value.nombre}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${COLORES[value.tipoDescuento] || 'bg-gray-100 text-gray-600'}`}>
                Tipo {value.tipoDescuento} · {value.descuento}%
              </span>
              {value.localidad && <span className="text-xs text-gray-400 ml-auto">{value.localidad}</span>}
            </div>
          ) : (
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setAbierto(true) }}
              onFocus={() => setAbierto(true)}
              onBlur={() => setTimeout(() => setAbierto(false), 150)}
              placeholder="Buscar cliente o dejar en blanco..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {abierto && !value && filtrados.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
              {filtrados.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={() => seleccionar(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2"
                  >
                    <span className="font-medium flex-1">{c.nombre}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${COLORES[c.tipoDescuento] || ''}`}>
                      Tipo {c.tipoDescuento} · {c.descuento}%
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{c.localidad}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {value && (
          <button onClick={limpiar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        )}
      </div>
    </div>
  )
}
