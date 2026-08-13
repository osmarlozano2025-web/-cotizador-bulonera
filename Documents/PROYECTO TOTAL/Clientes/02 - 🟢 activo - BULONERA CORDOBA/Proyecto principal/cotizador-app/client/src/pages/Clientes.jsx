import { useState, useEffect } from 'react'
import {
  listarClientes, crearCliente, actualizarCliente, eliminarCliente, obtenerTiposDescuento,
} from '../utils/clientesApi'
import { listarAprobaciones } from '../utils/aprobaciones'

const COLORES = {
  A: { badge: 'bg-gray-100 text-gray-700 border-gray-200'    },
  B: { badge: 'bg-blue-100 text-blue-700 border-blue-200'    },
  C: { badge: 'bg-green-100 text-green-700 border-green-200' },
  D: { badge: 'bg-purple-100 text-purple-700 border-purple-200' },
}

const VACIO = { nombre: '', razonSocial: '', cuit: '', telefono: '', email: '', localidad: '', provincia: '', tipoDescuento: 'A' }

function PedidosCliente({ clienteId, pedidos }) {
  const propios = pedidos.filter(p => p.clienteId === clienteId)
  if (propios.length === 0) return <p className="text-xs text-gray-400 py-2 italic">Sin pedidos todavía.</p>
  return (
    <div className="divide-y divide-gray-100">
      {propios.map(p => (
        <div key={p.id} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {new Date(p.fechaCreacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              <span className="ml-2 text-xs text-gray-400">
                {p.subpedidos.reduce((s, sub) => s + sub.items.length, 0)} ítem{p.subpedidos.length !== 1 ? 's' : ''}
              </span>
              <span className="ml-2 text-xs text-gray-400 capitalize">· {p.estado.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className="text-right ml-4 shrink-0">
            <p className="text-sm font-bold text-green-700">${p.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            {p.descuento > 0 && <p className="text-xs text-gray-400">{p.descuento}% dto.</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [tipos, setTipos]           = useState([])
  const [pedidos, setPedidos]       = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [filtroProv, setFiltroProv] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [expandido, setExpandido]   = useState(null)
  const [form, setForm]             = useState(VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState('')

  const recargar = () => {
    listarClientes().then(setClientes).catch(e => setError(e.message)).finally(() => setCargando(false))
  }

  useEffect(() => {
    recargar()
    obtenerTiposDescuento().then(setTipos).catch(() => {})
    listarAprobaciones().then(setPedidos).catch(() => {})
  }, [])

  const provincias = [...new Set(clientes.map(c => c.provincia).filter(Boolean))].sort()

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (!q || c.nombre.toLowerCase().includes(q) || (c.localidad || '').toLowerCase().includes(q))
      && (!filtroProv || c.provincia === filtroProv)
      && (!filtroTipo || c.tipoDescuento === filtroTipo)
  })

  const cambiarTipo = async (cliente, nuevoCodigo) => {
    const tipo = tipos.find(t => t.codigo === nuevoCodigo)
    if (!tipo) return
    try {
      await actualizarCliente(cliente.id, { tipoDescuento: nuevoCodigo, descuento: tipo.porcentaje })
      recargar()
    } catch (e) { setError(e.message) }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editandoId) await actualizarCliente(editandoId, form)
      else await crearCliente(form)
      setMostrarForm(false); setEditandoId(null); setForm(VACIO)
      recargar()
    } catch (e) { setError(e.message) }
  }

  const editar = (c) => { setForm({ ...VACIO, ...c }); setEditandoId(c.id); setMostrarForm(true); setExpandido(null) }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return
    try { await eliminarCliente(id); recargar() } catch (e) { setError(e.message) }
  }

  const campo = (key, label, props = {}) => (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-sm text-gray-400 mt-0.5">{clientes.length} empresas</p>
        </div>
        <button onClick={() => { setForm(VACIO); setEditandoId(null); setMostrarForm(true) }}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Nuevo cliente
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {/* Leyenda */}
      <div className="flex gap-2 flex-wrap">
        {tipos.map(t => (
          <div key={t.codigo} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${COLORES[t.codigo]?.badge}`}>
            Tipo {t.codigo} · {t.nombre} · {t.porcentaje}%
          </div>
        ))}
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <p className="font-semibold text-gray-700 text-sm">{editandoId ? 'Editar cliente' : 'Nuevo cliente'}</p>
          <div className="grid grid-cols-2 gap-3">
            {campo('nombre',     'Nombre comercial *', { required: true })}
            {campo('razonSocial','Razón Social')}
            {campo('cuit',       'CUIT', { placeholder: '30-12345678-9' })}
            {campo('telefono',   'Teléfono')}
            {campo('email',      'Email', { type: 'email' })}
            {campo('localidad',  'Localidad')}
            {campo('provincia',  'Provincia')}
            <div>
              <label className="text-xs font-medium text-gray-500">Tipo de descuento</label>
              <select value={form.tipoDescuento} onChange={e => setForm(f => ({ ...f, tipoDescuento: e.target.value }))}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {tipos.map(t => (
                  <option key={t.codigo} value={t.codigo}>
                    Tipo {t.codigo} — {t.nombre} ({t.porcentaje}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {editandoId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="border hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre o ciudad..."
          className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filtroProv} onChange={e => setFiltroProv(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las provincias</option>
          {provincias.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.codigo} value={t.codigo}>Tipo {t.codigo} — {t.nombre}</option>)}
        </select>
        {(busqueda || filtroProv || filtroTipo) && (
          <button onClick={() => { setBusqueda(''); setFiltroProv(''); setFiltroTipo('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">× Limpiar</button>
        )}
      </div>
      <p className="text-xs text-gray-400">{cargando ? 'Cargando...' : `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`}</p>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map(c => {
          const abierto = expandido === c.id
          return (
            <div key={c.id} className="bg-white rounded-xl border overflow-hidden shadow-sm">
              <div className="flex items-center px-4 py-3 gap-3">
                <button onClick={() => setExpandido(abierto ? null : c.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <span className="text-gray-300 text-sm">{abierto ? '▾' : '▸'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{c.razonSocial || '—'} · {c.localidad}{c.provincia ? `, ${c.provincia}` : ''}</p>
                  </div>
                </button>

                <select value={c.tipoDescuento} onChange={e => cambiarTipo(c, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className={`text-xs font-semibold border rounded-full px-2 py-1 focus:outline-none cursor-pointer ${COLORES[c.tipoDescuento]?.badge}`}>
                  {tipos.map(t => (
                    <option key={t.codigo} value={t.codigo}>Tipo {t.codigo} · {t.porcentaje}%</option>
                  ))}
                </select>

                <div className="flex gap-2 shrink-0">
                  <button onClick={() => editar(c)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                  <button onClick={() => eliminar(c.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Eliminar</button>
                </div>
              </div>

              {abierto && (
                <div className="border-t bg-gray-50 px-4 py-3 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Datos</p>
                    {c.cuit     && <p><span className="text-gray-400">CUIT:</span> {c.cuit}</p>}
                    {c.telefono && <p><span className="text-gray-400">Tel:</span> {c.telefono}</p>}
                    {c.email    && <p><span className="text-gray-400">Email:</span> <a href={`mailto:${c.email}`} className="text-blue-600">{c.email}</a></p>}
                    <p><span className="text-gray-400">Descuento:</span> <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${COLORES[c.tipoDescuento]?.badge}`}>
                      Tipo {c.tipoDescuento} · {c.descuento}%
                    </span></p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pedidos</p>
                    <PedidosCliente clienteId={c.id} pedidos={pedidos} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
