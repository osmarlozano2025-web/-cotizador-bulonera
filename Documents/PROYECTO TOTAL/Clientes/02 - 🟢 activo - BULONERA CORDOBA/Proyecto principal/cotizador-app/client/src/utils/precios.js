/**
 * Espejo en el navegador de api-php/lib/precios.php.
 *
 * Sirve sólo para la vista previa mientras se arma el pedido. El precio que
 * vale es SIEMPRE el que calcula el backend al guardar; acá no se decide nada.
 *
 * Convención de signo del ajuste por familia:
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

/** Ajuste por familia, con el signo al revés: negativo descuenta. */
export function aplicarAjuste(precio, ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return precio
  const factor = 1 + a / 100
  return factor <= 0 ? 0 : precio * factor
}

export function ajusteValido(ajuste, rango = { min: -50, max: 50 }) {
  const v = Number(ajuste) || 0
  return Math.max(rango.min, Math.min(rango.max, v))
}

/**
 * Precio unitario final de un renglón.
 *
 * @param item          producto con precioLista / precioGranel y familia
 * @param config        respuesta de GET /api/configuraciones
 * @param condicionPago contado | 30dias | 60dias
 * @param descCliente   % del tipo de descuento del cliente
 * @param ajuste        ajuste de la familia en este pedido
 */
export function precioUnitario(item, config, condicionPago, descCliente, ajuste) {
  const lista = Number(item.precioLista) || Number(item.precioGranel) || Number(item.precio) || 0
  const granel = Number(item.precioGranel) || Number(item.precio) || lista
  const motor = config?.motor_descuentos

  if (!motor?.activo) {
    // Igual que el backend: precio de granel, descuento del cliente, y encima
    // el ajuste que cargó el vendedor.
    return aplicarAjuste(encadenarDescuentos(granel, [descCliente]), ajuste)
  }

  const familia = config?.descuentos_familia?.[item.familia] || { desc_1: 0, desc_2: 0 }
  const pago = config?.descuentos_pago?.[condicionPago] || { desc_1: 0, desc_2: 0 }
  const base = motor.base === 'granel' ? granel : lista

  return aplicarAjuste(
    encadenarDescuentos(base, [familia.desc_1, familia.desc_2, pago.desc_1, pago.desc_2, descCliente]),
    ajuste
  )
}

/** Precio de lista unitario, que es contra lo que se compara el ahorro. */
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

/** Texto para el usuario: "-15% dto." / "+30% aum." / "sin ajuste" */
export function textoAjuste(ajuste) {
  const a = Number(ajuste) || 0
  if (a === 0) return 'sin ajuste'
  return a < 0 ? `${a}% dto.` : `+${a}% aum.`
}
