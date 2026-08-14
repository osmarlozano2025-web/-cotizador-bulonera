import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  obtenerConfirmacion,
  FAMILIAS_LABEL,
  LABEL_CONDICION_PAGO,
  cantidadAEntregar,
  precioFinal,
} from '../utils/aprobaciones'

const money = (n) => `$${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Todos los descuentos del renglón, en el orden en que se aplican:
 * familia, cliente y condición de pago.
 */
function textoDescuentos(it) {
  const partes = []

  const ajuste = Number(it.descAjusteFamilia) || 0
  if (ajuste < 0) partes.push(`${-ajuste}%`)
  else if (ajuste > 0) partes.push(`+${ajuste}%`)

  if (it.descCliente > 0) partes.push(`${it.descCliente}%`)

  const pago = Number(it.descPago1) || 0
  if (pago < 0) partes.push(`${-pago}%`)
  else if (pago > 0) partes.push(`+${pago}%`)

  return partes.length ? partes.join(' + ') : '—'
}

export default function Proforma() {
  const { token } = useParams()
  const [pedido, setPedido] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerConfirmacion(token)
      .then(async p => {
        setPedido(p)
        if (p.clienteId) {
          try {
            const res = await fetch(`/api/clientes/${p.clienteId}`)
            if (res.ok) setCliente(await res.json())
          } catch { /* sin datos extendidos, seguimos con lo básico */ }
        }
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
  // El backend ya excluyó lo que no hay stock; acá sólo lo mostramos.
  const hayDescuentos = (totales.ahorro || 0) > 0
  const sinStock = (pedido.subpedidos || []).flatMap(s => s.items).filter(i => i.estado === 'sin_stock')

  return (
    <div className="documento min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
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

      <div className="hoja max-w-3xl mx-auto bg-white shadow-sm my-6 p-8 space-y-3 print:my-0 print:shadow-none print:max-w-none text-[13px]">
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
              Pago: {LABEL_CONDICION_PAGO[pedido.condicionPago] || 'Contado'}
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

        {/* Ítems */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Detalle del pedido</p>
          {pedido.subpedidos.map(sub => {
            const entregables = sub.items.filter(i => i.estado !== 'sin_stock')
            if (!entregables.length) return null

            return (
              <div key={sub.familia} className="mb-2.5 last:mb-0">
                <p className="text-[11px] font-semibold text-blue-800 mb-0.5 flex items-center justify-between">
                  <span>
                    {FAMILIAS_LABEL[sub.familia] || sub.familia}
                    {sub.descuentoFamilia !== 0 && (
                      <span className={`ml-1.5 font-medium ${sub.descuentoFamilia < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                        ({sub.descuentoFamilia < 0
                          ? `${-sub.descuentoFamilia}% de descuento`
                          : `${sub.descuentoFamilia}% de aumento`})
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500 font-normal">{money(sub.subtotal)}</span>
                </p>
                <table className="w-full text-xs border-collapse leading-tight">
                  <thead>
                    <tr className="border-b border-gray-300 text-[10px] text-gray-400">
                      <th className="text-left py-0.5 font-semibold">Código</th>
                      <th className="text-left py-0.5 font-semibold">Descripción</th>
                      <th className="text-right py-0.5 font-semibold">Cant.</th>
                      <th className="text-right py-0.5 font-semibold">Precio</th>
                      <th className="text-right py-0.5 font-semibold">Dto.</th>
                      <th className="text-right py-0.5 font-semibold">P. Neto</th>
                      <th className="text-right py-0.5 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregables.map((it) => {
                      const cant = cantidadAEntregar(it)
                      const neto = precioFinal(it)
                      const lista = it.precioLista || neto
                      const parcial = it.cantidadConfirmada != null && it.cantidadConfirmada < it.cantidad
                      const esReemplazo = it.estado === 'reemplazo'

                      return (
                        <tr key={it.id} className="border-b border-gray-100">
                          <td className="py-0.5 text-gray-400 text-[10px]">{it.codigo || '—'}</td>
                          <td className="py-0.5">
                            {it.descripcion}
                            {it.medida && <span className="text-gray-400"> ({it.medida})</span>}
                            {esReemplazo && (
                              <span className="ml-1 text-[9px] text-green-700 font-semibold">REEMPLAZO</span>
                            )}
                          </td>
                          <td className="py-0.5 text-right">
                            {cant}
                            {parcial && (
                              <span className="text-[9px] text-amber-600 block leading-none">
                                de {it.cantidad}
                              </span>
                            )}
                          </td>
                          <td className="py-0.5 text-right text-gray-400">
                            {lista !== neto ? money(lista) : '—'}
                          </td>
                          <td className="py-0.5 text-right text-gray-500 text-[10px]">{textoDescuentos(it)}</td>
                          <td className="py-0.5 text-right">{money(neto)}</td>
                          <td className="py-0.5 text-right font-medium">{money(neto * cant)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
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

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-64 space-y-0.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{money(totales.subtotalLista)}</span>
            </div>

            {/* Un renglón por familia que tenga ajuste cargado */}
            {pedido.subpedidos.filter(s => s.descuentoFamilia !== 0).map(s => (
              <div key={s.familia} className="flex justify-between text-gray-500">
                <span>
                  {FAMILIAS_LABEL[s.familia] || s.familia}{' '}
                  <span className={s.descuentoFamilia < 0 ? 'text-green-700' : 'text-amber-700'}>
                    {s.descuentoFamilia < 0 ? `−${-s.descuentoFamilia}%` : `+${s.descuentoFamilia}%`}
                  </span>
                </span>
                <span>{money(s.subtotal)}</span>
              </div>
            ))}

            <div className="flex justify-between text-gray-500">
              <span>Condición de pago</span>
              <span>{LABEL_CONDICION_PAGO[pedido.condicionPago] || 'Contado'}</span>
            </div>

            {pedido.descuento > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Descuento del cliente</span>
                <span className="text-green-700">−{pedido.descuento}%</span>
              </div>
            )}

            {hayDescuentos && (
              <div className="flex justify-between text-gray-500 border-t border-gray-100 pt-0.5">
                <span>Ahorro ({totales.descuentoEfectivo}%)</span>
                <span className="text-green-700">−{money(totales.ahorro)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-1">
              <span>Total</span>
              <span className="text-green-700">{money(pedido.total)}</span>
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
