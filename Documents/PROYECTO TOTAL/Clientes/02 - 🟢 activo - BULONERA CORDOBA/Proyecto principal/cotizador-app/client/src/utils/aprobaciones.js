export const FAMILIAS_LABEL = {
  buloneria: 'Bulonería',
  tolsen: 'Tolsen',
  mechas: 'Mechas',
  electrodos: 'Electrodos',
  otros: 'Otros',
}

/** Cada familia va a su propio depósito. El orden define el número de depósito. */
export const FAMILIAS = ['buloneria', 'tolsen', 'mechas', 'electrodos']

export const DEPOSITO_NUMERO = {
  buloneria: 1,
  tolsen: 2,
  mechas: 3,
  electrodos: 4,
}

function authHeaders() {
  const token = localStorage.getItem('cb_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req(url, options) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options?.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)
  return data
}

export const crearAprobacion = (pedido, cliente) =>
  req('/api/aprobaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido, cliente }),
  })

export const listarAprobaciones = (estado) =>
  req(`/api/aprobaciones${estado ? `?estado=${estado}` : ''}`)

export const obtenerAprobacion = (id) => req(`/api/aprobaciones/${id}`)

export const aprobarFamilia = (id, familia) =>
  req(`/api/aprobaciones/${id}/aprobar-familia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familia }),
  })

/** El depósito confirma que hay stock (opcionalmente una cantidad menor). */
export const confirmarItem = (id, itemId, { cantidad, nota } = {}) =>
  req(`/api/aprobaciones/${id}/items/${itemId}/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidad, nota }),
  })

/**
 * El depósito marca que no hay stock. El item queda tachado.
 * Si se pasa `reemplazo`, ese producto se agrega como item nuevo enlazado al original.
 */
export const marcarSinStock = (id, itemId, { nota, reemplazo } = {}) =>
  req(`/api/aprobaciones/${id}/items/${itemId}/sin-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nota, reemplazo }),
  })

export const obtenerConfiguraciones = () => req('/api/configuraciones')

/** Historial de todo lo que le pasó a un pedido: quién, cuándo y qué. */
export const obtenerLog = (id) => req(`/api/aprobaciones/${id}/log`)

export const CONDICIONES_PAGO = [
  { valor: 'contado', label: 'Contado' },
  { valor: '30dias', label: '30 días' },
  { valor: '60dias', label: '60 días' },
]

export const LABEL_CONDICION_PAGO = Object.fromEntries(
  CONDICIONES_PAGO.map(c => [c.valor, c.label])
)

/** Sólo lo que realmente se entrega: lo marcado sin stock no cuenta. */
export const itemsEntregables = (pedido) =>
  (pedido?.subpedidos || []).flatMap(s => s.items).filter(i => i.estado !== 'sin_stock')

/** Cantidad que se va a entregar, que puede ser menor a la pedida. */
export const cantidadAEntregar = (item) =>
  item.cantidadConfirmada ?? item.cantidad

/** Precio unitario final del renglón, con todos los descuentos ya aplicados. */
export const precioFinal = (item) =>
  item.precioNeto || item.precioGranel || item.precio || 0

export const marcarEnviado = (id) =>
  req(`/api/aprobaciones/${id}/marcar-enviado`, { method: 'POST' })

export const obtenerConfirmacion = (token) => req(`/api/aprobaciones/confirmar/${token}`)

export const confirmarPedido = (token) =>
  req(`/api/aprobaciones/confirmar/${token}`, { method: 'POST' })

export function linkConfirmacion(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}confirmar/${token}`
}

function mensajePedido(pedido) {
  const link = linkConfirmacion(pedido.token)
  return `Hola ${pedido.clienteNombre}! Te paso la cotización de Córdoba Bulones para que la confirmes: ${link}\n\nTotal: $${pedido.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function numeroWhatsApp(telefono) {
  const digitos = (telefono || '').replace(/[^\d]/g, '')
  if (!digitos) return ''
  return digitos.startsWith('54') ? digitos : `549${digitos}`
}

export function linkWhatsApp(pedido) {
  const telefono = numeroWhatsApp(pedido.clienteTelefono)
  const texto = encodeURIComponent(mensajePedido(pedido))
  return telefono ? `https://wa.me/${telefono}?text=${texto}` : `https://wa.me/?text=${texto}`
}

export function linkGmail(pedido) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: pedido.clienteEmail || '',
    su: `Cotización Córdoba Bulones — ${pedido.clienteNombre}`,
    body: mensajePedido(pedido),
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function linkOutlook(pedido) {
  const params = new URLSearchParams({
    to: pedido.clienteEmail || '',
    subject: `Cotización Córdoba Bulones — ${pedido.clienteNombre}`,
    body: mensajePedido(pedido),
  })
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`
}

export function linkMailto(pedido) {
  const params = new URLSearchParams({
    subject: `Cotización Córdoba Bulones — ${pedido.clienteNombre}`,
    body: mensajePedido(pedido),
  })
  return `mailto:${pedido.clienteEmail || ''}?${params.toString()}`
}
