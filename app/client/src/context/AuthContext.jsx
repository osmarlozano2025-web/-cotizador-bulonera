import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cb_token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cb_user') || 'null') } catch { return null }
  })
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!token) { setListo(true); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        // Sesión realmente inválida/expirada: cerramos sesión.
        if (r.status === 401) {
          setToken(null); setUser(null)
          localStorage.removeItem('cb_token'); localStorage.removeItem('cb_user')
          return null
        }
        // Cualquier otro error (red, servidor caído momentáneamente) no debe desloguear:
        // seguimos con el usuario que ya teníamos guardado en localStorage.
        if (!r.ok) return null
        return r.json()
      })
      .then(u => { if (u) { setUser(u); localStorage.setItem('cb_user', JSON.stringify(u)) } })
      .catch(() => { /* sin conexión: mantenemos la sesión guardada localmente */ })
      .finally(() => setListo(true))
  }, [])

  const login = async (usuario, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cb_token', data.token)
    localStorage.setItem('cb_user', JSON.stringify(data.user))
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('cb_token')
    localStorage.removeItem('cb_user')
  }

  const tieneSeccion = (seccion) => user?.permisos?.secciones?.includes(seccion) ?? false

  return (
    <AuthContext.Provider value={{ token, user, listo, login, logout, tieneSeccion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
