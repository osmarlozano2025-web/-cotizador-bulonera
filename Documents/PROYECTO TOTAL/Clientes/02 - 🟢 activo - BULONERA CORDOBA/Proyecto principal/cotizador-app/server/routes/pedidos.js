const express = require('express');
const router = express.Router();
const multer = require('multer');
const FuseLib = require('fuse.js');
const Fuse = FuseLib.default || FuseLib;
const pool = require('../db');
const { interpretarImagen } = require('../services/ia');

const upload = multer({ storage: multer.memoryStorage() });

let catalogo = [];

async function cargarCatalogos() {
  const [rows] = await pool.query('SELECT * FROM productos');
  catalogo = rows;
  console.log(`Catálogo cargado desde MySQL: ${catalogo.length} productos`);
}

cargarCatalogos().catch(err => console.error('Error cargando catálogo desde MySQL:', err.message));

router.post('/recargar', async (req, res) => {
  await cargarCatalogos();
  res.json({ ok: true, total: catalogo.length });
});

router.get('/buscar', (req, res) => {
  const { q, familia } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);

  const base = familia ? catalogo.filter(p => p.familia === familia) : catalogo;

  const fuse = new Fuse(base, {
    keys: ['descripcion', 'codigo', 'medida'],
    threshold: 0.4,
    includeScore: true,
  });

  const resultados = fuse.search(q).slice(0, 30).map(r => r.item);
  res.json(resultados);
});

router.get('/familias', (req, res) => {
  const familias = [...new Set(catalogo.map(p => p.familia).filter(Boolean))];
  res.json(familias);
});

router.post('/interpretar-imagen', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const productosDetectados = await interpretarImagen(imageBase64, mimeType);

    const fuse = new Fuse(catalogo, {
      keys: ['descripcion', 'codigo'],
      threshold: 0.5,
      includeScore: true,
    });

    const resultado = productosDetectados.map(pd => {
      const matches = fuse.search(pd.descripcion).slice(0, 3);
      return {
        detectado: pd,
        sugerencias: matches.map(m => m.item),
        matchExacto: matches.length > 0 && matches[0].score < 0.2 ? matches[0].item : null,
      };
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
