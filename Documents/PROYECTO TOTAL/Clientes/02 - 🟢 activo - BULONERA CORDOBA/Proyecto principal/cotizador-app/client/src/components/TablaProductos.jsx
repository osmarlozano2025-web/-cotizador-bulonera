import { FAMILIAS_LABEL, DEPOSITO_NUMERO } from '../utils/aprobaciones'

const ORDEN = { buloneria: 1, tolsen: 2, mechas: 3, electrodos: 4, otros: 9 }

const COLOR_FAMILIA = {
  buloneria: 'bg-blue-100 text-blue-700',
  tolsen: 'bg-purple-100 text-purple-700',
  mechas: 'bg-orange-100 text-orange-700',
  electrodos: 'bg-rose-100 text-rose-700',
  otros: 'bg-gray-100 text-gray-600',
}

export default function TablaProductos({ items, descuento, onChange }) {
  const actualizar = (idx, campo, valor) => {
    onChange(prev => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const eliminar = (idx) => onChange(prev => prev.filter((_, i) => i !== idx))

  const calcSubtotal = (item) =>
    item.cantidad * (item.precioGranel || item.precio || 0) * (1 - descuento / 100)

  const total = items.reduce((sum, item) => sum + calcSubtotal(item), 0)

  // Cada familia va a un depósito distinto: los agrupamos ya desde la carga
  // para que se vea cómo va a quedar dividido el pedido en aprobaciones.
  const grupos = items.reduce((acc, item, idx) => {
    const fam = ORDEN[item.familia] ? item.familia : 'otros'
    ;(acc[fam] ||= []).push({ item, idx })
    return acc
  }, {})

  const familiasOrdenadas = Object.keys(grupos).sort((a, b) => ORDEN[a] - ORDEN[b])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Descripción</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Medida</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-20">Cant.</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">Precio</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">Subtotal</th>
            <th className="w-8"></th>
          </tr>
        </thead>

        {familiasOrdenadas.map(fam => {
          const filas = grupos[fam]
          const subtotalFamilia = filas.reduce((s, { item }) => s + calcSubtotal(item), 0)
          const numero = DEPOSITO_NUMERO[fam]

          return (
            <tbody key={fam} className="divide-y divide-gray-100">
              <tr className="bg-gray-50/70">
                <td colSpan={6} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {numero && (
                        <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[10px] font-bold flex items-center justify-center">
                          {numero}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${COLOR_FAMILIA[fam]}`}>
                        {FAMILIAS_LABEL[fam] || fam}
                      </span>
                      <span className="text-xs text-gray-400">
                        {filas.length} producto{filas.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      ${subtotalFamilia.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>

              {filas.map(({ item, idx }) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{item.descripcion}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{item.medida || '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={e => actualizar(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precioGranel || item.precio || 0}
                      onChange={e => actualizar(idx, 'precioGranel', parseFloat(e.target.value) || 0)}
                      className="w-24 border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                    ${calcSubtotal(item).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => eliminar(idx)}
                      className="text-red-300 hover:text-red-500 text-lg leading-none font-light"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          )
        })}

        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={4} className="px-3 py-3 text-right font-semibold text-gray-500 text-sm">
              {descuento > 0 && (
                <span className="text-green-600 mr-3 font-medium">{descuento}% dto. aplicado</span>
              )}
              Total:
            </td>
            <td className="px-3 py-3 text-right font-bold text-gray-800">${total.toFixed(2)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
