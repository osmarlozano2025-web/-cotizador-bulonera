import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { exportarExcel } from '../utils/exportar'

export default function VistaPrevia() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const [ok, setOk] = useState(false)

  if (!state?.items?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No hay items en el pedido.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline text-sm">
          Volver a Nuevo Pedido
        </button>
      </div>
    )
  }

  const { items, cliente } = state
  const descuento = cliente?.descuento || 0

  const porFamilia = items.reduce((acc, item) => {
    const fam = item.familia || 'general'
    if (!acc[fam]) acc[fam] = []
    acc[fam].push(item)
    return acc
  }, {})

  const calcSub = (item) =>
    item.cantidad * (item.precioGranel || item.precio || 0) * (1 - descuento / 100)

  const total = items.reduce((s, i) => s + calcSub(i), 0)

  const descargar = () => {
    exportarExcel({ items }, cliente)
    setOk(true)
    setTimeout(() => setOk(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Vista Previa</h2>
          {cliente && (
            <p className="text-sm text-gray-500 mt-0.5">
              {cliente.nombre}
              {descuento > 0 && <span className="ml-2 text-green-600 font-medium">· {descuento}% descuento</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {ok && <span className="text-green-600 text-sm font-medium">✓ Descargado y guardado</span>}
          <button onClick={() => navigate(-1)} className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition">
            ← Editar
          </button>
          <button onClick={descargar} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition">
            ⬇ Descargar Excel
          </button>
        </div>
      </div>

      {Object.entries(porFamilia).map(([familia, fItems]) => (
        <div key={familia} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-2 font-semibold uppercase tracking-wide text-xs">
            {familia}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 text-xs font-semibold">Código</th>
                <th className="text-left px-4 py-2 text-gray-500 text-xs font-semibold">Descripción</th>
                <th className="text-left px-4 py-2 text-gray-500 text-xs font-semibold">Medida</th>
                <th className="text-right px-4 py-2 text-gray-500 text-xs font-semibold">Cant.</th>
                <th className="text-right px-4 py-2 text-gray-500 text-xs font-semibold">Precio</th>
                <th className="text-right px-4 py-2 text-gray-500 text-xs font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fItems.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{item.codigo || '—'}</td>
                  <td className="px-4 py-2.5">{item.descripcion}</td>
                  <td className="px-4 py-2.5 text-gray-400">{item.medida || '—'}</td>
                  <td className="px-4 py-2.5 text-right">{item.cantidad}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">${(item.precioGranel || item.precio || 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">${calcSub(item).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-end">
        <div className="text-right space-y-1">
          {descuento > 0 && (
            <p className="text-xs text-gray-400">
              Sin descuento: ${items.reduce((s, i) => s + i.cantidad * (i.precioGranel || i.precio || 0), 0).toFixed(2)}
            </p>
          )}
          <p className="text-xl font-bold text-gray-800">
            Total: <span className="text-green-700">${total.toFixed(2)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
