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
    <aside className="w-64 shrink-0 min-h-screen sticky top-0 h-screen p-3">
      <div className="vidrio rounded-2xl h-full flex flex-col overflow-hidden">
        <div className="px-4 py-5 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
            style={{
              background: 'linear-gradient(140deg, var(--cb-500), var(--cb-700))',
              boxShadow: '0 6px 18px -6px rgba(61,139,253,.8)',
            }}
          >
            CB
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold leading-tight text-[15px]">Córdoba Bulones</h1>
            <p className="text-[11px] text-slate-400">Ferretería Industrial</p>
          </div>
        </div>

        <nav className="flex-1 px-2 pb-4 space-y-5 overflow-y-auto">
          {SECCIONES.map(sec => {
            const items = sec.items.filter(item => tieneSeccion(item.key))
            if (items.length === 0) return null
            return (
              <div key={sec.titulo}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                            ? 'text-white'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5/5'
                        }`
                      }
                      style={({ isActive }) =>
                        isActive
                          ? {
                              background: 'rgba(61,139,253,.16)',
                              boxShadow: 'inset 0 0 0 1px rgba(61,139,253,.28)',
                            }
                          : undefined
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`w-1 h-5 rounded-full transition ${
                              isActive ? 'bg-[var(--cb-500)]' : 'bg-transparent'
                            }`}
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
          <div className="p-2">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5/5 border border-white/5">
              <div className="w-9 h-9 rounded-full bg-white/5/10 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {iniciales(user.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{user.nombre}</p>
                <p className="text-[11px] text-slate-400">{user.rol}</p>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="text-slate-400 hover:text-rose-400 transition shrink-0 text-lg leading-none"
              >
                ⏻
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
