require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../db');

const DATA = path.join(__dirname, '../data');
const leerJson = (archivo) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, archivo), 'utf8')); } catch { return []; }
};

async function migrarTiposDescuento() {
  const tipos = leerJson('tipos_descuento.json');
  for (const t of tipos) {
    await pool.query(
      'INSERT INTO tipos_descuento (codigo, nombre, porcentaje, color) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), porcentaje=VALUES(porcentaje), color=VALUES(color)',
      [t.codigo, t.nombre, t.porcentaje, t.color || null]
    );
  }
  console.log(`✓ tipos_descuento: ${tipos.length}`);
}

async function migrarClientes() {
  const clientes = leerJson('clientes.json');
  for (const c of clientes) {
    await pool.query(
      `INSERT INTO clientes (id, nombre, razonSocial, cuit, telefono, email, localidad, provincia, tipoDescuento, descuento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), razonSocial=VALUES(razonSocial), cuit=VALUES(cuit),
         telefono=VALUES(telefono), email=VALUES(email), localidad=VALUES(localidad), provincia=VALUES(provincia),
         tipoDescuento=VALUES(tipoDescuento), descuento=VALUES(descuento)`,
      [c.id, c.nombre, c.razonSocial || null, c.cuit || null, c.telefono || null, c.email || null,
       c.localidad || null, c.provincia || null, c.tipoDescuento || null, c.descuento || 0]
    );
  }
  console.log(`✓ clientes: ${clientes.length}`);
}

async function migrarProductos() {
  const archivos = ['buloneria.json', 'tolsen.json', 'mechas.json'];
  let total = 0;
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM productos');
  if (c > 0) {
    console.log(`↷ productos: ya hay ${c} cargados, se omite (borrá la tabla si querés recargar)`);
    return;
  }
  for (const archivo of archivos) {
    const productos = leerJson(archivo);
    for (const p of productos) {
      await pool.query(
        `INSERT INTO productos (codigo, descripcion, medida, marca, familia, subfamilia, unidadGranel, unidadFraccion, precioLista, precioGranel, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.codigo || null, p.descripcion, p.medida || null, p.marca || null, p.familia,
         p.subfamilia || null, p.unidadGranel || null, p.unidadFraccion || null,
         p.precioLista || null, p.precioGranel || null, p.stock ?? null]
      );
      total++;
    }
  }
  console.log(`✓ productos: ${total}`);
}

async function migrarPersonal() {
  const personal = leerJson('personal.json');
  for (const p of personal) {
    await pool.query(
      `INSERT INTO personal (id, nombre, usuario, passwordHash, rol, permisos, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), usuario=VALUES(usuario), passwordHash=VALUES(passwordHash),
         rol=VALUES(rol), permisos=VALUES(permisos), activo=VALUES(activo)`,
      [p.id, p.nombre, p.usuario, p.passwordHash, p.rol, JSON.stringify(p.permisos), p.activo === false ? 0 : 1]
    );
  }
  console.log(`✓ personal: ${personal.length}`);
}

async function migrarConfig() {
  const cfgPath = path.join(__dirname, '../config.json');
  let datos = {};
  try { datos = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch {}
  for (const [clave, valor] of Object.entries(datos)) {
    await pool.query(
      'INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
      [clave, valor]
    );
  }
  console.log(`✓ config: ${Object.keys(datos).length} claves`);
}

async function migrarAprobaciones() {
  const aprobaciones = leerJson('aprobaciones.json');
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM aprobaciones');
  if (c > 0) {
    console.log(`↷ aprobaciones: ya hay ${c} cargadas, se omite`);
    return;
  }
  const [clientesExistentes] = await pool.query('SELECT id FROM clientes');
  const idsValidos = new Set(clientesExistentes.map(c => c.id));

  for (const a of aprobaciones) {
    const clienteId = idsValidos.has(a.clienteId) ? a.clienteId : null;
    await pool.query(
      `INSERT INTO aprobaciones (id, token, clienteId, clienteNombre, clienteTelefono, clienteEmail, descuento, total, estado, fechaCreacion, fechaEnvioCliente, fechaConfirmacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.token, clienteId, a.clienteNombre || null, a.clienteTelefono || null, a.clienteEmail || null,
       a.descuento || 0, a.total || 0, a.estado, new Date(a.fechaCreacion),
       a.fechaEnvioCliente ? new Date(a.fechaEnvioCliente) : null,
       a.fechaConfirmacion ? new Date(a.fechaConfirmacion) : null]
    );
    for (const sub of a.subpedidos) {
      const [res] = await pool.query(
        `INSERT INTO aprobaciones_subpedidos (aprobacionId, familia, aprobado, aprobadoPor, fechaAprobacion)
         VALUES (?, ?, ?, ?, ?)`,
        [a.id, sub.familia, sub.aprobado ? 1 : 0, sub.aprobadoPor || null,
         sub.fechaAprobacion ? new Date(sub.fechaAprobacion) : null]
      );
      for (const it of sub.items) {
        await pool.query(
          `INSERT INTO aprobaciones_items (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia, precioGranel, cantidad)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [res.insertId, it.codigo || null, it.descripcion, it.medida || null, it.marca || null,
           it.familia || sub.familia, it.subfamilia || null, it.precioGranel || it.precio || 0, it.cantidad || 1]
        );
      }
    }
  }
  console.log(`✓ aprobaciones: ${aprobaciones.length}`);
}

async function main() {
  console.log('Migrando datos de JSON a MySQL...\n');
  await migrarTiposDescuento();
  await migrarClientes();
  await migrarProductos();
  await migrarPersonal();
  await migrarConfig();
  await migrarAprobaciones();
  console.log('\nListo.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
