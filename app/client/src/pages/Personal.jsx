import { useEffect, useState } from 'react'
import { authHeaders } from '../context/AuthContext'

const SECCIONES = [
  { key: 'nuevo-pedido', label: 'Nuevo Pedido' },
  { key: 'aprobaciones', label: 'Aprobaciones' },
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'productos', label: 'Productos' },
  { key: 'integraciones', label: 'Integraciones' },
  { key: 'personal', label: 'Personal' },
]

const PRESETS = {
  Administrador: { secciones: SECCIONES.map(s => s.key), puedeAprobarFamilias: true, puedeEnviarCliente: true },
  Vendedor: { secciones: ['nuevo-pedido', 'aprobaciones', 'cotizaciones', 'clientes', 'productos'], puedeAprobarFamilias: false, puedeEnviarCliente: true },
  Deposito: { secciones: ['aprobaciones'], puedeAprobarFamilias: true, puedeEnviarCliente: false },
}

const VACIO = {
  nombre: '', usuario: '', password: '', rol: 'Vendedor',
  permisos: PRESETS.Vendedor,
}

async function req(url, options) {
  const token = localStorage.getItem('cb_token')
  const res = await fetch(url, { ...options, headers: { ...authHeaders(token), ...(options?.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)
  return data
}

export default function Personal() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    req('/api/personal').then(setLista).catch(e => setError(e.message)).finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const nuevo = () => { setForm(VACIO); setEditandoId(null); setMostrarForm(true); setError('') }
  const editar = (p) => {
    setForm({ nombre: p.nombre, usuario: p.usuario, password: '', rol: p.rol, permisos: p.permisos })
    setEditandoId(p.id); setMostrarForm(true); setError('')
  }

  const cambiarRol = (rol) => setForm(f => ({ ...f, rol, permisos: PRESETS[rol] || f.permisos }))

  const toggleSeccion = (key) => setForm(f => ({
    ...f,
    permisos: {
      ...f.permisos,
      secciones: f.permisos.secciones.includes(key)
        ? f.permisos.secciones.filter(s => s !== key)
        : [...f.permisos.secciones, key],
    },
  }))

  const toggleFlag = (flag) => setForm(f => ({ ...f, permisos: { ...f.permisos, [flag]: !f.permisos[flag] } }))

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editandoId) {
        const datos = { ...form }
        if (!datos.password) delete datos.password
        await req(`/api/personal/${editandoId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
        })
      } else {
        await req('/api/personal', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
      }
      setMostrarForm(false)
      cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta persona?')) return
    try { await req(`/api/personal/${id}`, { method: 'DELETE' }); cargar() } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Personal</h2>
          <p className="text-sm text-slate-400 mt-0.5">{lista.length} personas · roles y permisos por sección</p>
        </div>
        <button onClick={nuevo} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Nueva persona
        </button>
      </div>

      {error && !mostrarForm && <p className="text-sm text-rose-400 bg-rose-500/10 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white/5 rounded-xl shadow-sm border p-5 space-y-4">
          <p className="font-semibold text-slate-200 text-sm">{editandoId ? 'Editar persona' : 'Nueva persona'}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400">Nombre</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Usuario</label>
              <input value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} required
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">
                Contraseña {editandoId && <span className="text-slate-400">(dejar en blanco para no cambiarla)</span>}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!editandoId}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Rol</label>
              <select value={form.rol} onChange={e => cambiarRol(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--cb-500)]">
                <option value="Administrador">Administrador</option>
                <option value="Vendedor">Vendedor</option>
                <option value="Deposito">Depósito</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Secciones visibles</p>
            <div className="grid grid-cols-3 gap-2">
              {SECCIONES.map(s => (
                <label key={s.key} className="flex items-center gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={form.permisos.secciones.includes(s.key)} onChange={() => toggleSeccion(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={form.permisos.puedeAprobarFamilias} onChange={() => toggleFlag('puedeAprobarFamilias')} />
              Puede aprobar stock por depósito
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={form.permisos.puedeEnviarCliente} onChange={() => toggleFlag('puedeEnviarCliente')} />
              Puede enviar cotización al cliente
            </label>
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {editandoId ? 'Guardar cambios' : 'Crear persona'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="border hover:bg-white/5 text-slate-300 px-4 py-2 rounded-lg text-sm transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="bg-white/5 rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Nombre</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Usuario</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Rol</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Secciones</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lista.map(p => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-2.5 font-medium">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-400">{p.usuario}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold bg-sky-500/10 text-sky-400 border border-blue-200 rounded px-2 py-0.5">{p.rol}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{p.permisos.secciones.length} secciones</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => editar(p)} className="text-xs text-sky-400 hover:text-sky-300 font-medium mr-3">Editar</button>
                    <button onClick={() => eliminar(p.id)} className="text-xs text-red-400 hover:text-rose-400 font-medium">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
