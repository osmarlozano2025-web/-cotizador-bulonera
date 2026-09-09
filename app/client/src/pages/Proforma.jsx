import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  obtenerConfirmacion,
  FAMILIAS_LABEL,
  cantidadAEntregar,
  precioFinal,
} from '../utils/aprobaciones'

const money = (n) => `$${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Todas las descripciones a la misma altura, para que ninguna fila se dispare. */
function acortar(texto, largo = 38) {
  if (!texto) return ''
  return texto.length > largo ? texto.slice(0, largo - 1).trimEnd() + '…' : texto
}

const CHIP_MODO = {
  granel: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  fraccion: 'bg-sky-50 text-sky-700 border border-sky-200',
}
const LABEL_MODO = { granel: 'Granel', fraccion: 'Fracción', unidad: 'Unidad' }

/**
 * Cuánto puso o sacó cada paso de la cadena, en pesos, sumado en todo el
 * pedido. La cadena es multiplicativa (precio × (1+ajuste) uno detrás del
 * otro), así que el aporte de cada paso se mide contra el precio que le llegó
 * a ESE paso, no contra el de lista — es la única cuenta que cierra con el neto.
 */
function desglosePedido(items) {
  const totales = { familia: 0, producto: 0, cliente: 0, pago: 0, neto: 0, iva: {} }

  for (const it of items) {
    const cant = cantidadAEntregar(it)
    const p0 = Number(it.precioLista) || 0
    const p1 = p0 * (1 + (Number(it.descAjusteFamilia) || 0) / 100)
    const p2 = p1 * (1 + (Number(it.descuentoItem) || 0) / 100)
    const p3 = p2 * (1 - Math.abs(Number(it.descCliente) || 0) / 100)
    const p4 = p3 * (1 + (Number(it.descPago1) || 0) / 100)

    totales.familia += (p0 - p1) * cant
    totales.producto += (p1 - p2) * cant
    totales.cliente += (p2 - p3) * cant
    totales.pago += (p3 - p4) * cant

    const neto = p4 * cant
    totales.neto += neto

    const tasa = Number(it.ivaPorcentaje ?? 21)
    totales.iva[tasa] = (totales.iva[tasa] || 0) + neto * (tasa / 100)
  }

  return totales
}

/** Una línea de descuento: verde si resta, ámbar si suma, oculta si no hubo. */
function LineaDescuento({ etiqueta, monto }) {
  const redondeado = Math.round(monto * 100) / 100
  if (redondeado === 0) return null
  const descuenta = redondeado > 0
  return (
    <div className="flex justify-between text-gray-500">
      <span>{etiqueta}</span>
      <span className={descuenta ? 'text-green-700' : 'text-amber-700'}>
        {descuenta ? '−' : '+'}{money(Math.abs(redondeado))}
      </span>
    </div>
  )
}

export default function Proforma() {
  const { token } = useParams()
  const [pedido, setPedido] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  useEffect(() => {
    obtenerConfirmacion(token)
      .then(p => {
        setPedido(p)
        // Los datos de la ficha vienen con el pedido: esta página la abre el
        // cliente sin sesión, y el token del link es lo que la autoriza.
        setCliente(p.cliente || null)
      })
      .catch(e => setError(e.message))
      .finally(() => setCargando(false))
  }, [token])

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-600 font-medium">{error || 'Pedido no encontrado.'}</p>
      </div>
    )
  }

  if (pedido.estado !== 'confirmado') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border rounded-xl p-8 text-center max-w-sm space-y-2">
          <p className="text-gray-600 font-medium">Esta cotización todavía no fue confirmada por el cliente.</p>
          <Link to={`/confirmar/${token}`} className="text-blue-600 hover:underline text-sm">Ir a la confirmación</Link>
        </div>
      </div>
    )
  }

  const numeroProforma = pedido.id.slice(-8)
  const totales = pedido.totales || {}
  const sinStock = (pedido.subpedidos || []).flatMap(s => s.items).filter(i => i.estado === 'sin_stock')
  const entregables = (pedido.subpedidos || []).flatMap(s => s.items).filter(i => i.estado !== 'sin_stock')
  const desglose = desglosePedido(entregables)
  const tasasIva = Object.keys(desglose.iva).map(Number).sort((a, b) => b - a)
  const totalConIva = pedido.total + tasasIva.reduce((s, t) => s + desglose.iva[t], 0)

  // El neto real es el que calculó el backend renglón por renglón — nunca se
  // reinventa acá. Cada paso de la cadena se reconstruye sin redondeos
  // intermedios para explicar el porqué, así que sumados pueden quedar a un
  // par de centavos del neto real en pedidos con muchos renglones. La
  // diferencia se absorbe en el último paso (condición de pago) para que la
  // resta que ve el cliente cierre exacta contra el total que se le cobra.
  const sinAjustar = desglose.familia + desglose.producto + desglose.cliente + desglose.pago
  const pagoAjustado = desglose.pago + ((totales.subtotalLista - sinAjustar) - pedido.total)

  // Un solo % para todo el pedido — cualquier renglón entregable lo tiene igual.
  const pagoPct = Number(entregables[0]?.descPago1) || 0

  return (
    <div className="documento min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .hoja { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link to="/cotizaciones" className="text-sm text-gray-500 hover:text-gray-700">← Volver a Cotizaciones</Link>
        <button
          onClick={() => window.print()}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
        >
          Imprimir / Descargar PDF
        </button>
      </div>

      <div className="hoja max-w-5xl mx-auto bg-white shadow-sm my-6 p-8 space-y-3 print:my-0 print:shadow-none print:max-w-none text-[13px]">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              CB
            </div>
            <div>
              <p className="text-base font-bold text-blue-900 leading-tight">Córdoba Bulones</p>
              <p className="text-[11px] text-gray-400">Ferretería Industrial</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">PROFORMA</p>
            <p className="text-[11px] text-gray-400">N° {numeroProforma}</p>
            <p className="text-[11px] text-gray-400">
              Confirmada el {new Date(pedido.fechaConfirmacion).toLocaleDateString('es-AR')}
            </p>
            <p className="text-[11px] text-gray-400">
              Pago: {pedido.condicionPagoEtiqueta || 'Contado'}
            </p>
          </div>
        </div>

        {/* Datos del cliente */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-700">
            <p><span className="text-gray-400">Nombre:</span> {pedido.clienteNombre}</p>
            {cliente?.razonSocial && <p><span className="text-gray-400">Razón Social:</span> {cliente.razonSocial}</p>}
            {cliente?.cuit && <p><span className="text-gray-400">CUIT:</span> {cliente.cuit}</p>}
            {(cliente?.localidad || cliente?.provincia) && (
              <p><span className="text-gray-400">Ubicación:</span> {[cliente?.localidad, cliente?.provincia].filter(Boolean).join(', ')}</p>
            )}
            {pedido.clienteTelefono && <p><span className="text-gray-400">Teléfono:</span> {pedido.clienteTelefono}</p>}
            {pedido.clienteEmail && <p><span className="text-gray-400">Email:</span> {pedido.clienteEmail}</p>}
          </div>
        </div>

        {/* Ítems: una sola tabla para todo el pedido — con columnas separadas por
            familia, cada tabla calcula su propio ancho y las filas quedaban
            desalineadas de un grupo a otro. Acá el ancho es uno solo. */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Detalle del pedido</p>
          <table className="w-full text-xs border-collapse leading-tight table-fixed">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '29%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-300 text-[10px] text-gray-400">
                <th className="text-left py-0.5 font-semibold">Código</th>
                <th className="text-left py-0.5 font-semibold">Descripción</th>
                <th className="text-right py-0.5 font-semibold">Cant.</th>
                <th className="text-left py-0.5 font-semibold">Modo</th>
                <th className="text-right py-0.5 font-semibold">Bultos</th>
                <th className="text-right py-0.5 font-semibold">Lista</th>
                <th className="text-right py-0.5 font-semibold">Subtotal</th>
              </tr>
            </thead>
            {pedido.subpedidos.map(sub => {
              const filas = sub.items.filter(i => i.estado !== 'sin_stock')
              if (!filas.length) return null

              return (
                <tbody key={sub.familia}>
                  <tr className="bg-gray-100">
                    <td colSpan={7} className="py-1.5 px-1">
                      <span className="text-[12px] font-bold text-blue-900">
                        {FAMILIAS_LABEL[sub.familia] || sub.familia}
                      </span>
                      {sub.descuentoFamilia !== 0 && (
                        <span className={`ml-1.5 text-[10px] font-medium ${sub.descuentoFamilia < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                          ({sub.descuentoFamilia < 0
                            ? `${-sub.descuentoFamilia}% de descuento`
                            : `${sub.descuentoFamilia}% de aumento`})
                        </span>
                      )}
                      <span className="float-right text-[12px] font-bold text-gray-800">
                        Subtotal: {money(sub.subtotal)}
                      </span>
                    </td>
                  </tr>

                  {filas.map((it) => {
                    const cant = cantidadAEntregar(it)
                    const neto = precioFinal(it)
                    const lista = it.precioLista || neto
                    const parcial = it.cantidadConfirmada != null && it.cantidadConfirmada < it.cantidad
                    const esReemplazo = it.estado === 'reemplazo'
                    const modo = it.modoVenta && it.modoVenta !== 'unidad' ? it.modoVenta : null

                    return (
                      <tr key={it.id} className="border-b border-gray-100 align-top">
                        <td className="py-1 text-gray-400 text-[10px]">{it.codigo || '—'}</td>
                        <td className="py-1 overflow-hidden">
                          <p className="truncate">{acortar(it.descripcion)}</p>
                          {it.medida && (
                            <p className="text-[10px] text-gray-400 truncate">({acortar(it.medida, 40)})</p>
                          )}
                          {esReemplazo && (
                            <span className="text-[9px] text-green-700 font-semibold">REEMPLAZO</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {cant}
                          {parcial && (
                            <span className="text-[9px] text-amber-600 block leading-none">de {it.cantidad}</span>
                          )}
                        </td>
                        {/* Cómo salió el renglón: el sticker de color que ya se usa
                            en Depósito y en la carga del pedido, con el descuento
                            que se le cargó a mano a ESTE renglón (si tiene). */}
                        <td className="py-1">
                          {modo && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${CHIP_MODO[modo]}`}>
                              {LABEL_MODO[modo]}
                            </span>
                          )}
                          {Number(it.descuentoItem) !== 0 && (
                            <span className={`block text-[10px] font-semibold mt-0.5 ${Number(it.descuentoItem) < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                              {Number(it.descuentoItem) < 0 ? '' : '+'}{it.descuentoItem}%
                            </span>
                          )}
                        </td>
                        <td className="py-1 text-right text-gray-600">
                          {it.bultos > 0
                            ? `${it.bultos} × ${it.modoVenta === 'granel' ? it.unidadGranel : it.unidadFraccion}`
                            : '—'}
                        </td>
                        <td className="py-1 text-right text-gray-500">{money(lista)}</td>
                        <td className="py-1 text-right font-semibold">{money(neto * cant)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              )
            })}
          </table>
        </div>

        {/* Lo que el depósito no pudo entregar: se informa, no se cobra */}
        {sinStock.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded p-2">
            <p className="text-[11px] font-semibold text-amber-800 mb-0.5">
              Sin stock — no incluido en el total
            </p>
            <ul className="text-[11px] text-amber-700 space-y-0.5">
              {sinStock.map(it => (
                <li key={it.id}>
                  {it.cantidad}× {it.descripcion}
                  {it.medida && <span className="text-amber-600"> ({it.medida})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Totales: subtotal de lista, cuánto sacó (o puso) cada paso de la
            cadena de descuentos, el neto, el IVA de cada alícuota que haya en
            el pedido, y el total final. */}
        <div className="flex justify-end">
          <div className="w-72 space-y-0.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal (lista)</span>
              <span>{money(totales.subtotalLista)}</span>
            </div>

            {/* Familia y producto varían línea por línea (cada renglón puede
                traer un ajuste distinto): el % de cada uno ya se ve arriba,
                junto a su renglón. Acá va sólo lo que suman en total. */}
            <LineaDescuento etiqueta="Descuento por familia" monto={desglose.familia} />
            <LineaDescuento etiqueta="Descuento por producto (granel/fracción)" monto={desglose.producto} />

            {/* Cliente y condición de pago son un único % para todo el
                pedido, así que ese % va al lado del monto. */}
            <LineaDescuento
              etiqueta={`Descuento por cliente${pedido.descuento > 0 ? ` (${pedido.descuento}%)` : ''}`}
              monto={desglose.cliente}
            />
            <LineaDescuento
              etiqueta={`Condición de pago (${pedido.condicionPagoEtiqueta || 'Contado'}${
                pagoPct ? `, ${pagoPct < 0 ? '' : '+'}${pagoPct}%` : ''
              })`}
              monto={pagoAjustado}
            />

            <div className="flex justify-between font-medium text-gray-700 border-t border-gray-200 pt-0.5">
              <span>Neto</span>
              <span>{money(pedido.total)}</span>
            </div>

            {tasasIva.map(tasa => (
              <div key={tasa} className="flex justify-between text-gray-500">
                <span>IVA {tasa % 1 === 0 ? tasa : tasa.toFixed(1).replace('.', ',')}%</span>
                <span>+{money(desglose.iva[tasa])}</span>
              </div>
            ))}

            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-1">
              <span>Total</span>
              <span className="text-green-700">{money(totalConIva)}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
          Este documento es una proforma sin validez fiscal, sujeta a confirmación de stock y precios al momento de facturar.
          Los descuentos se aplican en forma encadenada sobre el precio de lista.
          Córdoba Bulones — Ferretería Industrial.
        </p>
      </div>
    </div>
  )
}
