import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerConfirmacion, FAMILIAS_LABEL } from '../utils/aprobaciones'

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

  const items = pedido.subpedidos.flatMap(s => s.items)
  const subtotalSinDescuento = items.reduce((s, i) => s + i.cantidad * (i.precioGranel || i.precio || 0), 0)
  const numeroProforma = pedido.id.slice(-8)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
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
          {pedido.subpedidos.map(sub => (
            <div key={sub.familia} className="mb-2.5 last:mb-0">
              <p className="text-[11px] font-semibold text-blue-800 mb-0.5">{FAMILIAS_LABEL[sub.familia] || sub.familia}</p>
              <table className="w-full text-xs border-collapse leading-tight">
                <thead>
                  <tr className="border-b border-gray-300 text-[10px] text-gray-400">
                    <th className="text-left py-0.5 font-semibold">Código</th>
                    <th className="text-left py-0.5 font-semibold">Descripción</th>
                    <th className="text-left py-0.5 font-semibold">Medida</th>
                    <th className="text-right py-0.5 font-semibold">Cant.</th>
                    <th className="text-right py-0.5 font-semibold">Precio</th>
                    <th className="text-right py-0.5 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.items.map((it, i) => {
                    const precio = it.precioGranel || it.precio || 0
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-0.5 text-gray-400 text-[10px]">{it.codigo || '—'}</td>
                        <td className="py-0.5">{it.descripcion}</td>
                        <td className="py-0.5 text-gray-400">{it.medida || '—'}</td>
                        <td className="py-0.5 text-right">{it.cantidad}</td>
                        <td className="py-0.5 text-right">${precio.toFixed(2)}</td>
                        <td className="py-0.5 text-right font-medium">${(precio * it.cantidad).toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-56 space-y-0.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${subtotalSinDescuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {pedido.descuento > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Descuento ({pedido.descuento}%)</span>
                <span>-${(subtotalSinDescuento - pedido.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-1">
              <span>Total</span>
              <span className="text-green-700">${pedido.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
          Este documento es una proforma sin validez fiscal, sujeta a confirmación de stock y precios al momento de facturar.
          Córdoba Bulones — Ferretería Industrial.
        </p>
      </div>
    </div>
  )
}
