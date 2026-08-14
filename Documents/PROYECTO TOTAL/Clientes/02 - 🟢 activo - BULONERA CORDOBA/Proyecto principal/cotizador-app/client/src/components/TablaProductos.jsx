import { FAMILIAS_LABEL, DEPOSITO_NUMERO, LABEL_CONDICION_PAGO } from '../utils/aprobaciones'
import {
  precioUnitario, precioBase, agruparPorFamilia,
  textoTope, limitesDelTope, ajusteDentroDelTope,
} from '../utils/precios'

const COLOR_FAMILIA = {
  buloneria: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25',
  tolsen: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25',
  mechas: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25',
  electrodos: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25',
  otros: 'bg-slate-100 text-slate-300',
}

const money = (n) =>
  `$${(Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** "−15%" o "+30%", con el signo que entiende una persona. */
const pct = (n) => {
  const v = Number(n) || 0
  if (v === 0) return '—'
  return v < 0 ? `−${Math.abs(v)}%` : `+${v}%`
}

/**
 * Descuento de una familia dentro del pedido.
 *
 * Arranca en 0 y se puede mejorar hasta el tope que tiene esa familia en
 * Configuraciones. Se escribe con el teclado: sin flechitas.
 */
function DescuentoFamilia({ valor, tope, onChange }) {
  const { min, max } = limitesDelTope(tope)
  const bloqueado = tope === 0

  return (
    <div className="flex items-center gap-2">
      <div className="text-right leading-tight">
        <span className="block text-[11px] font-medium text-slate-300">Descuento</span>
        <span className="block text-[10px] text-slate-400">{textoTope(tope)}</span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={valor}
          disabled={bloqueado}
          onChange={e => {
            const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
            onChange(ajusteDentroDelTope(isNaN(v) ? 0 : v, tope))
          }}
          className={`tabular w-24 border rounded-lg pl-2.5 pr-6 py-1.5 text-right text-sm font-medium
            focus:outline-none focus:ring-2 disabled:bg-white/10 disabled:text-slate-400 transition ${
            valor < 0
              ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10 focus:ring-emerald-400'
              : valor > 0
                ? 'border-amber-400/50 text-amber-300 bg-amber-500/10 focus:ring-amber-400'
                : 'border-white/10 focus:ring-[var(--cb-500)]'
          }`}
          title={bloqueado
            ? 'Esta familia no admite descuento'
            : `Entre ${min}% y ${max}%. Negativo descuenta, positivo aumenta.`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          %
        </span>
      </div>
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
  const topeDe = (familia) => config?.descuentos_familia?.[familia] ?? 0
  const ajusteDe = (familia) => ajusteDentroDelTope(descuentosFamilia[familia] ?? 0, topeDe(familia))
  const unitario = (item, familia) =>
    precioUnitario(item, config, condicionPago, descuento, ajusteDe(familia))

  const actualizar = (idx, campo, valor) => {
    onChange(prev => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const eliminar = (idx) => onChange(prev => prev.filter((_, i) => i !== idx))

  const grupos = agruparPorFamilia(items)
  const ajustePago = Number(config?.descuentos_pago?.[condicionPago]) || 0

  const totalBase = items.reduce((s, i) => s + i.cantidad * precioBase(i), 0)
  const totalFinal = grupos.reduce(
    (s, g) => s + g.filas.reduce((t, { item }) => t + item.cantidad * unitario(item, g.familia), 0),
    0
  )
  const diferencia = totalBase - totalFinal

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left pb-2 etiqueta">Producto</th>
              <th className="text-right pb-2 etiqueta w-24">Cant.</th>
              <th className="text-right pb-2 etiqueta w-32">Precio</th>
              <th className="text-right pb-2 etiqueta w-32">Unitario</th>
              <th className="text-right pb-2 etiqueta w-32">Subtotal</th>
              <th className="w-10"></th>
            </tr>
          </thead>

          {grupos.map(({ familia, filas }) => {
            const ajuste = ajusteDe(familia)
            const subtotal = filas.reduce((s, { item }) => s + item.cantidad * unitario(item, familia), 0)
            const numero = DEPOSITO_NUMERO[familia]

            return (
              <tbody key={familia}>
                <tr>
                  <td colSpan={6} className="pt-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-white/5 rounded-xl px-3 py-2">
                      <span className="flex items-center gap-2">
                        {numero && (
                          <span className="w-5 h-5 rounded-md bg-white/15 text-white text-[10px] font-bold flex items-center justify-center">
                            {numero}
                          </span>
                        )}
                        <span className={`chip ${COLOR_FAMILIA[familia]}`}>
                          {FAMILIAS_LABEL[familia] || familia}
                        </span>
                        <span className="text-xs text-slate-400">
                          {filas.length} producto{filas.length === 1 ? '' : 's'}
                        </span>
                      </span>

                      <div className="flex items-center gap-4">
                        {onDescuentoFamilia && (
                          <DescuentoFamilia
                            valor={ajuste}
                            tope={topeDe(familia)}
                            onChange={(v) => onDescuentoFamilia(familia, v)}
                          />
                        )}
                        <span className="tabular text-sm font-semibold text-slate-200 w-28 text-right">
                          {money(subtotal)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>

                {filas.map(({ item, idx }) => {
                  const base = precioBase(item)
                  const unit = unitario(item, familia)

                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-slate-100 leading-tight">{item.descripcion}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.codigo}{item.medida ? ` · ${item.medida}` : ''}
                        </p>
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={item.cantidad}
                          onChange={e => actualizar(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                          className="tabular w-16 border border-white/10 rounded-lg px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)] ml-auto block"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={base}
                          onChange={e => actualizar(idx, 'precioGranel', parseFloat(e.target.value) || 0)}
                          className="tabular w-28 border border-white/10 rounded-lg px-2 py-1.5 text-right text-sm text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)] ml-auto block"
                        />
                      </td>
                      <td className={`tabular py-2 text-right ${
                        unit < base ? 'text-emerald-300' : unit > base ? 'text-amber-400' : 'text-slate-300'
                      }`}>
                        {money(unit)}
                      </td>
                      <td className="tabular py-2 text-right font-semibold text-slate-100">
                        {money(unit * item.cantidad)}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => eliminar(idx)}
                          className="text-slate-300 hover:text-rose-500 text-lg leading-none transition"
                          title="Quitar"
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

      {/* Cómo se llega al total, paso por paso */}
      <div className="flex justify-end">
        <div className="w-full sm:w-96 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 flex justify-between text-sm text-slate-400 bg-white/5">
            <span>Subtotal</span>
            <span className="tabular">{money(totalBase)}</span>
          </div>

          <div className="divide-y divide-white/5">
            {grupos.map(({ familia }) => {
              const ajuste = ajusteDe(familia)
              if (ajuste === 0) return null
              return (
                <div key={familia} className="px-4 py-1.5 flex justify-between text-xs">
                  <span className="text-slate-400">
                    Descuento {FAMILIAS_LABEL[familia] || familia}
                  </span>
                  <span className={`tabular font-medium ${ajuste < 0 ? 'text-emerald-600' : 'text-amber-400'}`}>
                    {pct(ajuste)}
                  </span>
                </div>
              )
            })}

            {descuento > 0 && (
              <div className="px-4 py-1.5 flex justify-between text-xs">
                <span className="text-slate-400">Descuento del cliente</span>
                <span className="tabular font-medium text-emerald-600">−{descuento}%</span>
              </div>
            )}

            <div className="px-4 py-1.5 flex justify-between text-xs">
              <span className="text-slate-400">
                Pago {LABEL_CONDICION_PAGO[condicionPago] || 'Contado'}
              </span>
              <span className={`tabular font-medium ${
                ajustePago < 0 ? 'text-emerald-600' : ajustePago > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}>
                {pct(ajustePago)}
              </span>
            </div>
          </div>

          {diferencia !== 0 && (
            <div className="px-4 py-1.5 flex justify-between text-xs border-t border-white/5">
              <span className="text-slate-400">{diferencia > 0 ? 'Ahorro' : 'Recargo'}</span>
              <span className={`tabular font-medium ${diferencia > 0 ? 'text-emerald-600' : 'text-amber-400'}`}>
                {diferencia > 0 ? '−' : '+'}{money(Math.abs(diferencia))}
              </span>
            </div>
          )}

          <div className="px-4 py-3 flex justify-between items-center border-t border-white/10 bg-white/5">
            <span className="font-semibold text-slate-300">Total</span>
            <span className="tabular text-xl font-bold text-slate-100">{money(totalFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
