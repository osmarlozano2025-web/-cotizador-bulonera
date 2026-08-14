import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SECCIONES } from '../utils/secciones'

export default function Sidebar() {
  const { user, logout, tieneSeccion } = useAuth()

  return (
    <aside className="w-60 shrink-0 bg-blue-950 text-blue-100 flex flex-col min-h-screen sticky top-0 h-screen">
      <div className="px-5 py-4 border-b border-blue-900">
        <h1 className="text-white font-bold tracking-wide text-lg">Córdoba Bulones</h1>
        <p className="text-xs text-blue-400">Panel interno</p>
      </div>

      <nav className="flex-1 py-4 space-y-6 overflow-y-auto">
        {SECCIONES.map(sec => {
          const items = sec.items.filter(item => tieneSeccion(item.key))
          if (items.length === 0) return null
          return (
            <div key={sec.titulo}>
              <p className="px-5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                {sec.titulo}
              </p>
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-5 py-2 text-sm transition ${
                        isActive
                          ? 'bg-blue-800 text-white font-medium border-r-2 border-amber-400'
                          : 'text-blue-200 hover:bg-blue-900 hover:text-white'
                      }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {user && (
        <div className="px-5 py-3 border-t border-blue-900 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.nombre}</p>
            <p className="text-[11px] text-blue-400">{user.rol}</p>
          </div>
          <button onClick={logout} className="text-[11px] text-blue-400 hover:text-white shrink-0">
            Salir
          </button>
        </div>
      )}
    </aside>
  )
}
