/**
 * Sube un paquete de dist/public_html a Hostinger por FTP.
 *
 *   FTP_PASSWORD='...' node server/deploy-hostinger.mjs ../../V004/dist/public_html
 *   FTP_PASSWORD='...' node server/deploy-hostinger.mjs ../../V004/dist/public_html --dry
 *
 * La contraseña NUNCA va en el archivo: se lee de la variable de entorno. Los
 * scripts viejos (deploy.sh, deploy_ftp.sh, DEPLOY.bat) la tenían en texto
 * plano y por eso están excluidos del control de versiones.
 *
 * Dos cosas que aquellos scripts hacían mal:
 *   - usaban el dominio "nazarenoloza.de", que no existe (falta el "no")
 *   - hacían `cd public_html`, pero la cuenta FTP ya cae ahí dentro, así que
 *     habrían creado public_html/public_html/
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'

const HOST = process.env.FTP_HOST || 'ftp.bulonera.nazarenolozano.de'
const USUARIO = process.env.FTP_USER || 'u519024156.BuloneraCordoba'
const PASSWORD = process.env.FTP_PASSWORD

// El .env de producción tiene las credenciales buenas del servidor: no se pisa.
const NO_SUBIR = new Set(['.env', '.env.hostinger', '.DS_Store', 'Thumbs.db'])

const origen = process.argv[2]
const simulacro = process.argv.includes('--dry')

if (!origen) {
  console.error('Uso: FTP_PASSWORD=... node server/deploy-hostinger.mjs <carpeta> [--dry]')
  process.exit(1)
}
if (!PASSWORD && !simulacro) {
  console.error('Falta la variable de entorno FTP_PASSWORD')
  process.exit(1)
}

/** Lista recursiva de archivos, con su ruta relativa al origen. */
function listar(dir, base = dir) {
  return readdirSync(dir).flatMap(nombre => {
    if (NO_SUBIR.has(nombre)) return []
    const completo = path.join(dir, nombre)
    return statSync(completo).isDirectory()
      ? listar(completo, base)
      : [{ local: completo, remoto: path.relative(base, completo).split(path.sep).join('/') }]
  })
}

const archivos = listar(path.resolve(origen))
console.log(`\n${archivos.length} archivos desde ${origen}`)
console.log(`Destino: ftp://${HOST}/  (la cuenta ya cae en public_html)\n`)

if (simulacro) {
  for (const a of archivos) console.log(`  [simulacro] ${a.remoto}`)
  console.log('\nSimulacro: no se subió nada.\n')
  process.exit(0)
}

let subidos = 0
const fallados = []

for (const a of archivos) {
  // El contenido va por stdin en vez de pasarle la ruta a curl: la carpeta del
  // proyecto tiene un emoji en el nombre y curl no puede abrir esas rutas.
  // --ftp-create-dirs crea api-php/lib, api-php/db, etc. si no existen.
  const r = spawnSync('curl', [
    '--silent', '--show-error', '--ftp-create-dirs',
    '--connect-timeout', '20', '--max-time', '180',
    '--user', `${USUARIO}:${PASSWORD}`,
    '--upload-file', '-',
    `ftp://${HOST}/${a.remoto}`,
  ], { input: readFileSync(a.local), encoding: 'buffer' })

  const stderr = r.stderr ? r.stderr.toString() : ''

  if (r.status === 0) {
    subidos++
    console.log(`  ok   ${a.remoto}`)
  } else {
    fallados.push(a.remoto)
    console.log(`  FALLA ${a.remoto} — ${stderr.trim() || 'código ' + r.status}`)
  }
}

console.log(`\n${subidos}/${archivos.length} subidos`)
if (fallados.length) {
  console.log('Fallaron:')
  for (const f of fallados) console.log(`  ${f}`)
  process.exit(1)
}
console.log('Deploy completo.\n')
