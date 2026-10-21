import { useState, useEffect } from 'react'

/**
 * Casillero de número que se carga escribiendo.
 *
 * Sin flechitas de subir y bajar, y la rueda del mouse no lo toca: pasaba que
 * al scrollear la pantalla se cambiaban solos los porcentajes de descuento del
 * renglón que estuviera bajo el cursor. Es un campo de texto con teclado
 * numérico, así que tampoco aparece el spinner del navegador.
 *
 * Arranca vacío cuando el valor es cero, para no tener que borrar un 0 antes
 * de escribir. Admite el signo: se teclea -25 o +25 directamente.
 *
 * Mientras se escribe manda el texto tal cual, porque un "-" suelto todavía no
 * es un número: si se devolviera el valor ya convertido, el signo recién
 * tecleado desaparecería de la pantalla antes de poder escribir el resto.
 *
 * `onCommit` avisa recién al salir del campo, con el número ya terminado. Sirve
 * para lo que no puede correr en cada tecla: redondear una cantidad al bulto
 * saltaría a 30 apenas se teclea el 2 de 25, sin dejar escribir el resto.
 */
export default function CampoNumero({
  value,
  onChange,
  onCommit,
  vacioEnCero = true,
  decimales = true,
  className = '',
  ...resto
}) {
  const desdeAfuera = (v) =>
    v === '' || v === null || v === undefined || (vacioEnCero && Number(v) === 0)
      ? ''
      : String(v)

  const [texto, setTexto] = useState(() => desdeAfuera(value))
  const [escribiendo, setEscribiendo] = useState(false)

  // Mientras el campo está en uso manda lo tecleado; si el valor cambió por
  // otro lado (se recargó el pedido, se recortó al tope), se vuelve a mostrar.
  useEffect(() => {
    if (!escribiendo) setTexto(desdeAfuera(value))
  }, [value, escribiendo])

  const permitido = decimales ? /^[+-]?\d*[.,]?\d*$/ : /^[+-]?\d*$/

  return (
    <input
      type="text"
      inputMode={decimales ? 'decimal' : 'numeric'}
      value={texto}
      onFocus={() => setEscribiendo(true)}
      onBlur={() => {
        setEscribiendo(false)
        setTexto(desdeAfuera(value))
        onCommit?.(Number(value) || 0)
      }}
      onChange={(e) => {
        const crudo = e.target.value.trim()
        if (crudo !== '' && !permitido.test(crudo)) return
        setTexto(crudo)
        // Un signo solo, o el campo vacío, todavía no son un número.
        const n = crudo === '' || crudo === '-' || crudo === '+'
          ? 0
          : parseFloat(crudo.replace(',', '.'))
        onChange(Number.isFinite(n) ? n : 0)
      }}
      className={className}
      {...resto}
    />
  )
}
