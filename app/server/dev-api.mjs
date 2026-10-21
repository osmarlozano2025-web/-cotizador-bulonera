/**
 * Levanta la API PHP de desarrollo en el puerto 8899, que es a donde Vite
 * proxea /api (ver client/vite.config.js).
 *
 *   npm run dev:api
 */
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buscarPhp } from './buscar-php.mjs'

const raizApp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = process.env.PHP_PORT || 8899
const php = buscarPhp()

console.log(`API PHP en http://localhost:${PUERTO}  (${php})`)

// El Excel para Tango necesita la extensión zip. En Hostinger viene prendida;
// el PHP de WinGet la trae pero apagada. Se carga sólo si falta, porque
// cargarla dos veces deja un aviso en cada pedido.
const tieneZip = spawnSync(php, ['-r', 'echo class_exists("ZipArchive") ? 1 : 0;'], { encoding: 'utf8' }).stdout === '1'
const extensiones = tieneZip ? [] : ['-d', 'extension=zip']

// El router manda todo a index.php, igual que hace el .htaccess en producción.
const proceso = spawn(
  php,
  [...extensiones, '-S', `localhost:${PUERTO}`, '-t', 'api-php', path.join('api-php', 'index.php')],
  { cwd: raizApp, stdio: 'inherit', shell: false }
)

proceso.on('exit', code => process.exit(code ?? 0))
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => proceso.kill())
}
