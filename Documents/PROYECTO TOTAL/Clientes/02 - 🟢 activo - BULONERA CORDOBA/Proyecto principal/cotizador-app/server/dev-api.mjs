/**
 * Levanta la API PHP de desarrollo en el puerto 8899, que es a donde Vite
 * proxea /api (ver client/vite.config.js).
 *
 *   npm run dev:api
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buscarPhp } from './buscar-php.mjs'

const raizApp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = process.env.PHP_PORT || 8899
const php = buscarPhp()

console.log(`API PHP en http://localhost:${PUERTO}  (${php})`)

// El router manda todo a index.php, igual que hace el .htaccess en producción.
const proceso = spawn(
  php,
  ['-S', `localhost:${PUERTO}`, '-t', 'api-php', path.join('api-php', 'index.php')],
  { cwd: raizApp, stdio: 'inherit', shell: false }
)

proceso.on('exit', code => process.exit(code ?? 0))
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => proceso.kill())
}
