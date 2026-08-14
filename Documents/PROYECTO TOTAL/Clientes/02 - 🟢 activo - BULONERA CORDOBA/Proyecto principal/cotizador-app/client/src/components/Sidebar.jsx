import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SECCIONES } from '../utils/secciones'

/** Iniciales para el avatar, sin depender de imágenes. */
function iniciales(nombre = '') {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

export default function Sidebar() {
  const { user, logout, tieneSeccion } = useAuth()

  return (
    <aside
      className="w-64 shrink-0 flex flex-col min-h-screen sticky top-0 h-screen text-slate-300"
      style={{ backgroundColor: 'var(--cb-900)' }}
    >
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-lg"
          style={{ backgroundColor: 'var(--cb-600)' }}
        >
          CB
        </div>
        <div className="min-w-0">
          <h1 className="text-white font-semibold leading-tight">Córdoba Bulones</h1>
          <p className="text-[11px] text-slate-500">Ferretería Industrial</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-5 overflow-y-auto">
        {SECCIONES.map(sec => {
          const items = sec.items.filter(item => tieneSeccion(item.key))
          if (items.length === 0) return null
          return (
            <div key={sec.titulo}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {sec.titulo}
              </p>
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `nav-item ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`w-1 h-5 rounded-full transition ${isActive ? 'bg-amber-400' : 'bg-transparent'}`}
                        />
                        <span className="text-base leading-none">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {user && (
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {iniciales(user.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.nombre}</p>
              <p className="text-[11px] text-slate-500">{user.rol}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-white transition shrink-0 text-lg leading-none"
            >
              ⏻
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
