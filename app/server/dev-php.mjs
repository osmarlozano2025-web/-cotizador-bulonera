/**
 * Corre un script PHP suelto desde npm, sin depender de que PHP esté en el PATH.
 *
 *   npm run migrate
 *   npm run test:precios
 *   node server/dev-php.mjs api-php/migrate.php --estado
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buscarPhp } from './buscar-php.mjs'

const raizApp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

if (!args.length) {
  console.error('Uso: node server/dev-php.mjs <script.php> [args...]')
  process.exit(1)
}

const proceso = spawn(buscarPhp(), args, { cwd: raizApp, stdio: 'inherit', shell: false })
proceso.on('exit', code => process.exit(code ?? 0))
