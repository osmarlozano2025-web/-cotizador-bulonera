// Verifica que toda función llamada en api-php esté definida en el proyecto
// o sea nativa de PHP. Atrapa typos que php -l no vería hasta ejecutar.
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const NATIVAS = new Set([
  'array_column','array_filter','array_map','array_reduce','array_shift','array_values','array_key_exists',
  'bin2hex','count','date','define','empty','explode','file_get_contents','file_exists','filter_var',
  'floatval','func_get_args','get_class','implode','in_array','intval','is_array','is_string','is_numeric',
  'isset','json_decode','json_encode','ksort','max','microtime','min','number_format','password_hash',
  'password_verify','preg_match','preg_replace','preg_split','print_r','random_bytes','round','rtrim',
  'str_replace','str_repeat','strlen','strpos','strtolower','strtoupper','substr','trim','uksort','usort',
  'sprintf','printf','header','http_response_code','exit','die','var_dump','error_log','curl_init',
  'curl_setopt','curl_exec','curl_close','curl_error','curl_getinfo','base64_encode','base64_decode',
  'hash_hmac','strtr','str_pad','array_merge','array_slice','array_keys','sort','uniqid','time','mt_rand',
  'set_exception_handler','parse_url','getallheaders','apache_request_headers','function_exists','fn',
  'array_sum','str_contains','str_starts_with','ucfirst','mb_strtolower','mb_substr','iterator_to_array',
  'call_user_func','call_user_func_array','array_unique','array_search','array_fill','range','abs','ceil','floor',
  'getenv','putenv','hash_equals','strcasecmp','file','array_pad','curl_setopt_array','mb_strlen',
  'similar_text','levenshtein','array_splice','array_reverse','json_last_error','sprintf','vsprintf',
  'is_dir','glob','basename','dirname','is_null','is_bool','is_float','is_int','array_flip','str_ends_with',
  'array_combine','number_format','mb_strtoupper','ltrim','nl2br','htmlspecialchars','urlencode','rawurlencode',
  'var_export','sys_get_temp_dir','file_put_contents','unlink','preg_quote','array_diff','array_intersect',
])

/** Vacía strings y comentarios para no confundir SQL con llamadas a función. */
function limpiar(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '#' && d !== '[') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++ }
      i += 2; continue
    }
    // heredoc / nowdoc: <<<TXT ... TXT;
    if (c === '<' && src.startsWith('<<<', i)) {
      const m = /^<<<\s*(['"]?)([A-Za-z_]\w*)\1\r?\n/.exec(src.slice(i))
      if (m) {
        const fin = m[2]
        i += m[0].length
        const cierre = new RegExp(`^\\s*${fin}\\b`)
        while (i < src.length) {
          const finLinea = src.indexOf('\n', i)
          const linea = src.slice(i, finLinea === -1 ? src.length : finLinea)
          if (cierre.test(linea)) break
          out += '\n'
          if (finLinea === -1) { i = src.length; break }
          i = finLinea + 1
        }
        out += "''"
        continue
      }
    }

    if (c === '"' || c === "'") {
      const q = c
      i++
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++
        else if (src[i] === '\n') out += '\n'
        i++
      }
      i++; out += "''"; continue
    }
    out += c; i++
  }
  return out
}

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : p.endsWith('.php') ? [p] : []
  })
}

const base = process.argv[2] || '../api-php'
const files = archivos(base)

// 1) recolectar definiciones
const definidas = new Set()
for (const f of files) {
  const src = limpiar(readFileSync(f, 'utf8'))
  for (const m of src.matchAll(/^\s*function\s+([A-Za-z_]\w*)\s*\(/gm)) definidas.add(m[1])
}

// 2) buscar llamadas
let problemas = 0
for (const f of files) {
  const src = limpiar(readFileSync(f, 'utf8'))
  const rel = f.replace(/\\/g, '/').split('api-php/').pop()
  const faltantes = new Map()

  const lineas = src.split('\n')
  lineas.forEach((l, idx) => {
    if (/^\s*function\s/.test(l)) return

    for (const m of l.matchAll(/(?<![\$>:\w])([a-zA-Z_]\w{2,})\s*\(/g)) {
      const nombre = m[1]
      if (NATIVAS.has(nombre) || definidas.has(nombre)) continue
      // palabras clave del lenguaje y clases
      if (/^(if|for|foreach|while|switch|catch|return|echo|array|new|function|fn|match|list|unset|use|and|or|not|elseif|do|try|class|public|private|protected|static|throw|instanceof|clone|yield|require|require_once|include|include_once|print)$/i.test(nombre)) continue
      if (/^[A-Z]/.test(nombre)) continue // PDO, RuntimeException, Throwable...
      faltantes.set(nombre, idx + 1)
    }
  })

  if (faltantes.size) {
    problemas++
    console.log(`⚠️  ${rel}`)
    for (const [n, ln] of faltantes) console.log(`   línea ${ln}: ${n}() — no definida en el proyecto ni en la lista de nativas`)
  }
}

console.log(problemas ? `\n${problemas} archivo(s) a revisar` : '\n✅ Todas las funciones llamadas están definidas')
console.log(`\nFunciones del proyecto: ${[...definidas].sort().join(', ')}`)
