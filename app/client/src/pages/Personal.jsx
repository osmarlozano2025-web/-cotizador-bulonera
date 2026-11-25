import { useEffect, useState } from 'react'
import { authHeaders, useAuth } from '../context/AuthContext'
import { SECCIONES as GRUPOS_DEL_MENU } from '../utils/secciones'
import { esSuperAdmin } from '../utils/roles'

// Las mismas secciones que el menú lateral, sin copiarlas a mano: esta lista
// era una copia y se había quedado sin 'configuraciones', así que a quien se
// le aplicaba un preset desde acá le desaparecía esa pantalla. Derivándola,
// una sección nueva en el menú aparece sola.
const SECCIONES = GRUPOS_DEL_MENU.flatMap(g => g.items.map(i => ({ key: i.key, label: i.label })))

/**
 * Cambiar de rol reescribe los permisos, así que el tilde de sólo lectura
 * arranca apagado en todos: es una decisión aparte del rol, que se marca a
 * mano sobre la persona.
 */
const PRESETS = {
  // Ve todo, igual que un Administrador. Lo que lo distingue no son las
  // secciones sino poder crear y tocar otros super admins (se controla en el backend).
  SuperAdmin: { secciones: SECCIONES.map(s => s.key), puedeAprobarFamilias: true, puedeEnviarCliente: true, soloLectura: false },
  Administrador: { secciones: SECCIONES.map(s => s.key), puedeAprobarFamilias: true, puedeEnviarCliente: true, soloLectura: false },
  Vendedor: { secciones: ['nuevo-pedido', 'aprobaciones', 'cotizaciones', 'clientes', 'productos'], puedeAprobarFamilias: false, puedeEnviarCliente: true, soloLectura: false },
  Deposito: { secciones: ['aprobaciones'], puedeAprobarFamilias: true, puedeEnviarCliente: false, soloLectura: false },
  // Con lo que arranca cualquiera que se registró solo: no ve nada hasta que se le asigna un rol de verdad.
  Pendiente: { secciones: [], puedeAprobarFamilias: false, puedeEnviarCliente: false, soloLectura: false },
}

// El valor guardado en la base es de una palabra; en pantalla se lee mejor así.
const ETIQUETA_ROL = { SuperAdmin: 'Super Admin', Deposito: 'Depósito' }
const etiquetaRol = (rol) => ETIQUETA_ROL[rol] || rol

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
  const { user } = useAuth()
  const soySuperAdmin = esSuperAdmin(user)
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
    setForm({ nombre: p.nombre, usuario: p.usuario || '', password: '', rol: p.rol, permisos: p.permisos })
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
        // Las cuentas que se registraron solas no tienen usuario (usan email):
        // no se manda vacío, así no pisa el valor NULL con '' en la base.
        if (!datos.usuario) delete datos.usuario
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
              <label className="text-xs font-medium text-slate-400">
                Usuario {editandoId && <span className="text-slate-500">(vacío si entra con su email)</span>}
              </label>
              <input value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} required={!editandoId}
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
                {/* Sólo un super admin puede repartir este rol. El backend lo vuelve
                    a chequear: esconder la opción es comodidad, no la protección. */}
                {soySuperAdmin && <option value="SuperAdmin">Super Admin</option>}
                <option value="Administrador">Administrador</option>
                <option value="Vendedor">Vendedor</option>
                <option value="Deposito">Depósito</option>
                <option value="Pendiente">Pendiente (sin asignar)</option>
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

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={form.permisos.puedeAprobarFamilias} onChange={() => toggleFlag('puedeAprobarFamilias')} />
              Puede aprobar stock por depósito
            </label>
          </div>

          {/* Va aparte de los otros dos: no suma un permiso, se los saca
              todos. El rol sigue diciendo qué pantallas ve; esto decide si
              además puede tocar algo. */}
          <label className="flex items-start gap-2.5 text-sm text-slate-200 border border-amber-400/30 bg-amber-500/5 rounded-xl px-3 py-2.5">
            <input
              type="checkbox"
              checked={!!form.permisos.soloLectura}
              onChange={() => toggleFlag('soloLectura')}
              className="mt-0.5"
            />
            <span>
              Sólo lectura
              <span className="block text-[11px] text-slate-400">
                Ve todas las secciones que tenga marcadas, pero no puede crear,
                editar ni eliminar nada en ninguna de ellas.
              </span>
            </span>
          </label>

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
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Usuario / Email</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Rol</th>
                <th className="text-left px-4 py-2 text-slate-400 text-xs font-semibold">Secciones</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lista.map(p => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-2.5 font-medium">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-400">{p.usuario || p.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold rounded px-2 py-0.5 border ${
                      p.rol === 'Pendiente'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : p.rol === 'SuperAdmin'
                          ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                          : 'bg-sky-500/10 text-sky-400 border-blue-200'
                    }`}>{etiquetaRol(p.rol)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{p.permisos.secciones.length} secciones</td>
                  <td className="px-4 py-2.5 text-right">
                    {p.rol === 'SuperAdmin' && !soySuperAdmin ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      <>
                        <button onClick={() => editar(p)} className="text-xs text-sky-400 hover:text-sky-300 font-medium mr-3">Editar</button>
                        <button onClick={() => eliminar(p.id)} className="text-xs text-red-400 hover:text-rose-400 font-medium">Eliminar</button>
                      </>
                    )}
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
