import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectorCliente from '../components/SelectorCliente'
import SubidorFoto from '../components/SubidorFoto'
import BuscadorProducto from '../components/BuscadorProducto'
import TablaProductos from '../components/TablaProductos'
import { crearAprobacion, condicionesDePago, obtenerConfiguraciones } from '../utils/aprobaciones'
import { useAuth, authHeaders } from '../context/AuthContext'

const BORRADOR_KEY = 'cb_pedido_borrador'

/**
 * El pedido en progreso vivía sólo en memoria: si la pestaña se recargaba por
 * lo que sea (el servidor de desarrollo se reinicia, se cierra sin querer, se
 * corta la conexión), un pedido de cuarenta renglones se perdía entero y
 * había que rehacerlo de cero. Se guarda acá a medida que se carga, y se lee
 * de vuelta al entrar a la pantalla.
 */
function leerBorrador() {
  try {
    const guardado = JSON.parse(localStorage.getItem(BORRADOR_KEY) || 'null')
    return guardado && typeof guardado === 'object' ? guardado : null
  } catch {
    return null
  }
}

export default function NuevoPedido() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  // Un cliente logueado hace su propio pedido: no elige a quién factura,
  // siempre es a sí mismo. Ver requireAuth()/rol 'Cliente' en el backend,
  // que además ignora cualquier otro cliente que llegue en el pedido.
  const esCliente = user?.rol === 'Cliente'
  const borrador = useRef(leerBorrador()).current
  const [cliente, setCliente] = useState(() => borrador?.cliente ?? null)
  const [items, setItems] = useState(() => borrador?.items ?? [])
  const [modo, setModo] = useState(() => borrador?.modo ?? null) // 'foto' | 'manual'
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [condicionPago, setCondicionPago] = useState(() => borrador?.condicionPago ?? 'contado')
  // Un pedido directo no le pide confirmación al cliente: ya la dio.
  const [pedidoDirecto, setPedidoDirecto] = useState(() => borrador?.pedidoDirecto ?? false)
  const [config, setConfig] = useState(null)
  // Descuento por familia de este pedido. Arranca en 0 y se puede mejorar
  // hasta el tope que tenga cada familia en Configuraciones.
  const [descuentosFamilia, setDescuentosFamilia] = useState(() => borrador?.descuentosFamilia ?? {})
  const [avisoBorrador, setAvisoBorrador] = useState(() => (borrador?.items?.length > 0))

  useEffect(() => {
    obtenerConfiguraciones().then(setConfig).catch(() => {})
  }, [])

  // El cliente logueado siempre es su propia ficha: se trae fija, no se elige.
  useEffect(() => {
    if (!esCliente || !user?.clienteId) return
    fetch(`/api/clientes/${user.clienteId}`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(setCliente)
      .catch(() => {})
  }, [esCliente, user?.clienteId, token])

  // Se guarda en cada cambio. Con el pedido vacío no hay nada que recuperar,
  // así que se limpia en vez de dejar un borrador fantasma.
  useEffect(() => {
    if (!cliente && items.length === 0) {
      localStorage.removeItem(BORRADOR_KEY)
      return
    }
    try {
      localStorage.setItem(BORRADOR_KEY, JSON.stringify({
        cliente, items, modo, condicionPago, pedidoDirecto, descuentosFamilia,
      }))
    } catch {
      // localStorage lleno o bloqueado: no hay forma de persistir, se sigue
      // igual con el pedido en memoria nada más.
    }
  }, [cliente, items, modo, condicionPago, pedidoDirecto, descuentosFamilia])

  const descartarBorrador = () => {
    localStorage.removeItem(BORRADOR_KEY)
    setCliente(null)
    setItems([])
    setModo(null)
    setCondicionPago('contado')
    setPedidoDirecto(false)
    setDescuentosFamilia({})
    setAvisoBorrador(false)
  }

  const cambiarDescuentoFamilia = (familia, valor) =>
    setDescuentosFamilia(prev => ({ ...prev, [familia]: valor }))

  // Sin cliente no se puede mandar: los descuentos y la proforma dependen de él.
  const faltaCliente = !cliente?.id
  const puedeEnviar = items.length > 0 && !faltaCliente && !enviando

  const enviarAAprobacion = async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    setErrorEnvio('')
    try {
      const aprobacion = await crearAprobacion(
        {
          items,
          condicionPago,
          // Un cliente ya confirmó al enviarlo él mismo: no hace falta
          // mandarle un link aparte para que confirme lo que acaba de mandar.
          tipoOrigen: (esCliente || pedidoDirecto) ? 'directo' : 'cotizacion',
          descuentosFamilia,
        },
        cliente
      )
      localStorage.removeItem(BORRADOR_KEY)
      navigate('/aprobaciones', { state: { creado: aprobacion.id } })
    } catch (e) {
      setErrorEnvio(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5">
      {avisoBorrador && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-2.5 text-sm">
          <span className="text-sky-300">
            Recuperamos un pedido que habías empezado a cargar, con {items.length} producto{items.length === 1 ? '' : 's'}.
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setAvisoBorrador(false)} className="text-sky-300 hover:text-sky-200 font-medium transition">
              Seguir con este
            </button>
            <button onClick={descartarBorrador} className="text-slate-400 hover:text-rose-400 transition">
              Empezar de cero
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Nuevo pedido</h2>
          <p className="text-sm text-slate-400">
            Se divide solo por familia, un depósito por cada una.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/vista-previa', { state: { items, cliente } })}
              className="btn-suave"
            >
              Vista previa
            </button>
            <button
              onClick={enviarAAprobacion}
              disabled={!puedeEnviar}
              title={faltaCliente ? 'Elegí un cliente primero' : ''}
              className="btn-primario"
            >
              {enviando ? 'Enviando…' : `Enviar a aprobación (${items.length})`}
            </button>
          </div>
        )}
      </div>

      {errorEnvio && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-300">
          {errorEnvio}
        </div>
      )}

      <div className="tarjeta p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="etiqueta">Cliente</span>
            {faltaCliente && (
              <span className="chip bg-amber-500/20 text-amber-300">Obligatorio</span>
            )}
          </div>
          {esCliente ? (
            <div className="campo bg-white/5 cursor-default">
              {cliente ? (cliente.razonSocial || cliente.nombre) : 'Cargando...'}
            </div>
          ) : (
            <SelectorCliente value={cliente} onChange={setCliente} />
          )}
          {faltaCliente ? (
            <p className="text-xs text-amber-400 mt-1.5">
              Elegí un cliente para poder enviar el pedido a aprobación.
            </p>
          ) : (
            cliente.descuento > 0 && (
              <p className="text-xs text-emerald-300 mt-1.5">
                Descuento del cliente: {cliente.descuento}%
              </p>
            )
          )}
        </div>

        <div className={`grid gap-5 pt-4 border-t border-white/10 ${esCliente ? '' : 'sm:grid-cols-2'}`}>
          <div>
            <label className="etiqueta block mb-1.5">Condición de pago</label>
            <select
              value={condicionPago}
              onChange={e => setCondicionPago(e.target.value)}
              className="campo"
            >
              {condicionesDePago(config).map(c => (
                <option key={c.valor} value={c.valor}>{c.label}</option>
              ))}
            </select>
          </div>

          {!esCliente && (
            <div>
              <label className="etiqueta block mb-1.5">Tipo de pedido</label>
              <label className="flex items-start gap-2.5 cursor-pointer border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5 transition">
                <input
                  type="checkbox"
                  checked={pedidoDirecto}
                  onChange={e => setPedidoDirecto(e.target.checked)}
                  className="mt-0.5 accent-[var(--cb-600)]"
                />
                <span className="text-sm text-slate-200">
                  Pedido directo
                  <span className="block text-[11px] text-slate-400">
                    El cliente ya lo confirmó: no se le manda link.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {!modo && (
        <div className="tarjeta p-6">
          <p className="etiqueta text-center mb-4">¿Cómo cargás el pedido?</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setModo('foto')}
              className="flex flex-col items-center gap-2 p-7 border-2 border-dashed border-white/10 rounded-2xl hover:border-amber-400 hover:bg-amber-500/10/50 transition group"
            >
              <span className="text-3xl">📷</span>
              <span className="font-semibold text-slate-200 group-hover:text-amber-400 text-sm">
                Foto del pedido
              </span>
              <span className="text-xs text-slate-400">Lo lee la IA</span>
            </button>
            <button
              onClick={() => setModo('manual')}
              className="flex flex-col items-center gap-2 p-7 border-2 border-dashed border-white/10 rounded-2xl hover:border-[var(--cb-500)] hover:bg-sky-500/10/50 transition group"
            >
              <span className="text-3xl">✏️</span>
              <span className="font-semibold text-slate-200 group-hover:text-[var(--cb-700)] text-sm">
                Carga manual
              </span>
              <span className="text-xs text-slate-400">Buscás producto por producto</span>
            </button>
          </div>
        </div>
      )}

      {modo && (
        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <span className="etiqueta">
              {modo === 'foto' ? 'Foto del pedido' : 'Agregar productos'}
            </span>
            <button
              onClick={() => setModo(null)}
              className="text-xs text-slate-400 hover:text-slate-300 transition"
            >
              ← Cambiar modo
            </button>
          </div>
          <div className="p-5">
            {modo === 'foto'
              ? <SubidorFoto onAgregar={agregarProducto} />
              : <BuscadorProducto onAgregar={agregarProducto} config={config} />}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <span className="etiqueta">Productos del pedido</span>
            <span className="text-xs text-slate-400">{items.length} renglones</span>
          </div>
          <div className="p-5">
            <TablaProductos
              items={items}
              descuento={cliente?.descuento || 0}
              onChange={setItems}
              config={config}
              condicionPago={condicionPago}
              descuentosFamilia={descuentosFamilia}
              onDescuentoFamilia={esCliente ? undefined : cambiarDescuentoFamilia}
              bloquearDescuentos={esCliente}
            />
          </div>
        </div>
      )}
    </div>
  )

  function agregarProducto(producto) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.codigo === producto.codigo && i.familia === producto.familia)
      if (idx >= 0) {
        const copia = [...prev]
        // Si el producto ya estaba, se suma lo pedido (una foto trae cantidades; el buscador, de a uno).
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + (producto.cantidad || 1) }
        return copia
      }
      return [...prev, { ...producto, cantidad: producto.cantidad || 1 }]
    })
  }
}
