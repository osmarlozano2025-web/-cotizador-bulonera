const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { firmarToken, requireAuth } = require('../utils/auth');

const sinPassword = (u) => {
  const { passwordHash, ...resto } = u;
  return { ...resto, permisos: JSON.parse(resto.permisos), activo: Boolean(resto.activo) };
};

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM personal WHERE usuario = ? AND activo = 1', [usuario]);
  const persona = rows[0];
  if (!persona || !bcrypt.compareSync(password || '', persona.passwordHash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({ token: firmarToken(persona), user: sinPassword(persona) });
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM personal WHERE id = ? AND activo = 1', [req.auth.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Sesión inválida' });
  res.json(sinPassword(rows[0]));
});

module.exports = router;
