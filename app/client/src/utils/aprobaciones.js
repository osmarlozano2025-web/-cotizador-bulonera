/**
 * Nombres de familia para mostrar mientras la configuración no llegó.
 *
 * La lista de verdad vive en la base y viaja en /api/configuraciones; esto es
 * sólo el respaldo del primer pintado. Usar etiquetaFamilia() para leerla.
 */
export const FAMILIAS_LABEL = {
  buloneria: 'Bulonería',
  tolsen: 'Tolsen',
  mechas: 'Mechas',
  electrodos: 'Electrodos',
  escaleras: 'Escaleras',
  cintas_metricas: 'Cintas Métricas',
  otros: 'Otros',
}

/** Cómo se escribe una familia. Cae al nombre crudo antes que dejar un hueco. */
export const etiquetaFamilia = (config, clave) =>
  config?.etiquetas_familia?.[clave] || FAMILIAS_LABEL[clave] || clave

/**
 * El número del depósito que despacha esa familia.
 *
 * Sale de los depósitos configurados: son dos y cada uno agrupa varias
 * familias. Antes esto era un mapa fijo de familia a número, que mostraba
 * "depósito 5" para una familia que en realidad sale del galpón general.
 */
export const numeroDeDeposito = (config, familia) =>
  (config?.depositos || []).find(d => (d.familias || []).includes(familia))?.numero ?? null

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

/**
 * Baja el Excel de una familia del pedido para importar en Tango.
 *
 * Va con fetch y no con un link común porque la ruta pide la sesión en el
 * header; el archivo se arma en el servidor sobre la planilla que exportó Tango.
 */
export async function descargarExcelTango(id, familia) {
  const res = await fetch(`/api/aprobaciones/${id}/tango/${encodeURIComponent(familia)}`, { headers: authHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Error del servidor (${res.status})`)
  }

  const nombre = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
    || `tango_${id.slice(-8)}_${familia}.xlsx`
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Carga una familia del pedido directo en Tango por la API. Devuelve
 * { idTango, numero, detalle }; si Tango rechaza algo, el error trae el motivo.
 */
export const enviarATango = (id, familia) =>
  req(`/api/aprobaciones/${id}/tango/${encodeURIComponent(familia)}/enviar`, { method: 'POST' })

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

/** En cuántos bultos se despacha el pedido. `null` borra el dato. */
export const guardarBultos = (id, bultos) =>
  req(`/api/aprobaciones/${id}/bultos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bultos }),
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

/** Las tres de fábrica. Se usan mientras la configuración todavía no llegó. */
export const CONDICIONES_PAGO = [
  { valor: 'contado', label: 'Contado' },
  { valor: '30dias', label: '30 días' },
  { valor: '60dias', label: '60 días' },
]

export const LABEL_CONDICION_PAGO = Object.fromEntries(
  CONDICIONES_PAGO.map(c => [c.valor, c.label])
)

/**
 * Las condiciones de pago que hay hoy, incluidas las que cargó el usuario
 * desde Configuraciones. El orden es el que devuelve la configuración.
 */
export const condicionesDePago = (config) => {
  const valores = Object.keys(config?.descuentos_pago || {})
  if (!valores.length) return CONDICIONES_PAGO
  return valores.map(valor => ({ valor, label: etiquetaPago(config, valor) }))
}

/** Cómo se escribe una condición de pago. Cae al nombre crudo antes que romper. */
export const etiquetaPago = (config, valor) =>
  config?.etiquetas_pago?.[valor] || LABEL_CONDICION_PAGO[valor] || valor || 'Contado'

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
