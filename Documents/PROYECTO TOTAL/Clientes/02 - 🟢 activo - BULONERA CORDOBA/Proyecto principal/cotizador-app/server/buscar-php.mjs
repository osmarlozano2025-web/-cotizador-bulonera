/**
 * Ubica el intérprete de PHP.
 *
 * Existe porque winget agrega PHP al PATH del usuario pero las terminales ya
 * abiertas no lo ven hasta reiniciarse, y porque en Windows PHP suele estar en
 * lugares distintos según cómo se haya instalado.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

function enPath() {
  const r = spawnSync('php', ['-v'], { stdio: 'ignore', shell: true })
  return r.status === 0 ? 'php' : null
}

function enWinget() {
  const base = process.env.LOCALAPPDATA
    && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages')
  if (!base || !existsSync(base)) return null
  const paquete = readdirSync(base).find(d => d.startsWith('PHP.PHP'))
  if (!paquete) return null
  const exe = path.join(base, paquete, 'php.exe')
  return existsSync(exe) ? exe : null
}

function enUbicacionesComunes() {
  return [
    'C:\\tools\\php\\php.exe',
    'C:\\php\\php.exe',
    'C:\\xampp\\php\\php.exe',
    'C:\\laragon\\bin\\php\\php.exe',
    '/usr/bin/php',
    '/usr/local/bin/php',
  ].find(existsSync) || null
}

/** Devuelve la ruta al ejecutable, o corta el proceso con un mensaje útil. */
export function buscarPhp() {
  const php = enPath() || enWinget() || enUbicacionesComunes()
  if (!php) {
    console.error('\nNo encontré PHP. Instalalo con:  winget install PHP.PHP.8.4\n')
    process.exit(1)
  }
  return php
}
