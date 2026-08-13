export async function buscarProductos(q, familia) {
  const params = new URLSearchParams({ q })
  if (familia) params.set('familia', familia)
  const res = await fetch(`/api/productos/buscar?${params.toString()}`)
  if (!res.ok) throw new Error('No se pudo buscar en el catálogo')
  return res.json()
}

export async function obtenerFamilias() {
  const res = await fetch('/api/productos/familias')
  if (!res.ok) throw new Error('No se pudieron obtener las familias')
  return res.json()
}
