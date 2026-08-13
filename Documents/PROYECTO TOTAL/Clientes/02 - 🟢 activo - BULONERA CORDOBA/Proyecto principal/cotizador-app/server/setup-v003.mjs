// Setup V003: familia Electrodos + depósitos con responsable + reemplazo por falta de stock
// Uso: node server/setup-v003.mjs
import mysql from 'mysql2/promise'

const con = await mysql.createConnection({
  host: 'auth-db1889.hstgr.io',
  port: 3306,
  user: 'u519024156_B_Cordoba',
  password: 'Bulonera2026',
  database: 'u519024156_B_Cordoba',
})
console.log('✅ Conectado a Hostinger MySQL\n')

// ─── 1. Migrar electrodos a su propia familia ───────────────────────────────
// "PINZA PORTA ELECTRODOS" es una herramienta: se queda en su familia actual.
const [mig] = await con.query(
  "UPDATE productos SET familia = 'electrodos' WHERE descripcion LIKE 'ELECTRODO%'"
)
console.log(`✅ ${mig.affectedRows} productos movidos a familia 'electrodos'`)

const [fams] = await con.query('SELECT familia, COUNT(*) c FROM productos GROUP BY familia ORDER BY c DESC')
console.table(fams)

// ─── 2. Columnas para el flujo de stock/reemplazo ───────────────────────────
const [cols] = await con.query('SHOW COLUMNS FROM aprobaciones_items')
const tiene = (n) => cols.some((c) => c.Field === n)

if (!tiene('estado')) {
  // pendiente → el depósito todavía no lo revisó
  // confirmado → hay stock
  // sin_stock  → no hay, queda tachado
  // reemplazo  → item nuevo que sustituye a uno sin stock
  await con.query(
    "ALTER TABLE aprobaciones_items ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'"
  )
  console.log("✅ Columna 'estado' agregada")
}
if (!tiene('reemplazaA')) {
  await con.query('ALTER TABLE aprobaciones_items ADD COLUMN reemplazaA BIGINT NULL')
  console.log("✅ Columna 'reemplazaA' agregada")
}
if (!tiene('nota')) {
  await con.query('ALTER TABLE aprobaciones_items ADD COLUMN nota VARCHAR(255) NULL')
  console.log("✅ Columna 'nota' agregada")
}
if (!tiene('cantidadConfirmada')) {
  await con.query('ALTER TABLE aprobaciones_items ADD COLUMN cantidadConfirmada DECIMAL(10,2) NULL')
  console.log("✅ Columna 'cantidadConfirmada' agregada")
}

// Items ya existentes de pedidos ya aprobados: los damos por confirmados
await con.query(`
  UPDATE aprobaciones_items i
  JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
  SET i.estado = 'confirmado'
  WHERE s.aprobado = 1 AND i.estado = 'pendiente'
`)

// ─── 3. Depósitos en configuraciones (1 por familia) ────────────────────────
const DEPOSITOS = [
  ['deposito_buloneria', { numero: 1, familia: 'buloneria', nombre: 'Depósito 1 — Bulonería', responsableId: null }],
  ['deposito_tolsen', { numero: 2, familia: 'tolsen', nombre: 'Depósito 2 — Tolsen', responsableId: null }],
  ['deposito_mechas', { numero: 3, familia: 'mechas', nombre: 'Depósito 3 — Mechas', responsableId: null }],
  ['deposito_electrodos', { numero: 4, familia: 'electrodos', nombre: 'Depósito 4 — Electrodos', responsableId: null }],
]

for (const [clave, valor] of DEPOSITOS) {
  // No pisar el responsable si ya fue asignado
  await con.query(
    `INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES (?, ?, ?, 'deposito')
     ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
    [clave, JSON.stringify(valor), valor.nombre]
  )
}
console.log(`✅ ${DEPOSITOS.length} depósitos configurados`)

// Descuento de electrodos ya existe de V002; verificamos
await con.query(
  `INSERT INTO configuraciones (clave, valor, descripcion, tipo)
   VALUES ('descuento_electrodos', ?, 'Electrodos - Precio Neto', 'descuento_familia')
   ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
  [JSON.stringify({ desc_1: 0, desc_2: 0 })]
)

const [cfg] = await con.query("SELECT clave, valor FROM configuraciones WHERE tipo = 'deposito' ORDER BY clave")
console.log('\n📦 Depósitos:')
console.table(cfg.map((c) => ({ clave: c.clave, valor: typeof c.valor === 'string' ? c.valor : JSON.stringify(c.valor) })))

await con.end()
console.log('\n🎉 Setup V003 completado')
