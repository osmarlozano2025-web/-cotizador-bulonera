import { useState, useRef } from 'react'

export default function SubidorFoto({ onAgregar }) {
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultados, setResultados] = useState([])
  const [agregados, setAgregados] = useState(new Set())
  const inputRef = useRef(null)

  const elegirArchivo = (file) => {
    if (!file) return
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
    setResultados([])
    setAgregados(new Set())
    setError('')
  }

  const interpretar = async () => {
    if (!archivo) return
    setCargando(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('imagen', archivo)
      const res = await fetch('/api/productos/interpretar-imagen', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error del servidor (${res.status})`)
      }
      const data = await res.json()
      setResultados(data)
    } catch (e) {
      setError(
        e.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor local. Verificá que esté corriendo en el puerto 3001.'
          : e.message
      )
    } finally {
      setCargando(false)
    }
  }

  const agregar = (item, idx, producto) => {
    onAgregar({ ...producto, cantidad: item.detectado.cantidad || 1 })
    setAgregados(prev => new Set(prev).add(idx))
  }

  return (
    <div className="space-y-4">
      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-amber-200 rounded-xl p-8 text-center bg-amber-50 hover:bg-amber-100 transition"
        >
          <div className="text-4xl mb-3">📷</div>
          <p className="font-semibold text-amber-700 text-sm">Subir foto del pedido</p>
          <p className="text-xs text-amber-600 mt-1">Manuscrito o foto, se interpreta automáticamente</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => elegirArchivo(e.target.files?.[0])}
      />

      {preview && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <img src={preview} alt="Vista previa" className="w-32 h-32 object-cover rounded-lg border" />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-gray-600">{archivo.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={interpretar}
                  disabled={cargando}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {cargando ? 'Interpretando...' : 'Interpretar pedido'}
                </button>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Cambiar foto
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {resultados.length > 0 && (
            <ul className="border rounded-lg overflow-hidden divide-y divide-gray-100">
              {resultados.map((item, idx) => (
                <li key={idx} className="px-4 py-3">
                  <p className="text-sm font-medium">
                    {item.detectado.cantidad || 1}× {item.detectado.descripcion}
                  </p>
                  {item.matchExacto ? (
                    <button
                      onClick={() => agregar(item, idx, item.matchExacto)}
                      disabled={agregados.has(idx)}
                      className="text-xs mt-1 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 disabled:opacity-50"
                    >
                      {agregados.has(idx) ? '✓ Agregado' : `+ Agregar match: ${item.matchExacto.descripcion}`}
                    </button>
                  ) : item.sugerencias.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.sugerencias.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => agregar(item, idx, s)}
                          disabled={agregados.has(idx)}
                          className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {agregados.has(idx) ? '✓' : '+'} {s.descripcion}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Sin coincidencias en el catálogo</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
