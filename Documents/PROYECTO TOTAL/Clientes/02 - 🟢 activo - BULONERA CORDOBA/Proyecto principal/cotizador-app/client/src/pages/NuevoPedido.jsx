import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectorCliente from '../components/SelectorCliente'
import SubidorFoto from '../components/SubidorFoto'
import BuscadorProducto from '../components/BuscadorProducto'
import TablaProductos from '../components/TablaProductos'
import { crearAprobacion, CONDICIONES_PAGO, obtenerConfiguraciones } from '../utils/aprobaciones'

export default function NuevoPedido() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [items, setItems] = useState([])
  const [modo, setModo] = useState(null) // 'foto' | 'manual'
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [condicionPago, setCondicionPago] = useState('contado')
  // Un pedido directo no le pide confirmación al cliente: ya la dio.
  const [pedidoDirecto, setPedidoDirecto] = useState(false)
  const [config, setConfig] = useState(null)
  // Descuento por familia de este pedido. Arranca en 0 y se puede mejorar
  // hasta el tope que tenga cada familia en Configuraciones.
  const [descuentosFamilia, setDescuentosFamilia] = useState({})

  useEffect(() => {
    obtenerConfiguraciones().then(setConfig).catch(() => {})
  }, [])

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
          tipoOrigen: pedidoDirecto ? 'directo' : 'cotizacion',
          descuentosFamilia,
        },
        cliente
      )
      navigate('/aprobaciones', { state: { creado: aprobacion.id } })
    } catch (e) {
      setErrorEnvio(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5">
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
          <SelectorCliente value={cliente} onChange={setCliente} />
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

        <div className="grid sm:grid-cols-2 gap-5 pt-4 border-t border-white/10">
          <div>
            <label className="etiqueta block mb-1.5">Condición de pago</label>
            <select
              value={condicionPago}
              onChange={e => setCondicionPago(e.target.value)}
              className="campo"
            >
              {CONDICIONES_PAGO.map(c => (
                <option key={c.valor} value={c.valor}>{c.label}</option>
              ))}
            </select>
          </div>

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
              : <BuscadorProducto onAgregar={agregarProducto} />}
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
              onDescuentoFamilia={cambiarDescuentoFamilia}
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
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 }
        return copia
      }
      return [...prev, { ...producto, cantidad: producto.cantidad || 1 }]
    })
  }
}
