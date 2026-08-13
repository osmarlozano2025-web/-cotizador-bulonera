// Repara los permisos de personal preservando lo existente.
// El setup de V002 reescribía el objeto entero y perdía los flags de aprobación.
import mysql from 'mysql2/promise'

const con = await mysql.createConnection({
  host: 'auth-db1889.hstgr.io', port: 3306,
  user: 'u519024156_B_Cordoba', password: 'Bulonera2026',
  database: 'u519024156_B_Cordoba',
})

const TODAS = [
  'nuevo-pedido', 'aprobaciones', 'cotizaciones',
  'clientes', 'productos', 'integraciones', 'personal', 'configuraciones',
]
const DEPOSITO = ['aprobaciones']

const [usuarios] = await con.query('SELECT id, usuario, rol, permisos FROM personal WHERE activo = 1')

for (const u of usuarios) {
  let p = {}
  try { p = (typeof u.permisos === 'string' ? JSON.parse(u.permisos) : u.permisos) || {} } catch {}

  const secciones = new Set(p.secciones || [])

  if (u.rol === 'Administrador') {
    TODAS.forEach((s) => secciones.add(s))
    p.puedeAprobarFamilias = true
    p.puedeEnviarCliente = true
  } else if (u.rol === 'Deposito') {
    DEPOSITO.forEach((s) => secciones.add(s))
    p.puedeAprobarFamilias = true
    p.puedeEnviarCliente = false
  } else {
    // Vendedor: mantiene sus secciones, agregamos aprobaciones sólo para ver
    p.puedeAprobarFamilias = p.puedeAprobarFamilias ?? false
    p.puedeEnviarCliente = p.puedeEnviarCliente ?? true
  }

  p.secciones = [...secciones]
  await con.query('UPDATE personal SET permisos = ? WHERE id = ?', [JSON.stringify(p), u.id])
  console.log(`✅ ${u.usuario.padEnd(12)} ${u.rol.padEnd(15)} secciones=${p.secciones.length} aprobar=${p.puedeAprobarFamilias} enviar=${p.puedeEnviarCliente}`)
}

await con.end()
console.log('\n🎉 Permisos reparados')
