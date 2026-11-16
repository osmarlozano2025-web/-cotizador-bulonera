import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerAprobacion, FAMILIAS_LABEL, cantidadAEntregar } from '../utils/aprobaciones'

/**
 * Comprobante para el depósito: código, descripción, medida y cantidad.
 * Sin precios ni montos — va al galpón, no al cliente (requisito 10).
 */
/**
 * Una hoja por depósito. Los subpedidos vienen separados por familia, pero el
 * galpón general despacha varias familias juntas y quien prepara necesita una
 * sola hoja, no tres. Cada renglón conserva su familia para poder rotularlo.
 */
function agruparPorDeposito(subpedidos) {
  const porNumero = new Map()

  for (const sub of subpedidos) {
    const clave = sub.depositoNumero ?? `sin-deposito-${sub.familia}`
    if (!porNumero.has(clave)) {
      porNumero.set(clave, {
        clave,
        numero: sub.depositoNumero,
        nombre: sub.depositoNombre || FAMILIAS_LABEL[sub.familia] || sub.familia,
        familias: [],
        items: [],
      })
    }
    const dep = porNumero.get(clave)
    dep.familias.push(sub.familia)
    dep.items.push(...sub.items)
  }

  return [...porNumero.values()].sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99))
}

/** Ficha completa del cliente para el remito. Sin precios: eso no es de acá. */
function DatosCliente({ pedido, renglones }) {
  const c = pedido.cliente
  const campos = [
    ['Razón social', c?.razonSocial && c.razonSocial !== c?.nombre ? c.razonSocial : null],
    ['CUIT', c?.cuit],
    ['Teléfono', c?.telefono || pedido.clienteTelefono],
    ['Domicilio', c?.domicilio],
    ['Localidad', [c?.localidad, c?.provincia].filter(Boolean).join(', ') || null],
    ['Código', c?.codigoCliente],
  ].filter(([, valor]) => valor)

  return (
    <div className="border-b border-gray-200 pb-3 mb-4 text-sm">
      <div className="flex items-start justify-between">
        <p><span className="text-gray-400">Cliente:</span> <span className="font-bold text-base">{pedido.clienteNombre}</span></p>
        <p className="text-right">
          <span className="text-gray-400">Renglones:</span>{' '}
          <span className="font-medium">{renglones}</span>
        </p>
      </div>
      {campos.length > 0 && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 mt-1.5 text-xs">
          {campos.map(([etiqueta, valor]) => (
            <p key={etiqueta}><span className="text-gray-400">{etiqueta}:</span> {valor}</p>
          ))}
        </div>
      )}
    </div>
  )
}

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
          /* Hoja A4 vertical, sola: sin menú lateral, fondo oscuro ni marca de agua. */
          @page { size: A4 portrait; margin: 12mm; }
          /* Que salga igual que en pantalla: sin esto el navegador borra los colores de las etiquetas Granel / Fracción. */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { background: #fff !important; color: #111 !important; }
          body::before, body::after { display: none !important; }
          aside, .fixed, .no-print { display: none !important; }
          main { padding: 0 !important; }
          main > div { max-width: none !important; margin: 0 !important; }
          .documento { min-height: 0 !important; background: #fff !important; }
          .hoja { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; max-width: none !important; }
          .salto { break-before: page; }
          /* El listado sigue en la hoja siguiente con su encabezado, sin cortar renglones. */
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          .firmas { break-inside: avoid; }
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

      {agruparPorDeposito(pedido.subpedidos).map((sub, idx) => {
        // Lo marcado sin stock se imprime igual pero tachado: el depósito
        // necesita ver que ese renglón se revisó y no se entrega.
        const entregables = sub.items.filter(i => i.estado !== 'sin_stock')
        const sinStock = sub.items.filter(i => i.estado === 'sin_stock')

        return (
          <div
            key={sub.clave}
            className={`hoja w-[210mm] max-w-full mx-auto bg-white text-gray-900 shadow-sm my-6 p-8 print:my-0 print:shadow-none print:max-w-none ${idx > 0 ? 'salto' : ''}`}
          >
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-2 mb-4">
              <div>
                <p className="text-lg font-bold text-gray-900">NOTA DE PEDIDO</p>
                <p className="text-sm text-gray-500">Córdoba Bulones — Ferretería Industrial</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {sub.nombre}
                </p>
                <p className="text-xs text-gray-500">Pedido N° {pedido.id.slice(-8)} · {fecha}</p>
              </div>
            </div>

            <DatosCliente pedido={pedido} renglones={entregables.length} />

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 text-xs text-gray-500 uppercase">
                  <th className="text-left py-1.5 font-semibold w-24">Código</th>
                  <th className="text-left py-1.5 font-semibold">Descripción</th>
                  <th className="text-left py-1.5 font-semibold w-28">Medida</th>
                  <th className="text-left py-1.5 font-semibold w-32">Modo</th>
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
                    {/* Granel o fracción, y en cuántos bultos cerrados: es lo
                        que hay que saber para juntar el pedido sin abrir cajas
                        de más. */}
                    <td className="py-1.5 text-xs text-gray-600">
                      {it.modoVenta && it.modoVenta !== 'unidad' ? (
                        <>
                          <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                            it.modoVenta === 'granel'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {it.modoVenta === 'granel' ? 'Granel' : 'Fracción'}
                          </span>
                          {it.bultos > 0 && (
                            <span className="block text-gray-400 mt-0.5">
                              {it.bultos} × {it.modoVenta === 'granel' ? it.unidadGranel : it.unidadFraccion}
                            </span>
                          )}
                        </>
                      ) : '—'}
                    </td>
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
                    <td></td>
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

            {/* Los bultos son del envío completo, no de este depósito: se imprimen
                como referencia para quien carga el camión. Si todavía no se
                contaron, queda la línea en blanco para anotarlos a mano. */}
            <div className="mt-8 flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-700">Bultos del envío:</span>
              {pedido.bultos != null ? (
                <span className="font-bold text-base">{pedido.bultos}</span>
              ) : (
                <span className="inline-block w-16 border-b border-gray-400"></span>
              )}
            </div>

            <div className="firmas mt-8 grid grid-cols-2 gap-10 text-xs text-gray-500">
              <div className="border-t border-gray-400 pt-1">Preparado por</div>
              <div className="border-t border-gray-400 pt-1">Fecha y hora</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
