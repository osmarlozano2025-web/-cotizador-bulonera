import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerConfirmacion, confirmarPedido } from '../utils/aprobaciones'

export default function ConfirmarPedido() {
  const { token } = useParams()
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = () => {
    obtenerConfirmacion(token)
      .then(setPedido)
      .catch(e => setError(e.message))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  const confirmar = async () => {
    setConfirmando(true)
    try {
      const actualizado = await confirmarPedido(token)
      setPedido(actualizado)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmando(false)
    }
  }

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border rounded-xl p-8 text-center max-w-sm">
          <p className="text-red-600 font-medium">{error || 'Pedido no encontrado.'}</p>
        </div>
      </div>
    )
  }

  const todos = pedido.subpedidos.flatMap(s => s.items)
  // Al cliente sólo le mostramos lo que va a recibir. Lo que el depósito marcó
  // sin stock se informa aparte y no entra en el total.
  const items = todos.filter(i => i.estado !== 'sin_stock')
  const sinStock = todos.filter(i => i.estado === 'sin_stock')
  const totales = pedido.totales || {}

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-blue-900">Córdoba Bulones</h1>
          <p className="text-sm text-gray-500">Confirmación de cotización</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="font-semibold text-gray-800">{pedido.clienteNombre}</p>
            <p className="text-xs text-gray-400">{new Date(pedido.fechaCreacion).toLocaleDateString('es-AR')}</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {items.map((it) => {
              const cant = it.cantidadConfirmada ?? it.cantidad
              const parcial = it.cantidadConfirmada != null && it.cantidadConfirmada < it.cantidad
              return (
                <div key={it.id} className="px-4 py-2.5 flex justify-between text-sm gap-3">
                  <span>
                    {cant}× {it.descripcion} {it.medida && <span className="text-gray-400">({it.medida})</span>}
                    {parcial && (
                      <span className="text-xs text-amber-600 block">
                        Se entregan {cant} de los {it.cantidad} pedidos
                      </span>
                    )}
                    {it.estado === 'reemplazo' && (
                      <span className="text-xs text-green-700 block">Reemplaza un producto sin stock</span>
                    )}
                  </span>
                  <span className="text-gray-500 whitespace-nowrap">
                    ${((it.precioNeto || it.precioGranel || 0) * cant).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )
            })}
          </div>

          {sinStock.length > 0 && (
            <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1">Sin stock — no se cobra</p>
              {sinStock.map(it => (
                <p key={it.id} className="text-xs text-amber-700 line-through">
                  {it.cantidad}× {it.descripcion}
                </p>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t space-y-1">
            {totales.ahorro > 0 && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Precio de lista</span>
                <span>${totales.subtotalLista.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {totales.ahorro > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Descuentos ({totales.descuentoEfectivo}%)</span>
                <span>−${totales.ahorro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-gray-400">Total</span>
              <span className="text-lg font-bold text-green-700">
                ${pedido.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {pedido.estado === 'confirmado' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3">
            <div>
              <p className="text-green-700 font-semibold">✓ Cotización confirmada</p>
              <p className="text-xs text-green-600 mt-1">
                Confirmada el {new Date(pedido.fechaConfirmacion).toLocaleString('es-AR')}. ¡Gracias!
              </p>
            </div>
            <Link
              to={`/proforma/${token}`}
              className="inline-block bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Ver / Descargar Proforma
            </Link>
          </div>
        ) : (
          <button
            onClick={confirmar}
            disabled={confirmando}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
          >
            {confirmando ? 'Confirmando...' : 'Confirmar pedido'}
          </button>
        )}
      </div>
    </div>
  )
}
