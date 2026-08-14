import { FAMILIAS_LABEL, DEPOSITO_NUMERO, LABEL_CONDICION_PAGO } from '../utils/aprobaciones'
import {
  precioUnitario, precioLista, agruparPorFamilia,
  textoAjuste, textoTope, limitesDelTope, ajusteDentroDelTope,
} from '../utils/precios'

const COLOR_FAMILIA = {
  buloneria: 'bg-blue-100 text-blue-700',
  tolsen: 'bg-purple-100 text-purple-700',
  mechas: 'bg-orange-100 text-orange-700',
  electrodos: 'bg-rose-100 text-rose-700',
  otros: 'bg-gray-100 text-gray-600',
}

const money = (n) => `$${(Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Control del descuento de una familia dentro del pedido.
 *
 * Arranca en 0 y se puede mejorar hasta el tope que tiene esa familia en
 * Configuraciones. Un tope de -25 admite de -25 a 0; un tope de 0 no admite nada.
 */
function AjusteFamilia({ valor, tope, onChange }) {
  const { min, max } = limitesDelTope(tope)
  const bloqueado = tope === 0

  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <label className="block text-[11px] text-gray-400 leading-none">Descuento</label>
        <span className="text-[10px] text-gray-400">{textoTope(tope)}</span>
      </div>
      <input
        type="number"
        step="0.5"
        min={min}
        max={max}
        value={valor}
        disabled={bloqueado}
        onChange={e => {
          const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
          onChange(ajusteDentroDelTope(isNaN(v) ? 0 : v, tope))
        }}
        className={`w-20 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 ${
          valor < 0
            ? 'border-green-300 text-green-700 focus:ring-green-500'
            : valor > 0
              ? 'border-amber-300 text-amber-700 focus:ring-amber-500'
              : 'focus:ring-blue-500'
        }`}
        title={bloqueado
          ? 'Esta familia no admite descuento'
          : `Entre ${min}% y ${max}%. Negativo descuenta, positivo aumenta.`}
      />
      <span className="text-[11px] text-gray-400">%</span>
    </div>
  )
}

export default function TablaProductos({
  items,
  descuento = 0,
  onChange,
  config,
  condicionPago = 'contado',
  descuentosFamilia = {},
  onDescuentoFamilia,
}) {
  // Tope de cada familia, definido en Configuraciones.
  const topeDe = (familia) => config?.descuentos_familia?.[familia] ?? 0

  const actualizar = (idx, campo, valor) => {
    onChange(prev => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const eliminar = (idx) => onChange(prev => prev.filter((_, i) => i !== idx))

  // En el pedido arranca en 0 y se puede mejorar hasta el tope.
  const ajusteDe = (familia) =>
    ajusteDentroDelTope(descuentosFamilia[familia] ?? 0, topeDe(familia))

  const unitario = (item, familia) =>
    precioUnitario(item, config, condicionPago, descuento, ajusteDe(familia))

  const grupos = agruparPorFamilia(items)

  // Totales del pedido, calculados sobre lo mismo que ve el usuario.
  const totalLista = items.reduce((s, i) => s + i.cantidad * precioLista(i), 0)
  const totalFinal = grupos.reduce(
    (s, g) => s + g.filas.reduce((t, { item }) => t + item.cantidad * unitario(item, g.familia), 0),
    0
  )
  const ahorro = totalLista - totalFinal
  const hayAjustes = grupos.some(g => ajusteDe(g.familia) !== 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Descripción</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Medida</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-20">Cant.</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">P. Lista</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">P. Unit.</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500 text-xs uppercase w-28">Subtotal</th>
              <th className="w-8"></th>
            </tr>
          </thead>

          {grupos.map(({ familia, filas }) => {
            const ajuste = ajusteDe(familia)
            const subtotal = filas.reduce((s, { item }) => s + item.cantidad * unitario(item, familia), 0)
            // Cuánto sería sin el ajuste, para mostrar cuánto mueve
            const subtotalSinAjuste = filas.reduce(
              (s, { item }) => s + item.cantidad * precioUnitario(item, config, condicionPago, descuento, 0),
              0
            )
            const numero = DEPOSITO_NUMERO[familia]

            return (
              <tbody key={familia} className="divide-y divide-gray-100">
                <tr className="bg-gray-50/70">
                  <td colSpan={7} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="flex items-center gap-2">
                        {numero && (
                          <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[10px] font-bold flex items-center justify-center">
                            {numero}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${COLOR_FAMILIA[familia]}`}>
                          {FAMILIAS_LABEL[familia] || familia}
                        </span>
                        <span className="text-xs text-gray-400">
                          {filas.length} producto{filas.length === 1 ? '' : 's'}
                        </span>
                      </span>

                      <div className="flex items-center gap-4">
                        {onDescuentoFamilia && (
                          <AjusteFamilia
                            valor={ajuste}
                            tope={topeDe(familia)}
                            onChange={(v) => onDescuentoFamilia(familia, v)}
                          />
                        )}
                        <span className="text-right">
                          {ajuste !== 0 && (
                            <span className="block text-[11px] text-gray-400 line-through leading-none">
                              {money(subtotalSinAjuste)}
                            </span>
                          )}
                          <span className={`text-xs font-semibold ${ajuste < 0 ? 'text-green-700' : ajuste > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                            {money(subtotal)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>

                {filas.map(({ item, idx }) => {
                  const lista = precioLista(item)
                  const unit = unitario(item, familia)

                  return (
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
                          className="w-24 border rounded px-2 py-1 text-right text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                        />
                      </td>
                      <td className={`px-3 py-2 text-right ${unit < lista ? 'text-green-700' : unit > lista ? 'text-amber-700' : 'text-gray-600'}`}>
                        {money(unit)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">
                        {money(unit * item.cantidad)}
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
                  )
                })}
              </tbody>
            )
          })}
        </table>
      </div>

      {/* Resumen: qué se aplicó y en qué orden */}
      <div className="flex justify-end">
        <div className="w-full sm:w-96 border rounded-lg divide-y text-sm">
          <div className="px-3 py-2 flex justify-between text-gray-500">
            <span>Subtotal a precio de lista</span>
            <span>{money(totalLista)}</span>
          </div>

          {hayAjustes && (
            <div className="px-3 py-2 space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Ajuste por familia
              </p>
              {grupos.map(({ familia, filas }) => {
                const ajuste = ajusteDe(familia)
                if (ajuste === 0) return null
                const sub = filas.reduce((s, { item }) => s + item.cantidad * unitario(item, familia), 0)
                return (
                  <div key={familia} className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      {FAMILIAS_LABEL[familia] || familia}{' '}
                      <span className={ajuste < 0 ? 'text-green-600' : 'text-amber-600'}>
                        {textoAjuste(ajuste)}
                      </span>
                    </span>
                    <span className="text-gray-600">{money(sub)}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-3 py-2 flex justify-between text-xs text-gray-500">
            <span>Condición de pago</span>
            <span>{LABEL_CONDICION_PAGO[condicionPago] || 'Contado'}</span>
          </div>

          {descuento > 0 && (
            <div className="px-3 py-2 flex justify-between text-xs text-gray-500">
              <span>Descuento del cliente</span>
              <span className="text-green-600">−{descuento}%</span>
            </div>
          )}

          {ahorro !== 0 && (
            <div className="px-3 py-2 flex justify-between text-xs">
              <span className="text-gray-500">{ahorro > 0 ? 'Ahorro total' : 'Recargo total'}</span>
              <span className={ahorro > 0 ? 'text-green-700' : 'text-amber-700'}>
                {ahorro > 0 ? '−' : '+'}{money(Math.abs(ahorro))}
              </span>
            </div>
          )}

          <div className="px-3 py-2.5 flex justify-between items-center bg-gray-50">
            <span className="font-semibold text-gray-600">Total</span>
            <span className="text-lg font-bold text-gray-800">{money(totalFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
