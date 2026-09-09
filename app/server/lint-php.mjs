// Validador rápido de PHP sin intérprete: balance de llaves/paréntesis/comillas.
// No reemplaza a `php -l`, pero atrapa los errores de tipeo más comunes.
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function archivosPhp(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivosPhp(p) : p.endsWith('.php') ? [p] : []
  })
}

function revisar(ruta) {
  const src = readFileSync(ruta, 'utf8')
  const pila = []
  const errores = []
  const cierra = { ')': '(', ']': '[', '}': '{' }
  let i = 0, linea = 1

  while (i < src.length) {
    const c = src[i], d = src[i + 1]

    if (c === '\n') { linea++; i++; continue }

    // comentarios
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '#' && d !== '[') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') linea++; i++ }
      i += 2; continue
    }

    // strings
    if (c === '"' || c === "'") {
      const q = c, ini = linea
      i++
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++
        else if (src[i] === '\n') linea++
        i++
      }
      if (i >= src.length) errores.push(`String sin cerrar abierto en línea ${ini}`)
      i++; continue
    }

    if ('([{'.includes(c)) { pila.push({ c, linea }); i++; continue }
    if (')]}'.includes(c)) {
      const top = pila.pop()
      if (!top) errores.push(`Línea ${linea}: '${c}' de más`)
      else if (top.c !== cierra[c]) errores.push(`Línea ${linea}: '${c}' no cierra el '${top.c}' de la línea ${top.linea}`)
      i++; continue
    }
    i++
  }

  pila.forEach((p) => errores.push(`'${p.c}' abierto en línea ${p.linea} y nunca cerrado`))
  return errores
}

const base = process.argv[2] || '../api-php'
let fallas = 0
for (const f of archivosPhp(base)) {
  const errs = revisar(f)
  const rel = f.replace(/\\/g, '/').split('api-php/').pop()
  if (errs.length) { fallas++; console.log(`❌ ${rel}`); errs.forEach((e) => console.log(`   ${e}`)) }
  else console.log(`✅ ${rel}`)
}
console.log(fallas ? `\n${fallas} archivo(s) con problemas` : '\n✅ Balance correcto en todos los archivos')
