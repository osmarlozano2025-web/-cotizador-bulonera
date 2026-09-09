const express = require('express');
const router = express.Router();
const { getConfig, setConfig } = require('../utils/config');
const { requireAuth, requireRole } = require('../utils/auth');

router.use(requireAuth, requireRole('Administrador'));

const mask = (valor) => {
  if (!valor) return '';
  return valor.length <= 6 ? '••••••' : `${valor.slice(0, 4)}••••${valor.slice(-4)}`;
};

router.get('/', async (req, res) => {
  const cfg = await getConfig();
  res.json({
    openaiApiKey: mask(cfg.openaiApiKey || process.env.OPENAI_API_KEY),
    openaiConfigurada: Boolean(cfg.openaiApiKey || process.env.OPENAI_API_KEY),
    tangoApiKey: mask(cfg.tangoApiKey),
    tangoConfigurada: Boolean(cfg.tangoApiKey),
  });
});

router.put('/', async (req, res) => {
  const { openaiApiKey, tangoApiKey } = req.body;
  const cambios = {};
  if (openaiApiKey) cambios.openaiApiKey = openaiApiKey;
  if (tangoApiKey) cambios.tangoApiKey = tangoApiKey;
  await setConfig(cambios);
  res.json({ ok: true });
});

module.exports = router;
