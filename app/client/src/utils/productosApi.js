/**
 * Catálogo de productos.
 *
 * El backend pide sesión: la lista de precios es información del negocio y
 * antes se servía a cualquiera que supiera la dirección.
 */
function authHeaders() {
  const token = localStorage.getItem('cb_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function buscarProductos(q, familia) {
  const params = new URLSearchParams({ q })
  if (familia) params.set('familia', familia)
  const res = await fetch(`/api/productos/buscar?${params.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo buscar en el catálogo')
  return res.json()
}

export async function obtenerFamilias() {
  const res = await fetch('/api/productos/familias', { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron obtener las familias')
  return res.json()
}
