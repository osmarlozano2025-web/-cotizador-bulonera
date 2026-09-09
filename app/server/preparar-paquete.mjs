/**
 * Arma en dist-deploy/ exactamente lo que va al servidor.
 *
 *   node server/preparar-paquete.mjs
 *
 * Junta el build del cliente, el backend PHP y el .htaccess de la raíz. Deja
 * afuera el .env y el .env.hostinger: las credenciales buenas viven en el
 * servidor y no se pisan desde acá.
 */
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destino = path.join(raiz, 'dist-deploy', 'public_html')
const build = path.join(raiz, 'client', 'dist')

if (!existsSync(build)) {
  console.error('Falta el build del cliente. Corré primero:  npm run build')
  process.exit(1)
}

rmSync(path.join(raiz, 'dist-deploy'), { recursive: true, force: true })
mkdirSync(destino, { recursive: true })

cpSync(build, destino, { recursive: true })
cpSync(path.join(raiz, 'deploy-htaccess-raiz.txt'), path.join(destino, '.htaccess'))
cpSync(path.join(raiz, 'api-php'), path.join(destino, 'api-php'), {
  recursive: true,
  filter: (src) => !['.env', '.env.hostinger'].includes(path.basename(src)),
})

const contar = (dir) => readdirSync(dir).reduce((n, f) => {
  const p = path.join(dir, f)
  return n + (statSync(p).isDirectory() ? contar(p) : 1)
}, 0)

console.log(`\nPaquete listo: ${contar(destino)} archivos en dist-deploy/public_html`)
console.log('Para subirlo:')
console.log("  FTP_PASSWORD='tu-clave' node server/deploy-hostinger.mjs dist-deploy/public_html\n")
