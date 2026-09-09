const express = require('express');
const router = express.Router();
const pool = require('../db');

// --- Tipos de descuento ---
router.get('/tipos-descuento', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tipos_descuento ORDER BY porcentaje');
  res.json(rows);
});

// --- Clientes CRUD ---
router.get('/', async (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    [rows] = await pool.query(
      'SELECT * FROM clientes WHERE nombre LIKE ? OR razonSocial LIKE ? OR localidad LIKE ? ORDER BY nombre',
      [like, like, like]
    );
  } else {
    [rows] = await pool.query('SELECT * FROM clientes ORDER BY nombre');
  }
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const [tipos] = await pool.query('SELECT * FROM tipos_descuento');
  const tipo = tipos.find(t => t.codigo === req.body.tipoDescuento) || tipos[0];

  const nuevo = {
    id: Date.now().toString(),
    nombre: req.body.nombre,
    razonSocial: req.body.razonSocial || '',
    cuit: req.body.cuit || '',
    telefono: req.body.telefono || '',
    email: req.body.email || '',
    localidad: req.body.localidad || '',
    provincia: req.body.provincia || '',
    tipoDescuento: tipo?.codigo || null,
    descuento: tipo?.porcentaje || 0,
  };

  await pool.query(
    `INSERT INTO clientes (id, nombre, razonSocial, cuit, telefono, email, localidad, provincia, tipoDescuento, descuento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nuevo.id, nuevo.nombre, nuevo.razonSocial, nuevo.cuit, nuevo.telefono, nuevo.email,
     nuevo.localidad, nuevo.provincia, nuevo.tipoDescuento, nuevo.descuento]
  );
  res.status(201).json(nuevo);
});

router.put('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  const actual = rows[0];
  if (!actual) return res.status(404).json({ error: 'No encontrado' });

  const [tipos] = await pool.query('SELECT * FROM tipos_descuento');
  const tipo = tipos.find(t => t.codigo === req.body.tipoDescuento);

  const datos = {
    nombre: req.body.nombre ?? actual.nombre,
    razonSocial: req.body.razonSocial ?? actual.razonSocial,
    cuit: req.body.cuit ?? actual.cuit,
    telefono: req.body.telefono ?? actual.telefono,
    email: req.body.email ?? actual.email,
    localidad: req.body.localidad ?? actual.localidad,
    provincia: req.body.provincia ?? actual.provincia,
    tipoDescuento: req.body.tipoDescuento ?? actual.tipoDescuento,
    descuento: tipo ? tipo.porcentaje : actual.descuento,
  };

  await pool.query(
    `UPDATE clientes SET nombre=?, razonSocial=?, cuit=?, telefono=?, email=?, localidad=?, provincia=?, tipoDescuento=?, descuento=?
     WHERE id=?`,
    [datos.nombre, datos.razonSocial, datos.cuit, datos.telefono, datos.email,
     datos.localidad, datos.provincia, datos.tipoDescuento, datos.descuento, actual.id]
  );
  res.json({ ...actual, ...datos, id: actual.id });
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
