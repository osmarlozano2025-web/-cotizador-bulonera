/**
 * Espejo en el navegador de api-php/lib/precios.php.
 *
 * Sirve sólo para la vista previa mientras se arma el pedido. El precio que
 * vale es SIEMPRE el que calcula el backend al guardar; acá no se decide nada.
 *
 * Convención de signo:
 *     negativo descuenta   (-15 deja el precio en 85%)
 *     positivo aumenta     (+30 lo deja en 130%)
 */

/** Porcentajes en cascada, donde un número positivo descuenta. */
export function encadenarDescuentos(base, porcentajes) {
  return porcentajes.reduce((precio, pct) => {
    const p = Number(pct) || 0
    if (p <= 0) return precio
    if (p >= 100) return 0
    return precio * (1 - p / 100)
  }, base)
}

/** Ajuste con el signo del pedido: negativo descuenta. */
export function aplicarAjuste(precio, ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return precio
  const factor = 1 + a / 100
  return factor <= 0 ? 0 : precio * factor
}

/**
 * Recorta un ajuste entre 0 y el tope de la familia.
 * Tope -30 admite de -30 a 0. Tope +20 admite de 0 a +20. Tope 0 no admite nada.
 */
export function ajusteDentroDelTope(ajuste, tope) {
  const v = Number(ajuste) || 0
  const t = Number(tope) || 0
  return Math.max(Math.min(0, t), Math.min(Math.max(0, t), v))
}

/** Los dos extremos que admite un tope, para armar el input. */
export function limitesDelTope(tope) {
  const t = Number(tope) || 0
  return { min: Math.min(0, t), max: Math.max(0, t) }
}

/**
 * Precio unitario final de un renglón.
 *
 *   granel → ajuste de familia → descuento por pago → descuento del cliente
 */
export function precioUnitario(item, config, condicionPago, descCliente, ajuste) {
  const granel = Number(item.precioGranel) || Number(item.precio) || Number(item.precioLista) || 0
  const tope = config?.descuentos_familia?.[item.familia] ?? 0
  const pago = config?.descuentos_pago?.[condicionPago] || { desc_1: 0, desc_2: 0 }

  return encadenarDescuentos(
    aplicarAjuste(granel, ajusteDentroDelTope(ajuste, tope)),
    [pago.desc_1, pago.desc_2, descCliente]
  )
}

/** Precio de lista unitario, contra el que se compara el ahorro. */
export function precioLista(item) {
  return Number(item.precioLista) || Number(item.precioGranel) || Number(item.precio) || 0
}

export const ORDEN_FAMILIAS = { buloneria: 1, tolsen: 2, mechas: 3, electrodos: 4, otros: 9 }

/** Agrupa los renglones por familia, en el orden de los depósitos. */
export function agruparPorFamilia(items) {
  const grupos = items.reduce((acc, item, idx) => {
    const fam = ORDEN_FAMILIAS[item.familia] ? item.familia : 'otros'
    ;(acc[fam] ||= []).push({ item, idx })
    return acc
  }, {})

  return Object.keys(grupos)
    .sort((a, b) => ORDEN_FAMILIAS[a] - ORDEN_FAMILIAS[b])
    .map(familia => ({ familia, filas: grupos[familia] }))
}

/** Texto para el usuario: "15% dto." / "+30% aum." / "sin ajuste" */
export function textoAjuste(ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return 'sin ajuste'
  return a < 0 ? `${-a}% dto.` : `+${a}% aum.`
}

/** Cómo se le explica el tope al vendedor. */
export function textoTope(tope) {
  const t = Number(tope) || 0
  if (t === 0) return 'sin descuento permitido'
  return t < 0 ? `hasta ${-t}% de descuento` : `hasta ${t}% de aumento`
}
