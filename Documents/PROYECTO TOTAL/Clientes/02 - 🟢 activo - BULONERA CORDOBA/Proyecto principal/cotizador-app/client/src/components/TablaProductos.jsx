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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Familia</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Descripción</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Medida</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-20">Cant.</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">Precio</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">Subtotal</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize font-medium">
                  {item.familia || '—'}
                </span>
              </td>
              <td className="px-3 py-2 font-medium">{item.descripcion}</td>
              <td className="px-3 py-2 text-gray-400 text-xs">{item.medida || '—'}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={e => actualizar(i, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precioGranel || item.precio || 0}
                  onChange={e => actualizar(i, 'precioGranel', parseFloat(e.target.value) || 0)}
                  className="w-24 border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                />
              </td>
              <td className="px-3 py-2 text-right font-semibold text-green-700">
                ${calcSubtotal(item).toFixed(2)}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => eliminar(i)}
                  className="text-red-300 hover:text-red-500 text-lg leading-none font-light"
                  title="Eliminar"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td colSpan={5} className="px-3 py-3 text-right font-semibold text-gray-500 text-sm">
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
