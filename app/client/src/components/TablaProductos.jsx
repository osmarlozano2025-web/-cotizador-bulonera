import { useState } from 'react'
import { etiquetaFamilia, numeroDeDeposito, etiquetaPago } from '../utils/aprobaciones'
import CampoNumero from './CampoNumero'
import {
  precioUnitario, precioBase, agruparPorFamilia,
  textoTope, ajusteDentroDelTope,
  modoPorCantidad, textoModo, LABEL_MODO, cantidadEnMultiplos,
} from '../utils/precios'

/** Cada modo con su color, para reconocerlo de un vistazo en el renglón. */
const COLOR_MODO = {
  granel: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25',
  fraccion: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25',
  unidad: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25',
}

const COLOR_FAMILIA = {
  buloneria: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25',
  tolsen: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25',
  mechas: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25',
  electrodos: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25',
  escaleras: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25',
  cintas_metricas: 'bg-lime-500/15 text-lime-300 ring-1 ring-lime-400/25',
  otros: 'bg-slate-100 text-slate-300',
}

/** Una familia recién creada todavía no tiene color propio: gris antes que nada. */
const colorFamilia = (familia) => COLOR_FAMILIA[familia] || COLOR_FAMILIA.otros

const money = (n) =>
  `$${(Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** "−15%" o "+30%", con el signo que entiende una persona. */
const pct = (n) => {
  const v = Number(n) || 0
  if (v === 0) return '—'
  return v < 0 ? `−${Math.abs(v)}%` : `+${v}%`
}

/**
 * Una línea del detalle de descuentos: verde si resta, ámbar si suma.
 *
 * Se oculta cuando no hubo: una fila en cero no explica nada y ensucia la
 * lista. Misma convención que la proforma, para que el vendedor vea en la
 * carga lo mismo que después le llega al cliente.
 */
function LineaDescuento({ etiqueta, monto }) {
  const redondeado = Math.round(monto * 100) / 100
  if (redondeado === 0) return null
  const descuenta = redondeado > 0

  return (
    <div className="px-4 py-1.5 flex justify-between text-xs">
      <span className="text-slate-400">{etiqueta}</span>
      <span className={`tabular font-medium ${descuenta ? 'text-emerald-400' : 'text-amber-400'}`}>
        {descuenta ? '−' : '+'}{money(Math.abs(redondeado))}
      </span>
    </div>
  )
}

/**
 * Avisa que la cantidad se completó hasta el bulto entero.
 *
 * No es un cartel al pasar: la cantidad ya cambió y el precio del renglón con
 * ella, así que se muestra parado en el medio para que nadie lo pase por alto.
 */
function AvisoMultiplo({ aviso, onCerrar }) {
  if (!aviso) return null

  const unidad = aviso.modo === 'granel' ? 'Los graneles' : 'Las fracciones'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-slate-100">
            Se ajustó la cantidad
          </h3>
        </div>
        <div className="p-6 space-y-3 text-sm text-slate-300">
          <p className="text-slate-400 text-xs">{aviso.descripcion}</p>
          <p>
            {unidad} de este producto van de {aviso.porBulto} en {aviso.porBulto}.
          </p>
          <p className="text-slate-100 font-medium">
            Pediste {aviso.pedida} y quedó en {aviso.ajustada}.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onCerrar}
            autoFocus
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Descuento de una familia dentro del pedido.
 *
 * Input vacío donde se escriben números directamente: -15, -10, +5, etc.
 */
function DescuentoFamilia({ valor, tope, onChange }) {
  const bloqueado = tope === 0

  return (
    <div className="flex items-center gap-2">
      <div className="text-right leading-tight">
        <span className="block text-[11px] font-medium text-slate-300">Descuento</span>
        <span className="block text-[10px] text-slate-400">{textoTope(tope)}</span>
      </div>
      <div className="relative">
        <CampoNumero
          placeholder="-10"
          value={valor}
          disabled={bloqueado}
          onChange={(n) => onChange(ajusteDentroDelTope(n, tope))}
          className={`tabular w-24 border rounded-lg pl-2.5 pr-6 py-1.5 text-right text-sm font-medium
            focus:outline-none focus:ring-2 disabled:bg-white/10 disabled:text-slate-400 transition ${
            valor < 0
              ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10 focus:ring-emerald-400'
              : valor > 0
                ? 'border-amber-400/50 text-amber-300 bg-amber-500/10 focus:ring-amber-400'
                : 'border-white/10 focus:ring-[var(--cb-500)]'
          }`}
          title={bloqueado ? 'Esta familia no admite descuento' : 'Escribe el porcentaje: -10, +5, etc.'}
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
  // Un cliente arma su propio pedido, pero el descuento no lo pone él: eso
  // lo decide el vendedor cuando lo revisa.
  bloquearDescuentos = false,
}) {
  const [aviso, setAviso] = useState(null)

  const topeDe = (familia) => config?.descuentos_familia?.[familia] ?? 0
  const ajusteDe = (familia) => ajusteDentroDelTope(descuentosFamilia[familia] ?? 0, topeDe(familia))
  const unitario = (item, familia) =>
    precioUnitario(item, config, condicionPago, descuento, ajusteDe(familia), item.descuentoItem || 0)

  const actualizar = (idx, campo, valor) => {
    onChange(prev => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const eliminar = (idx) => onChange(prev => prev.filter((_, i) => i !== idx))

  /**
   * Completa la cantidad hasta el bulto entero cuando se sale del campo.
   *
   * Corre en el blur y no en cada tecla: al escribir 25 con fracción de 15,
   * ajustar al vuelo lo saltaría a 30 apenas se teclea el 2.
   */
  const ajustarAlBulto = (idx, item) => {
    const pedida = Number(item.cantidad) || 0
    const ajustada = cantidadEnMultiplos(item, pedida)
    if (ajustada === pedida) return

    const modo = modoPorCantidad(item, ajustada)
    actualizar(idx, 'cantidad', ajustada)
    setAviso({
      descripcion: item.descripcion,
      pedida,
      ajustada,
      modo,
      porBulto: modo === 'granel' ? Number(item.unidadGranel) : Number(item.unidadFraccion),
    })
  }

  const grupos = agruparPorFamilia(items, config)
  const ajustePago = Number(config?.descuentos_pago?.[condicionPago]) || 0

  const totalBase = items.reduce((s, i) => s + i.cantidad * precioBase(i), 0)
  const totalFinal = grupos.reduce(
    (s, g) => s + g.filas.reduce((t, { item }) => t + item.cantidad * unitario(item, g.familia), 0),
    0
  )

  // Cuánto puso o sacó cada paso de la cadena, en pesos. Igual que en la
  // proforma: la cadena es multiplicativa, así que el aporte de cada paso se
  // mide contra el precio que le llegó a ESE paso, no contra el de lista.
  // Todos los descuentos ya están aplicados en cada renglón — esto es el
  // detalle informativo de por qué el neto es el que es.
  const desglose = { familia: 0, producto: 0, cliente: 0, pago: 0, iva: {} }
  for (const { familia, filas } of grupos) {
    const ajuste = ajusteDe(familia)
    for (const { item } of filas) {
      const cant = Number(item.cantidad) || 0
      const p0 = precioBase(item)
      const p1 = p0 * (1 + ajuste / 100)
      const p2 = p1 * (1 + (Number(item.descuentoItem) || 0) / 100)
      const p3 = p2 * (1 - Math.abs(Number(descuento) || 0) / 100)
      const p4 = p3 * (1 + ajustePago / 100)

      desglose.familia += (p0 - p1) * cant
      desglose.producto += (p1 - p2) * cant
      desglose.cliente += (p2 - p3) * cant
      desglose.pago += (p3 - p4) * cant

      // El IVA es del producto y no entra en la cadena: se suma aparte, sobre
      // el neto. El 21% es el de fábrica si el producto no trae el suyo.
      const tasa = Number(item.ivaPorcentaje ?? 21)
      desglose.iva[tasa] = (desglose.iva[tasa] || 0) + p4 * cant * (tasa / 100)
    }
  }

  const tasasIva = Object.keys(desglose.iva).map(Number).sort((a, b) => b - a)
  const totalIva = tasasIva.reduce((s, t) => s + desglose.iva[t], 0)
  const totalConIva = totalFinal + totalIva

  return (
    <div className="space-y-5">
      <AvisoMultiplo aviso={aviso} onCerrar={() => setAviso(null)} />

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left pb-2 etiqueta">Producto</th>
              <th className="text-right pb-2 etiqueta w-24">Cant.</th>
              <th className="text-left pb-2 etiqueta w-40">Cómo sale</th>
              <th className="text-right pb-2 etiqueta w-28">Dto. renglón</th>
              <th className="text-right pb-2 etiqueta w-32">Lista</th>
              <th className="text-right pb-2 etiqueta w-32">Unitario</th>
              <th className="text-right pb-2 etiqueta w-32">Subtotal</th>
              <th className="w-10"></th>
            </tr>
          </thead>

          {grupos.map(({ familia, filas }) => {
            const ajuste = ajusteDe(familia)
            const subtotal = filas.reduce((s, { item }) => s + item.cantidad * unitario(item, familia), 0)
            const numero = numeroDeDeposito(config, familia)

            return (
              <tbody key={familia}>
                <tr>
                  <td colSpan={8} className="pt-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-white/5 rounded-xl px-3 py-2">
                      <span className="flex items-center gap-2">
                        {numero && (
                          <span className="w-5 h-5 rounded-md bg-white/15 text-white text-[10px] font-bold flex items-center justify-center">
                            {numero}
                          </span>
                        )}
                        <span className={`chip ${colorFamilia(familia)}`}>
                          {etiquetaFamilia(config, familia)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {filas.length} producto{filas.length === 1 ? '' : 's'}
                        </span>
                      </span>

                      <div className="flex items-center gap-4">
                        {onDescuentoFamilia && !bloquearDescuentos && (
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
                  const modo = modoPorCantidad(item, item.cantidad)

                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5/60">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-slate-100 leading-tight">{item.descripcion}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.codigo}{item.medida ? ` · ${item.medida}` : ''}
                        </p>
                      </td>
                      <td className="py-2">
                        <CampoNumero
                          value={item.cantidad}
                          vacioEnCero={false}
                          decimales={false}
                          onChange={(n) => actualizar(idx, 'cantidad', Math.max(1, n || 1))}
                          onCommit={() => ajustarAlBulto(idx, item)}
                          className="tabular w-16 border border-white/10 rounded-lg px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)] ml-auto block"
                        />
                      </td>

                      {/* Qué es este renglón: el dato que hay que ver para saber
                          cuánto descuento corresponde ponerle. */}
                      <td className="py-2">
                        <span className={`chip ${COLOR_MODO[modo]}`}>{LABEL_MODO[modo]}</span>
                        {modo !== 'unidad' && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {textoModo(item, item.cantidad)}
                          </span>
                        )}
                      </td>

                      <td className="py-2">
                        {bloquearDescuentos ? (
                          <span className="block w-24 ml-auto text-right text-sm text-slate-500">—</span>
                        ) : (
                          <div className="relative w-24 ml-auto">
                            <CampoNumero
                              value={item.descuentoItem ?? 0}
                              onChange={(n) => actualizar(idx, 'descuentoItem', n)}
                              placeholder="-25"
                              title="Descuento de este renglón. Se escribe: -25, +10…"
                              className={`tabular w-full border rounded-lg pl-2.5 pr-6 py-1.5 text-right text-sm font-medium
                                focus:outline-none focus:ring-2 transition ${
                                (item.descuentoItem || 0) < 0
                                  ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10 focus:ring-emerald-400'
                                  : (item.descuentoItem || 0) > 0
                                    ? 'border-amber-400/50 text-amber-300 bg-amber-500/10 focus:ring-amber-400'
                                    : 'border-white/10 focus:ring-[var(--cb-500)]'
                              }`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                          </div>
                        )}
                      </td>

                      <td className="tabular py-2 text-right text-slate-400">{money(base)}</td>
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

      {/* Cómo se llega al total, paso por paso. Los descuentos ya están
          aplicados renglón por renglón: acá van en pesos, para explicar de
          dónde sale el neto. Después el IVA y el total que se cobra. */}
      <div className="flex justify-end">
        <div className="w-full sm:w-96 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 flex justify-between text-sm text-slate-400 bg-white/5">
            <span>Subtotal (lista)</span>
            <span className="tabular">{money(totalBase)}</span>
          </div>

          <div className="divide-y divide-white/5">
            <LineaDescuento etiqueta="Descuento por familia" monto={desglose.familia} />
            <LineaDescuento etiqueta="Descuento por renglón (granel/fracción)" monto={desglose.producto} />
            <LineaDescuento
              etiqueta={`Descuento del cliente${descuento > 0 ? ` (${descuento}%)` : ''}`}
              monto={desglose.cliente}
            />
            <LineaDescuento
              etiqueta={`Pago ${etiquetaPago(config, condicionPago)}${ajustePago ? ` (${pct(ajustePago)})` : ''}`}
              monto={desglose.pago}
            />
          </div>

          <div className="px-4 py-2 flex justify-between text-sm font-medium border-t border-white/10">
            <span className="text-slate-300">Neto</span>
            <span className="tabular text-slate-200">{money(totalFinal)}</span>
          </div>

          {tasasIva.map(tasa => (
            <div key={tasa} className="px-4 py-1.5 flex justify-between text-xs">
              <span className="text-slate-400">
                IVA {tasa % 1 === 0 ? tasa : tasa.toFixed(1).replace('.', ',')}%
              </span>
              <span className="tabular text-slate-400">+{money(desglose.iva[tasa])}</span>
            </div>
          ))}

          <div className="px-4 py-3 flex justify-between items-center border-t border-white/10 bg-white/5">
            <span className="font-semibold text-slate-300">Total</span>
            <span className="tabular text-xl font-bold text-emerald-300">{money(totalConIva)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
