const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { generarExcel } = require('../services/generadorExcel');

const PEDIDOS_FILE = path.join(__dirname, '../data/pedidos_guardados.json');
const leer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; } };

router.post('/', async (req, res) => {
  try {
    const { pedido, cliente } = req.body;
    if (!pedido?.items?.length) return res.status(400).json({ error: 'Pedido vacío' });

    const buffer = await generarExcel(pedido, cliente);

    // Guardar el pedido en el historial
    const descuento = cliente?.descuento || 0;
    const total = pedido.items.reduce((sum, item) => {
      return sum + (Number(item.cantidad) || 1) * (Number(item.precioGranel || item.precio) || 0) * (1 - descuento / 100);
    }, 0);

    const pedidoGuardado = {
      id: Date.now().toString(),
      clienteId:     cliente?.id || null,
      clienteNombre: cliente?.nombre || 'Sin cliente',
      tipoDescuento: cliente?.tipoDescuento || null,
      descuento,
      fecha:         new Date().toISOString(),
      items:         pedido.items.map(i => ({
        codigo:      i.codigo,
        descripcion: i.descripcion,
        familia:     i.familia,
        medida:      i.medida,
        cantidad:    i.cantidad,
        precioGranel:i.precioGranel || i.precio || 0,
      })),
      total: Math.round(total * 100) / 100,
    };

    const historial = leer(PEDIDOS_FILE);
    historial.push(pedidoGuardado);
    fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(historial, null, 2));

    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = `cotizacion_${(cliente?.nombre || 'sin_cliente').replace(/\s+/g, '_')}_${fecha}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
