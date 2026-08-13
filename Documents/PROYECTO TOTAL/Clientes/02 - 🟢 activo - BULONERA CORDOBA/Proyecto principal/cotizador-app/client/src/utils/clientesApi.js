async function req(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)
  return data
}

export const listarClientes = (q) => req(`/api/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`)

export const obtenerCliente = (id) => req(`/api/clientes/${id}`)

export const crearCliente = (datos) =>
  req('/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })

export const actualizarCliente = (id, datos) =>
  req(`/api/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })

export const eliminarCliente = (id) => req(`/api/clientes/${id}`, { method: 'DELETE' })

export const obtenerTiposDescuento = () => req('/api/clientes/tipos-descuento')
