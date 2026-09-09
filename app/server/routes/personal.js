const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');

const sinPassword = (u) => {
  const { passwordHash, ...resto } = u;
  return { ...resto, permisos: JSON.parse(resto.permisos), activo: Boolean(resto.activo) };
};

router.use(requireAuth, requireRole('Administrador'));

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM personal ORDER BY nombre');
  res.json(rows.map(sinPassword));
});

router.post('/', async (req, res) => {
  const { nombre, usuario, password, rol, permisos } = req.body;
  if (!nombre || !usuario || !password || !rol) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  const [existe] = await pool.query('SELECT id FROM personal WHERE usuario = ?', [usuario]);
  if (existe.length) return res.status(409).json({ error: 'Ese usuario ya existe' });

  const nuevo = {
    id: Date.now().toString(),
    nombre,
    usuario,
    passwordHash: bcrypt.hashSync(password, 10),
    rol,
    permisos: permisos || { secciones: [], puedeAprobarFamilias: false, puedeEnviarCliente: false },
  };
  await pool.query(
    'INSERT INTO personal (id, nombre, usuario, passwordHash, rol, permisos, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [nuevo.id, nuevo.nombre, nuevo.usuario, nuevo.passwordHash, nuevo.rol, JSON.stringify(nuevo.permisos)]
  );
  res.status(201).json(sinPassword({ ...nuevo, permisos: JSON.stringify(nuevo.permisos), activo: 1 }));
});

router.put('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM personal WHERE id = ?', [req.params.id]);
  const actual = rows[0];
  if (!actual) return res.status(404).json({ error: 'No encontrado' });

  const { nombre, usuario, password, rol, permisos, activo } = req.body;

  if (usuario && usuario !== actual.usuario) {
    const [existe] = await pool.query('SELECT id FROM personal WHERE usuario = ? AND id != ?', [usuario, actual.id]);
    if (existe.length) return res.status(409).json({ error: 'Ese usuario ya existe' });
  }

  const datos = {
    nombre: nombre ?? actual.nombre,
    usuario: usuario ?? actual.usuario,
    rol: rol ?? actual.rol,
    permisos: JSON.stringify(permisos ?? JSON.parse(actual.permisos)),
    activo: activo ?? Boolean(actual.activo),
    passwordHash: password ? bcrypt.hashSync(password, 10) : actual.passwordHash,
  };

  await pool.query(
    'UPDATE personal SET nombre=?, usuario=?, rol=?, permisos=?, activo=?, passwordHash=? WHERE id=?',
    [datos.nombre, datos.usuario, datos.rol, datos.permisos, datos.activo ? 1 : 0, datos.passwordHash, actual.id]
  );
  const [actualizado] = await pool.query('SELECT * FROM personal WHERE id = ?', [actual.id]);
  res.json(sinPassword(actualizado[0]));
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.auth.id) return res.status(400).json({ error: 'No podés eliminar tu propio usuario' });
  await pool.query('DELETE FROM personal WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
