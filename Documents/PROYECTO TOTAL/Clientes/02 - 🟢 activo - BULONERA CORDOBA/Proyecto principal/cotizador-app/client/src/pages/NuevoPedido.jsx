import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectorCliente from '../components/SelectorCliente'
import SubidorFoto from '../components/SubidorFoto'
import BuscadorProducto from '../components/BuscadorProducto'
import TablaProductos from '../components/TablaProductos'
import { crearAprobacion } from '../utils/aprobaciones'

export default function NuevoPedido() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [items, setItems] = useState([])
  const [modo, setModo] = useState(null) // 'foto' | 'manual'
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const agregarProducto = (producto) => {
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

  const enviarAAprobacion = async () => {
    setEnviando(true)
    setErrorEnvio('')
    try {
      const aprobacion = await crearAprobacion({ items }, cliente)
      navigate('/aprobaciones', { state: { creado: aprobacion.id } })
    } catch (e) {
      setErrorEnvio(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Nuevo Pedido</h2>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {errorEnvio && <span className="text-xs text-red-600">{errorEnvio}</span>}
            <button
              onClick={() => navigate('/vista-previa', { state: { items, cliente } })}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              Vista Previa
            </button>
            <button
              onClick={enviarAAprobacion}
              disabled={enviando}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition text-sm"
            >
              {enviando ? 'Enviando...' : `Enviar a Aprobación (${items.length}) →`}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</p>
        <SelectorCliente value={cliente} onChange={setCliente} />
      </div>

      {!modo && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            ¿Cómo cargás el pedido?
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setModo('foto')}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition group"
            >
              <span className="text-3xl">📷</span>
              <span className="font-semibold text-gray-700 group-hover:text-amber-700 text-sm">Foto del pedido</span>
              <span className="text-xs text-gray-400">Solo en versión local</span>
            </button>
            <button
              onClick={() => setModo('manual')}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition group"
            >
              <span className="text-3xl">✏️</span>
              <span className="font-semibold text-gray-700 group-hover:text-blue-700 text-sm">Carga manual</span>
              <span className="text-xs text-gray-400">Buscás producto por producto</span>
            </button>
          </div>
        </div>
      )}

      {modo === 'foto' && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Foto del pedido</p>
            <button onClick={() => setModo(null)} className="text-xs text-gray-400 hover:text-gray-600">← Volver</button>
          </div>
          <SubidorFoto onAgregar={agregarProducto} />
        </div>
      )}

      {modo === 'manual' && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar productos</p>
            <button onClick={() => setModo(null)} className="text-xs text-gray-400 hover:text-gray-600">← Cambiar modo</button>
          </div>
          <BuscadorProducto onAgregar={agregarProducto} />
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos del pedido</p>
          <TablaProductos items={items} descuento={cliente?.descuento || 0} onChange={setItems} />
        </div>
      )}
    </div>
  )
}
