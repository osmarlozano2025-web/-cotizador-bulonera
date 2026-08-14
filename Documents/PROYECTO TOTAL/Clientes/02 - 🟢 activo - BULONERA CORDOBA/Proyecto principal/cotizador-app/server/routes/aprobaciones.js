const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');

const FAMILIAS_VALIDAS = ['buloneria', 'tolsen', 'mechas'];

function agruparPorFamilia(items) {
  const grupos = {};
  for (const item of items) {
    const fam = FAMILIAS_VALIDAS.includes(item.familia) ? item.familia : 'otros';
    if (!grupos[fam]) grupos[fam] = [];
    grupos[fam].push(item);
  }
  return grupos;
}

async function ensamblarPedido(aprobacionRow) {
  const [subRows] = await pool.query(
    'SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? ORDER BY id',
    [aprobacionRow.id]
  );
  const subpedidos = [];
  for (const sub of subRows) {
    const [items] = await pool.query('SELECT * FROM aprobaciones_items WHERE subpedidoId = ?', [sub.id]);
    subpedidos.push({
      familia: sub.familia,
      aprobado: Boolean(sub.aprobado),
      aprobadoPor: sub.aprobadoPor,
      fechaAprobacion: sub.fechaAprobacion,
      items: items.map(it => ({
        codigo: it.codigo,
        descripcion: it.descripcion,
        medida: it.medida,
        marca: it.marca,
        familia: it.familia,
        subfamilia: it.subfamilia,
        precioGranel: it.precioGranel,
        cantidad: it.cantidad,
      })),
    });
  }
  return { ...aprobacionRow, subpedidos };
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM aprobaciones WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return ensamblarPedido(rows[0]);
}

async function buscarPorToken(token) {
  const [rows] = await pool.query('SELECT * FROM aprobaciones WHERE token = ?', [token]);
  if (!rows[0]) return null;
  return ensamblarPedido(rows[0]);
}

// Crear pedido y mandarlo a aprobación (separado por familia/depósito)
router.post('/', requireAuth, async (req, res) => {
  const { pedido, cliente } = req.body;
  if (!pedido?.items?.length) return res.status(400).json({ error: 'Pedido vacío' });

  const descuento = cliente?.descuento || 0;
  const total = pedido.items.reduce((sum, item) => {
    return sum + (Number(item.cantidad) || 1) * (Number(item.precioGranel || item.precio) || 0) * (1 - descuento / 100);
  }, 0);

  const id = Date.now().toString();
  const token = crypto.randomBytes(9).toString('hex');

  await pool.query(
    `INSERT INTO aprobaciones (id, token, clienteId, clienteNombre, clienteTelefono, clienteEmail, descuento, total, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_aprobacion')`,
    [id, token, cliente?.id || null, cliente?.nombre || 'Sin cliente', cliente?.telefono || '', cliente?.email || '',
     descuento, Math.round(total * 100) / 100]
  );

  const grupos = agruparPorFamilia(pedido.items);
  for (const [familia, items] of Object.entries(grupos)) {
    const [res2] = await pool.query(
      'INSERT INTO aprobaciones_subpedidos (aprobacionId, familia, aprobado) VALUES (?, ?, 0)',
      [id, familia]
    );
    for (const it of items) {
      await pool.query(
        `INSERT INTO aprobaciones_items (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia, precioGranel, cantidad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [res2.insertId, it.codigo || null, it.descripcion, it.medida || null, it.marca || null,
         it.familia || familia, it.subfamilia || null, it.precioGranel || it.precio || 0, it.cantidad || 1]
      );
    }
  }

  res.status(201).json(await buscarPorId(id));
});

// Listar (opcionalmente filtrado por estado)
router.get('/', requireAuth, async (req, res) => {
  const { estado } = req.query;
  const [rows] = estado
    ? await pool.query('SELECT * FROM aprobaciones WHERE estado = ? ORDER BY fechaCreacion DESC', [estado])
    : await pool.query('SELECT * FROM aprobaciones ORDER BY fechaCreacion DESC');
  res.json(await Promise.all(rows.map(ensamblarPedido)));
});

router.get('/:id', requireAuth, async (req, res) => {
  const pedido = await buscarPorId(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'No encontrado' });
  res.json(pedido);
});

// Aprobar la parte de una familia/depósito puntual (solo Depósito o Administrador)
router.post('/:id/aprobar-familia', requireAuth, requireRole('Deposito', 'Administrador'), async (req, res) => {
  const { familia } = req.body;
  const [subRows] = await pool.query(
    'SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? AND familia = ?',
    [req.params.id, familia]
  );
  const sub = subRows[0];
  if (!sub) return res.status(404).json({ error: 'Esa familia no está en este pedido' });

  await pool.query(
    'UPDATE aprobaciones_subpedidos SET aprobado = 1, aprobadoPor = ?, fechaAprobacion = NOW() WHERE id = ?',
    [req.auth.id, sub.id]
  );

  const [todas] = await pool.query('SELECT aprobado FROM aprobaciones_subpedidos WHERE aprobacionId = ?', [req.params.id]);
  if (todas.every(s => s.aprobado)) {
    await pool.query('UPDATE aprobaciones SET estado = ? WHERE id = ?', ['esperando_confirmacion', req.params.id]);
  }

  res.json(await buscarPorId(req.params.id));
});

// Página pública de confirmación: obtener por token
router.get('/confirmar/:token', async (req, res) => {
  const pedido = await buscarPorToken(req.params.token);
  if (!pedido) return res.status(404).json({ error: 'No encontrado' });
  if (pedido.estado === 'en_aprobacion') return res.status(409).json({ error: 'Todavía no está listo para confirmar' });
  res.json(pedido);
});

// Confirmación del cliente
router.post('/confirmar/:token', async (req, res) => {
  const pedido = await buscarPorToken(req.params.token);
  if (!pedido) return res.status(404).json({ error: 'No encontrado' });
  if (pedido.estado === 'en_aprobacion') return res.status(409).json({ error: 'Todavía no está listo para confirmar' });

  await pool.query('UPDATE aprobaciones SET estado = ?, fechaConfirmacion = NOW() WHERE token = ?', ['confirmado', req.params.token]);
  res.json(await buscarPorToken(req.params.token));
});

// Marcar que se generó/envió el link al cliente (informativo, no bloquea nada)
router.post('/:id/marcar-enviado', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE aprobaciones SET fechaEnvioCliente = NOW() WHERE id = ? AND fechaEnvioCliente IS NULL',
    [req.params.id]
  );
  const pedido = await buscarPorId(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'No encontrado' });
  res.json(pedido);
});

module.exports = router;
