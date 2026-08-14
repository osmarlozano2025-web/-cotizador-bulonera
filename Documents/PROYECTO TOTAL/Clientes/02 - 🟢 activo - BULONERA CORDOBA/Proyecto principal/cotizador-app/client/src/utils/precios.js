/**
 * Espejo en el navegador de api-php/lib/precios.php.
 *
 * Sirve sólo para la vista previa mientras se arma el pedido. El precio que
 * vale es SIEMPRE el que calcula el backend al guardar; acá no se decide nada.
 *
 * Convención de signo:
 *     negativo descuenta   (-15 deja el precio en 85%)
 *     positivo aumenta     (+30 lo deja en 130%)
 *
 * La cadena:
 *     precio del producto → descuento de familia → descuento del cliente → condición de pago
 */

/** Un porcentaje con signo. */
export function aplicarAjuste(precio, ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return precio
  const factor = 1 + a / 100
  return factor <= 0 ? 0 : precio * factor
}

/** Varios porcentajes con signo, uno detrás del otro. */
export function encadenarAjustes(base, ajustes) {
  return ajustes.reduce((precio, a) => aplicarAjuste(precio, a), base)
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

/** Precio del producto, antes de cualquier descuento. */
export function precioBase(item) {
  return Number(item.precioGranel) || Number(item.precio) || Number(item.precioLista) || 0
}

/** Precio unitario final de un renglón. */
export function precioUnitario(item, config, condicionPago, descCliente, ajuste) {
  const tope = config?.descuentos_familia?.[item.familia] ?? 0
  const pago = Number(config?.descuentos_pago?.[condicionPago]) || 0

  return encadenarAjustes(precioBase(item), [
    ajusteDentroDelTope(ajuste, tope),
    -Math.abs(Number(descCliente) || 0),
    pago,
  ])
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

/** "15% dto." / "+30% aum." / "sin ajuste" */
export function textoAjuste(ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return 'sin ajuste'
  return a < 0 ? `${-a}% dto.` : `+${a}% aum.`
}

/** Cómo se le explica el tope al vendedor. */
export function textoTope(tope) {
  const t = Number(tope) || 0
  if (t === 0) return 'sin descuento'
  return t < 0 ? `hasta ${-t}%` : `hasta +${t}%`
}
