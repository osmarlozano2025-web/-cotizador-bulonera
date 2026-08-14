import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerAprobacion, FAMILIAS_LABEL, cantidadAEntregar } from '../utils/aprobaciones'

/**
 * Comprobante para el depósito: código, descripción, medida y cantidad.
 * Sin precios ni montos — va al galpón, no al cliente (requisito 10).
 */
export default function NotaDeposito() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerAprobacion(id)
      .then(setPedido)
      .catch(e => setError(e.message))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (error || !pedido) return <div className="p-8 text-center text-red-600">{error || 'Pedido no encontrado.'}</div>

  const fecha = new Date(pedido.fechaCreacion).toLocaleDateString('es-AR')

  return (
    <div className="documento min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .hoja { box-shadow: none !important; margin: 0 !important; }
          .salto { break-before: page; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link to="/aprobaciones" className="text-sm text-gray-500 hover:text-gray-700">← Volver a Aprobaciones</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Sin precios — para el depósito</span>
          <button
            onClick={() => window.print()}
            className="bg-gray-800 hover:bg-black text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Imprimir
          </button>
        </div>
      </div>

      {pedido.subpedidos.map((sub, idx) => {
        // Lo marcado sin stock se imprime igual pero tachado: el depósito
        // necesita ver que ese renglón se revisó y no se entrega.
        const entregables = sub.items.filter(i => i.estado !== 'sin_stock')
        const sinStock = sub.items.filter(i => i.estado === 'sin_stock')

        return (
          <div
            key={sub.familia}
            className={`hoja max-w-3xl mx-auto bg-white shadow-sm my-6 p-8 print:my-0 print:shadow-none print:max-w-none ${idx > 0 ? 'salto' : ''}`}
          >
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-2 mb-4">
              <div>
                <p className="text-lg font-bold text-gray-900">NOTA DE PEDIDO</p>
                <p className="text-sm text-gray-500">Córdoba Bulones — Ferretería Industrial</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {sub.depositoNombre || FAMILIAS_LABEL[sub.familia] || sub.familia}
                </p>
                <p className="text-xs text-gray-500">Pedido N° {pedido.id.slice(-8)} · {fecha}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <p><span className="text-gray-400">Cliente:</span> <span className="font-medium">{pedido.clienteNombre}</span></p>
              <p className="text-right">
                <span className="text-gray-400">Renglones:</span>{' '}
                <span className="font-medium">{entregables.length}</span>
              </p>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 text-xs text-gray-500 uppercase">
                  <th className="text-left py-1.5 font-semibold w-24">Código</th>
                  <th className="text-left py-1.5 font-semibold">Descripción</th>
                  <th className="text-left py-1.5 font-semibold w-32">Medida</th>
                  <th className="text-right py-1.5 font-semibold w-20">Cantidad</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {entregables.map(it => (
                  <tr key={it.id} className="border-b border-gray-200">
                    <td className="py-1.5 font-mono text-xs">{it.codigo || '—'}</td>
                    <td className="py-1.5">
                      {it.descripcion}
                      {it.estado === 'reemplazo' && (
                        <span className="ml-1 text-xs font-semibold text-gray-500">(reemplazo)</span>
                      )}
                    </td>
                    <td className="py-1.5 text-gray-500">{it.medida || '—'}</td>
                    <td className="py-1.5 text-right font-bold text-base">{cantidadAEntregar(it)}</td>
                    {/* Casillero para tildar a mano al preparar */}
                    <td className="py-1.5 text-right">
                      <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded-sm align-middle"></span>
                    </td>
                  </tr>
                ))}

                {sinStock.map(it => (
                  <tr key={it.id} className="border-b border-gray-200 text-gray-400">
                    <td className="py-1.5 font-mono text-xs line-through">{it.codigo || '—'}</td>
                    <td className="py-1.5 line-through">{it.descripcion}</td>
                    <td className="py-1.5 line-through">{it.medida || '—'}</td>
                    <td className="py-1.5 text-right font-semibold">SIN STOCK</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {entregables.length === 0 && (
              <p className="text-center text-gray-400 py-6 text-sm">
                Este depósito no tiene productos para preparar.
              </p>
            )}

            <div className="mt-10 grid grid-cols-2 gap-10 text-xs text-gray-500">
              <div className="border-t border-gray-400 pt-1">Preparado por</div>
              <div className="border-t border-gray-400 pt-1">Fecha y hora</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
