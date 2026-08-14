import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  listarAprobaciones, aprobarFamilia, marcarEnviado, confirmarItem, marcarSinStock,
  FAMILIAS_LABEL, linkConfirmacion, linkWhatsApp, linkGmail, linkOutlook,
  obtenerLog, LABEL_CONDICION_PAGO,
} from '../utils/aprobaciones'
import { buscarProductos } from '../utils/productosApi'
import { useAuth } from '../context/AuthContext'

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

/** Buscador acotado a la familia del depósito, para elegir un producto similar. */
function BuscarReemplazo({ familia, onElegir, onCancelar }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(() => {
      setBuscando(true)
      buscarProductos(query, familia)
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query, familia])

  return (
    <div className="mt-2 bg-white border border-amber-300 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800">Elegí el producto similar que sí tenés</p>
        <button onClick={onCancelar} className="text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por descripción, código o medida..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        autoFocus
      />

      {buscando && <p className="text-xs text-slate-500">Buscando...</p>}

      {resultados.length > 0 && (
        <div className="max-h-52 overflow-y-auto divide-y divide-white/5 border rounded-lg">
          {resultados.slice(0, 25).map((p, i) => (
            <button
              key={p.codigo || i}
              onClick={() => onElegir(p)}
              className="w-full text-left px-3 py-2 hover:bg-amber-500/10 transition"
            >
              <p className="text-xs font-medium text-slate-100">{p.descripcion}</p>
              <p className="text-[11px] text-slate-500">
                {p.codigo} {p.medida ? `· ${p.medida}` : ''} · {money(p.precioGranel ?? p.precio)}
              </p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => onElegir(null)}
        className="w-full text-xs text-slate-400 hover:text-slate-200 border border-dashed border-white/10 rounded-lg py-2 transition"
      >
        No hay reemplazo — marcar sólo como sin stock
      </button>
    </div>
  )
}

/** Una fila de producto con su estado de stock y las acciones del depósito. */
function FilaItem({ item, pedidoId, familia, puedeRevisar, bloqueado, recargar }) {
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const sinStock = item.estado === 'sin_stock'
  const esReemplazo = item.estado === 'reemplazo'
  const confirmado = item.estado === 'confirmado'
  const pendiente = item.estado === 'pendiente'

  const accion = async (fn) => {
    setGuardando(true)
    setError(null)
    try {
      await fn()
      recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
      setBuscando(false)
    }
  }

  const confirmar = () => accion(() => confirmarItem(pedidoId, item.id))

  const sinStockCon = (producto) =>
    accion(() =>
      marcarSinStock(pedidoId, item.id, {
        nota: 'Sin stock',
        reemplazo: producto
          ? {
              codigo: producto.codigo,
              descripcion: producto.descripcion,
              medida: producto.medida,
              marca: producto.marca,
              subfamilia: producto.subfamilia,
              precioGranel: producto.precioGranel ?? producto.precio ?? 0,
              cantidad: item.cantidad,
            }
          : null,
      })
    )

  return (
    <div className={`py-2 ${esReemplazo ? 'pl-4 border-l-2 border-emerald-400' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex-1 min-w-0 ${sinStock ? 'line-through text-slate-500' : ''}`}>
          <p className="text-xs text-slate-100">
            <span className="font-semibold">{item.cantidadConfirmada ?? item.cantidad}×</span>{' '}
            {item.descripcion}
            {/* Trazabilidad: si se confirma menos de lo pedido, se ve acá */}
            {item.cantidadConfirmada != null && item.cantidadConfirmada < item.cantidad && !sinStock && (
              <span className="ml-1 text-[11px] text-amber-400 font-medium">
                (se pidieron {item.cantidad})
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            {item.codigo} {item.medida ? `· ${item.medida}` : ''} · {money(item.precioNeto || item.precioGranel)}
            {item.precioLista > (item.precioNeto || item.precioGranel) && (
              <span className="line-through ml-1">{money(item.precioLista)}</span>
            )}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {sinStock && (
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-0.5">
              Sin stock
            </span>
          )}
          {esReemplazo && (
            <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
              Reemplazo
            </span>
          )}
          {confirmado && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
              ✓ Hay stock
            </span>
          )}

          {pendiente && puedeRevisar && !bloqueado && !buscando && (
            <>
              <button
                onClick={confirmar}
                disabled={guardando}
                className="text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded px-2 py-1 transition"
              >
                Hay stock
              </button>
              <button
                onClick={() => setBuscando(true)}
                disabled={guardando}
                className="text-[11px] font-semibold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 rounded px-2 py-1 transition"
              >
                Sin stock
              </button>
            </>
          )}

          {pendiente && (!puedeRevisar || bloqueado) && (
            <span className="text-[11px] text-slate-500">Sin revisar</span>
          )}
        </div>
      </div>

      {item.nota && !esReemplazo && (
        <p className="text-[11px] text-slate-500 mt-0.5">{item.nota}</p>
      )}
      {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}

      {buscando && (
        <BuscarReemplazo
          familia={familia}
          onElegir={sinStockCon}
          onCancelar={() => setBuscando(false)}
        />
      )}
    </div>
  )
}

function EnviarCliente({ pedido, onEnviado }) {
  const [copiado, setCopiado] = useState(false)
  const link = linkConfirmacion(pedido.token)

  const marcar = async () => { try { await marcarEnviado(pedido.id) } catch {} onEnviado?.() }

  const copiar = async () => {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-green-800">✓ Aprobado internamente — listo para enviar al cliente</p>
      <div className="flex flex-wrap gap-2">
        <a href={linkWhatsApp(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por WhatsApp
        </a>
        <a href={linkGmail(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por Gmail
        </a>
        <a href={linkOutlook(pedido)} target="_blank" rel="noreferrer" onClick={marcar}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
          Enviar por Outlook
        </a>
        <button onClick={() => { copiar(); marcar() }}
          className="border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition">
          {copiado ? '✓ Copiado' : 'Copiar link'}
        </button>
      </div>
      {pedido.fechaEnvioCliente && (
        <p className="text-xs text-emerald-400">Enviado el {new Date(pedido.fechaEnvioCliente).toLocaleString('es-AR')}</p>
      )}
    </div>
  )
}

const ICONO_EVENTO = {
  creado: '📝',
  stock_confirmado: '✓',
  sin_stock: '⚠',
  deposito_aprobado: '📦',
  cambio_estado: '→',
  enviado_cliente: '✉',
}

/** Quién tocó qué y cuándo. Se carga sólo cuando se abre. */
function Historial({ pedidoId }) {
  const [eventos, setEventos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    obtenerLog(pedidoId).then(setEventos).catch(e => setError(e.message))
  }, [pedidoId])

  if (error) return <p className="text-xs text-rose-400">{error}</p>
  if (!eventos) return <p className="text-xs text-slate-500">Cargando historial...</p>
  if (!eventos.length) {
    return (
      <p className="text-xs text-slate-500">
        Sin movimientos registrados. El historial se completa con lo que pase de ahora en adelante.
      </p>
    )
  }

  return (
    <ol className="space-y-2 border-l-2 border-white/10 pl-3">
      {eventos.map(ev => (
        <li key={ev.id} className="text-xs relative">
          <span className="absolute -left-[19px] bg-white text-[10px]">
            {ICONO_EVENTO[ev.evento] || '•'}
          </span>
          <p className="text-slate-200">{ev.detalle || ev.evento}</p>
          <p className="text-[11px] text-slate-500">
            {new Date(ev.fecha.replace(' ', 'T')).toLocaleString('es-AR')}
            {ev.usuarioNombre && ` · ${ev.usuarioNombre}`}
            {ev.estadoAnterior && ev.estadoNuevo && ` · ${ev.estadoAnterior} → ${ev.estadoNuevo}`}
          </p>
        </li>
      ))}
    </ol>
  )
}

function TarjetaPedido({ pedido, recargar, puedeAprobar, puedeEnviar, usuarioId }) {
  const [aprobando, setAprobando] = useState(null)
  const [errorFamilia, setErrorFamilia] = useState({})
  const [verHistorial, setVerHistorial] = useState(false)

  const aprobar = async (familia) => {
    setAprobando(familia)
    setErrorFamilia((e) => ({ ...e, [familia]: null }))
    try {
      await aprobarFamilia(pedido.id, familia)
      recargar()
    } catch (e) {
      setErrorFamilia((prev) => ({ ...prev, [familia]: e.message }))
    } finally {
      setAprobando(null)
    }
  }

  return (
    <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
            {pedido.clienteNombre}
            {pedido.tipoOrigen === 'directo' && (
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                PEDIDO DIRECTO
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(pedido.fechaCreacion).toLocaleString('es-AR')} · {money(pedido.total)}
            {' · '}Pago {LABEL_CONDICION_PAGO[pedido.condicionPago] || 'Contado'}
          </p>
          {pedido.totales?.ahorro > 0 && (
            <p className="text-[11px] text-emerald-400">
              Lista {money(pedido.totales.subtotalLista)} · descuentos {pedido.totales.descuentoEfectivo}%
              {pedido.totales.itemsSinStock > 0 && (
                <span className="text-amber-400">
                  {' · '}{pedido.totales.itemsSinStock} sin stock (no suma)
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/nota-deposito/${pedido.id}`}
            className="text-xs font-semibold text-slate-300 border border-white/10 hover:bg-white/5 rounded px-2.5 py-1 transition"
            title="Comprobante para el galpón, sin precios"
          >
            Nota de depósito
          </Link>
          <button
            onClick={() => setVerHistorial(v => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-white/10 rounded px-2.5 py-1 transition"
          >
            {verHistorial ? 'Ocultar' : 'Historial'}
          </button>
        </div>
      </div>

      {verHistorial && (
        <div className="px-4 py-3 bg-white/5 border-b">
          <Historial pedidoId={pedido.id} />
        </div>
      )}

      <div className="divide-y divide-white/5">
        {pedido.subpedidos.map((sub) => {
          // El depósito revisa su propio stock; el admin puede hacerlo por cualquiera.
          const esMiDeposito = !sub.responsableId || sub.responsableId === usuarioId
          const puedeRevisar = puedeAprobar && esMiDeposito
          const pendientes = sub.itemsPendientes ?? 0

          return (
            <div key={sub.familia} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {sub.depositoNombre || `${FAMILIAS_LABEL[sub.familia] || sub.familia} · Depósito`}
                  </p>
                  {pendientes > 0 && !sub.aprobado && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                      {pendientes} producto{pendientes === 1 ? '' : 's'} sin revisar
                    </p>
                  )}
                </div>

                {sub.aprobado ? (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
                    ✓ Aprobado
                  </span>
                ) : puedeRevisar ? (
                  <button
                    onClick={() => aprobar(sub.familia)}
                    disabled={aprobando === sub.familia || pendientes > 0}
                    title={pendientes > 0 ? 'Revisá el stock de cada producto primero' : ''}
                    className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded px-3 py-1 transition"
                  >
                    {aprobando === sub.familia ? 'Aprobando...' : 'Aprobar depósito'}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
                    Esperando al depósito
                  </span>
                )}
              </div>

              {errorFamilia[sub.familia] && (
                <p className="text-[11px] text-rose-400 mb-1">{errorFamilia[sub.familia]}</p>
              )}

              <div className="divide-y divide-white/5">
                {sub.items.map((it) => (
                  <FilaItem
                    key={it.id}
                    item={it}
                    pedidoId={pedido.id}
                    familia={sub.familia}
                    puedeRevisar={puedeRevisar}
                    bloqueado={sub.aprobado}
                    recargar={recargar}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {pedido.estado === 'esperando_confirmacion' && puedeEnviar && (
        <div className="p-4 border-t">
          <EnviarCliente pedido={pedido} onEnviado={recargar} />
        </div>
      )}
    </div>
  )
}

export default function Aprobaciones() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const { state } = useLocation()
  const { user } = useAuth()
  const puedeAprobar = user?.permisos?.puedeAprobarFamilias ?? false
  const puedeEnviar = user?.permisos?.puedeEnviarCliente ?? false

  const cargar = () => {
    listarAprobaciones().then(data => { setPedidos(data); setCargando(false) }).catch(() => setCargando(false))
  }

  useEffect(cargar, [])

  const pendientes = pedidos.filter(p => p.estado !== 'confirmado')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Aprobaciones</h2>
        <p className="text-sm text-slate-500 mt-0.5">Pedidos separados por depósito, pendientes de aprobar stock o de confirmar con el cliente</p>
      </div>

      {state?.creado && (
        <p className="text-sm text-sky-400 bg-sky-500/10 border border-blue-200 rounded-lg px-3 py-2">
          Pedido enviado a aprobación correctamente.
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border rounded-xl p-10 text-center">
          No hay pedidos pendientes de aprobación.
        </p>
      ) : (
        <div className="space-y-4">
          {pendientes.map(p => (
            <TarjetaPedido
              key={p.id}
              pedido={p}
              recargar={cargar}
              puedeAprobar={puedeAprobar}
              puedeEnviar={puedeEnviar}
              usuarioId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
