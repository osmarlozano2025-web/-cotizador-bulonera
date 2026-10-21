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

/** El precio de partida es siempre el de lista. */
export function precioBase(item) {
  return Number(item.precioLista) || Number(item.precioGranel) || Number(item.precio) || 0
}

/**
 * Si el renglón va por granel, por fracción o suelto.
 *
 * Espejo de modoPorCantidad() en api-php/lib/precios.php. No lo elige nadie:
 * sale de comparar lo pedido contra los bultos que tiene cargados el producto.
 */
export function modoPorCantidad(item, cantidad) {
  const granel = Number(item?.unidadGranel) || 0
  const fraccion = Number(item?.unidadFraccion) || 0
  const c = Number(cantidad ?? item?.cantidad) || 0

  if (granel > 0 && c >= granel) return 'granel'
  if (fraccion > 0 && c >= fraccion) return 'fraccion'
  return 'unidad'
}

/**
 * Redondea la cantidad al múltiplo del bulto con el que sale el renglón.
 *
 * Una vez que el pedido llega al mínimo de la fracción, de ahí en más se pide
 * de a fracciones enteras: con fracción de 15, pedir 25 es pedir 30. Lo mismo
 * con el granel. Por debajo del mínimo se sigue vendiendo suelto, sin tocar.
 *
 * Caso borde: completar la fracción puede cruzar el mínimo del granel — con
 * fracción 15 y granel 100, pedir 95 daría 105, que ya es granel pero no es un
 * granel entero. Ahí conviene el granel justo (100): es menos cantidad que 105
 * y encima entra al precio de granel.
 *
 * Espejo de cantidadEnMultiplos() en api-php/lib/precios.php.
 */
export function cantidadEnMultiplos(item, cantidad) {
  const c = Number(cantidad) || 0
  const modo = modoPorCantidad(item, c)
  if (modo === 'unidad') return c

  const porBulto = modo === 'granel'
    ? Number(item?.unidadGranel) || 0
    : Number(item?.unidadFraccion) || 0
  if (porBulto <= 0) return c

  let ajustada = Math.ceil(c / porBulto) * porBulto

  const granel = Number(item?.unidadGranel) || 0
  if (modo === 'fraccion' && granel > 0 && ajustada >= granel) {
    ajustada = Math.ceil(c / granel) * granel
  }

  return ajustada
}

/** Cuántos bultos enteros entran en lo pedido: 150 varillas de a 30 son 5. */
export function bultosDelRenglon(item, cantidad, modo) {
  const porBulto = modo === 'granel'
    ? Number(item?.unidadGranel) || 0
    : modo === 'fraccion' ? Number(item?.unidadFraccion) || 0 : 0
  return porBulto > 0 ? Math.floor((Number(cantidad ?? item?.cantidad) || 0) / porBulto) : 0
}

export const LABEL_MODO = { granel: 'Granel', fraccion: 'Fracción', unidad: 'Unidad' }

/**
 * Cómo se lee el renglón: "5 graneles de 30" o "2 fracciones de 400".
 * Es lo que hay que ver además de la cantidad pedida.
 */
export function textoModo(item, cantidad) {
  const modo = modoPorCantidad(item, cantidad)
  if (modo === 'unidad') return 'Por unidad'

  const bultos = bultosDelRenglon(item, cantidad, modo)
  const porBulto = modo === 'granel' ? Number(item.unidadGranel) : Number(item.unidadFraccion)
  const nombre = modo === 'granel'
    ? (bultos === 1 ? 'granel' : 'graneles')
    : (bultos === 1 ? 'fracción' : 'fracciones')

  return `${bultos} ${nombre} de ${porBulto}`
}

/**
 * Precio unitario final de un renglón.
 *
 * Arranca en el precio de lista. Nada descuenta solo por llegar a granel o a
 * fracción: el descuento del renglón lo carga a mano quien arma el pedido.
 */
export function precioUnitario(item, config, condicionPago, descCliente, ajuste, descuentoItem = 0) {
  const tope = config?.descuentos_familia?.[item.familia] ?? 0
  const pago = Number(config?.descuentos_pago?.[condicionPago]) || 0

  return encadenarAjustes(precioBase(item), [
    ajusteDentroDelTope(ajuste, tope),
    Number(descuentoItem) || 0,
    -Math.abs(Number(descCliente) || 0),
    pago,
  ])
}

/** Orden de respaldo, para el primer pintado antes de que llegue la configuración. */
export const ORDEN_FAMILIAS = { buloneria: 1, tolsen: 2, mechas: 3, electrodos: 4, escaleras: 5, cintas_metricas: 6, otros: 9 }

/** Agrupa los renglones por familia, en el orden que diga la configuración. */
export function agruparPorFamilia(items, config) {
  const orden = config?.orden_familias || ORDEN_FAMILIAS

  const grupos = items.reduce((acc, item, idx) => {
    const fam = orden[item.familia] ? item.familia : 'otros'
    ;(acc[fam] ||= []).push({ item, idx })
    return acc
  }, {})

  return Object.keys(grupos)
    .sort((a, b) => (orden[a] ?? 99) - (orden[b] ?? 99))
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
