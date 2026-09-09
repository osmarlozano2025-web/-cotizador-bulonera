import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  listarAprobaciones, aprobarFamilia, marcarEnviado, confirmarItem, marcarSinStock,
  guardarBultos,
  etiquetaFamilia, linkConfirmacion, linkWhatsApp, linkGmail, linkOutlook,
  obtenerLog, etiquetaPago, obtenerConfiguraciones,
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
    <div className="mt-2 bg-white/5 border border-amber-400/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-300">Elegí el producto similar que sí tenés</p>
        <button onClick={onCancelar} className="text-xs text-slate-400 hover:text-slate-300">Cancelar</button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por descripción, código o medida..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        autoFocus
      />

      {buscando && <p className="text-xs text-slate-400">Buscando...</p>}

      {resultados.length > 0 && (
        <div className="max-h-52 overflow-y-auto divide-y divide-white/5 border rounded-lg">
          {resultados.slice(0, 25).map((p, i) => (
            <button
              key={p.codigo || i}
              onClick={() => onElegir(p)}
              className="w-full text-left px-3 py-2 hover:bg-amber-500/10 transition"
            >
              <p className="text-xs font-medium text-slate-100">{p.descripcion}</p>
              <p className="text-[11px] text-slate-400">
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
  // Arranca en lo pedido: el caso normal es confirmar todo, y así el depósito
  // sólo toca el número cuando entrega de menos.
  const [cantidad, setCantidad] = useState(String(item.cantidad))

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

  const cantidadNum = parseFloat(cantidad)
  const cantidadValida = !isNaN(cantidadNum) && cantidadNum > 0 && cantidadNum <= item.cantidad
  const entregaParcial = cantidadValida && cantidadNum < item.cantidad

  const confirmar = () => {
    if (!cantidadValida) {
      setError(`Poné un número entre 1 y ${item.cantidad}. Si no hay nada, usá "Sin stock".`)
      return
    }
    return accion(() => confirmarItem(pedidoId, item.id, { cantidad: cantidadNum }))
  }

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
        <div className={`flex-1 min-w-0 ${sinStock ? 'line-through text-slate-400' : ''}`}>
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
          <p className="text-[11px] text-slate-400">
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
              <label className="flex items-center gap-1">
                <span className="sr-only">Cantidad a enviar</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={item.cantidad}
                  value={cantidad}
                  onChange={(e) => { setCantidad(e.target.value); setError(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && cantidadValida) confirmar() }}
                  title={`Se pidieron ${item.cantidad}. Cambiá el número si mandás menos.`}
                  className={`tabular w-14 rounded px-1.5 py-1 text-[11px] text-right font-semibold
                    focus:outline-none focus:ring-2 transition ${
                    !cantidadValida
                      ? 'border border-rose-400/60 bg-rose-500/10 text-rose-300 focus:ring-rose-400'
                      : entregaParcial
                        ? 'border border-amber-400/60 bg-amber-500/10 text-amber-200 focus:ring-amber-400'
                        : 'border border-white/15 bg-white/5 text-slate-100 focus:ring-emerald-400'
                  }`}
                />
              </label>
              <button
                onClick={confirmar}
                disabled={guardando}
                title={entregaParcial ? `Entrega parcial: ${cantidadNum} de ${item.cantidad}` : 'Hay stock de todo lo pedido'}
                className="text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded px-2 py-1 transition"
              >
                {entregaParcial ? `Enviar ${cantidadNum}` : 'Hay stock'}
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
            <span className="text-[11px] text-slate-400">Sin revisar</span>
          )}
        </div>
      </div>

      {item.nota && !esReemplazo && (
        <p className="text-[11px] text-slate-400 mt-0.5">{item.nota}</p>
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
      <p className="text-sm font-semibold text-emerald-300">✓ Aprobado internamente — listo para enviar al cliente</p>
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
  if (!eventos) return <p className="text-xs text-slate-400">Cargando historial...</p>
  if (!eventos.length) {
    return (
      <p className="text-xs text-slate-400">
        Sin movimientos registrados. El historial se completa con lo que pase de ahora en adelante.
      </p>
    )
  }

  return (
    <ol className="space-y-2 border-l-2 border-white/10 pl-3">
      {eventos.map(ev => (
        <li key={ev.id} className="text-xs relative">
          <span className="absolute -left-[19px] bg-white/5 text-[10px]">
            {ICONO_EVENTO[ev.evento] || '•'}
          </span>
          <p className="text-slate-200">{ev.detalle || ev.evento}</p>
          <p className="text-[11px] text-slate-400">
            {new Date(ev.fecha.replace(' ', 'T')).toLocaleString('es-AR')}
            {ev.usuarioNombre && ` · ${ev.usuarioNombre}`}
            {ev.estadoAnterior && ev.estadoNuevo && ` · ${ev.estadoAnterior} → ${ev.estadoNuevo}`}
          </p>
        </li>
      ))}
    </ol>
  )
}

/**
 * Cantidad de bultos del envío. La carga el depósito al terminar de preparar,
 * y va en el pedido entero — no por depósito — porque el bulto es lo que sale
 * en el camión hacia el cliente.
 */
function Bultos({ pedido, recargar }) {
  const [valor, setValor] = useState(pedido.bultos == null ? '' : String(pedido.bultos))
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  const original = pedido.bultos == null ? '' : String(pedido.bultos)
  const cambio = valor !== original

  const guardar = async () => {
    if (!cambio) return
    setGuardando(true)
    setError(null)
    try {
      await guardarBultos(pedido.id, valor === '' ? null : Number(valor))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
      recargar()
    } catch (e) {
      setError(e.message)
      setValor(original)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Bultos
        </span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={valor}
          placeholder="—"
          disabled={guardando}
          onChange={(e) => { setValor(e.target.value); setError(null) }}
          onBlur={guardar}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          title="En cuántos bultos se despacha este pedido"
          className="tabular w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1
                     text-sm text-right font-semibold text-slate-100
                     focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)] disabled:opacity-50 transition"
        />
      </label>
      {guardado && <span className="text-[11px] font-semibold text-emerald-400">Guardado</span>}
      {cambio && !guardado && !guardando && (
        <span className="text-[11px] text-slate-400">Enter para guardar</span>
      )}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  )
}

/**
 * Junta los subpedidos por depósito.
 *
 * Los subpedidos se siguen guardando por familia — la familia define el
 * descuento y eso no cambia. Pero el despacho es por depósito, y un depósito
 * agrupa varias familias: el general saca bulonería, mechas y electrodos del
 * mismo galpón. Por eso el depósito se arma acá al mostrar, y no en la base.
 */
function agruparPorDeposito(subpedidos) {
  const porNumero = new Map()

  for (const sub of subpedidos) {
    // Un subpedido sin depósito configurado no se pierde: cae en uno propio.
    const clave = sub.depositoNumero ?? `sin-deposito-${sub.familia}`
    if (!porNumero.has(clave)) {
      porNumero.set(clave, {
        clave,
        numero: sub.depositoNumero,
        nombre: sub.depositoNombre || 'Sin depósito asignado',
        responsableId: sub.responsableId,
        familias: [],
      })
    }
    porNumero.get(clave).familias.push(sub)
  }

  return [...porNumero.values()]
    .sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99))
    .map((dep) => ({
      ...dep,
      // El depósito está listo cuando todas sus familias lo están
      aprobado: dep.familias.every((f) => f.aprobado),
      pendientes: dep.familias.reduce((n, f) => n + (f.itemsPendientes ?? 0), 0),
    }))
}

function TarjetaPedido({ pedido, config, recargar, puedeAprobar, puedeEnviar, usuarioId }) {
  const [aprobando, setAprobando] = useState(null)
  const [errorFamilia, setErrorFamilia] = useState({})
  const [verHistorial, setVerHistorial] = useState(false)

  /**
   * Aprueba un depósito entero: marca de una todas las familias que despacha.
   * Si una falla se corta ahí, para no dejar el depósito medio aprobado sin
   * que nadie se entere.
   */
  const aprobar = async (dep) => {
    setAprobando(dep.clave)
    setErrorFamilia((e) => ({ ...e, [dep.clave]: null }))
    try {
      for (const sub of dep.familias) {
        if (!sub.aprobado) await aprobarFamilia(pedido.id, sub.familia)
      }
      recargar()
    } catch (e) {
      setErrorFamilia((prev) => ({ ...prev, [dep.clave]: e.message }))
      recargar()
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
          <p className="text-xs text-slate-400">
            {new Date(pedido.fechaCreacion).toLocaleString('es-AR')} · {money(pedido.total)}
            {' · '}Pago {etiquetaPago(config, pedido.condicionPago)}
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {puedeAprobar && pedido.estado !== 'confirmado' && (
            <Bultos pedido={pedido} recargar={recargar} />
          )}
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
        {agruparPorDeposito(pedido.subpedidos).map((dep) => {
          // El responsable revisa su depósito; el admin puede hacerlo por cualquiera.
          const esMiDeposito = !dep.responsableId || dep.responsableId === usuarioId
          const puedeRevisar = puedeAprobar && esMiDeposito
          // Cuando el depósito saca más de una familia conviene rotularlas,
          // así el que prepara sabe de qué estantería sale cada renglón.
          const variasFamilias = dep.familias.length > 1

          return (
            <div key={dep.clave} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2 gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {dep.nombre}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dep.familias.map((f) => etiquetaFamilia(config, f.familia)).join(' · ')}
                  </p>
                  {dep.pendientes > 0 && !dep.aprobado && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                      {dep.pendientes} producto{dep.pendientes === 1 ? '' : 's'} sin revisar
                    </p>
                  )}
                </div>

                {dep.aprobado ? (
                  <span className="shrink-0 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
                    ✓ Aprobado
                  </span>
                ) : puedeRevisar ? (
                  <button
                    onClick={() => aprobar(dep)}
                    disabled={aprobando === dep.clave || dep.pendientes > 0}
                    title={dep.pendientes > 0 ? 'Revisá el stock de cada producto primero' : ''}
                    className="shrink-0 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded px-3 py-1 transition"
                  >
                    {aprobando === dep.clave ? 'Aprobando...' : 'Aprobar depósito'}
                  </button>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
                    Esperando al depósito
                  </span>
                )}
              </div>

              {errorFamilia[dep.clave] && (
                <p className="text-[11px] text-rose-400 mb-1">{errorFamilia[dep.clave]}</p>
              )}

              {dep.familias.map((sub) => (
                <div key={sub.familia}>
                  {variasFamilias && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-2 mb-0.5">
                      {etiquetaFamilia(config, sub.familia)}
                    </p>
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
              ))}
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
  const [config, setConfig] = useState(null)
  const { state } = useLocation()
  const { user } = useAuth()
  const puedeAprobar = user?.permisos?.puedeAprobarFamilias ?? false
  const puedeEnviar = user?.permisos?.puedeEnviarCliente ?? false

  const cargar = () => {
    listarAprobaciones().then(data => { setPedidos(data); setCargando(false) }).catch(() => setCargando(false))
  }

  useEffect(cargar, [])
  useEffect(() => { obtenerConfiguraciones().then(setConfig).catch(() => {}) }, [])

  const pendientes = pedidos.filter(p => p.estado !== 'confirmado')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Aprobaciones en depósito</h2>
        <p className="text-sm text-slate-400 mt-0.5">Pedidos separados por depósito, pendientes de aprobar stock o de confirmar con el cliente</p>
      </div>

      {state?.creado && (
        <p className="text-sm text-sky-400 bg-sky-500/10 border border-blue-200 rounded-lg px-3 py-2">
          Pedido enviado a aprobación correctamente.
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white/5 border rounded-xl p-10 text-center">
          No hay pedidos pendientes de aprobación.
        </p>
      ) : (
        <div className="space-y-4">
          {pendientes.map(p => (
            <TarjetaPedido
              key={p.id}
              pedido={p}
              config={config}
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
