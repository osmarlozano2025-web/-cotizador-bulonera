const pool = require('../db');

async function getConfig() {
  const [rows] = await pool.query('SELECT clave, valor FROM config');
  return Object.fromEntries(rows.map(r => [r.clave, r.valor]));
}

async function setConfig(cambios) {
  for (const [clave, valor] of Object.entries(cambios)) {
    await pool.query(
      'INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [clave, valor]
    );
  }
  return getConfig();
}

async function getOpenAIKey() {
  const cfg = await getConfig();
  return cfg.openaiApiKey || process.env.OPENAI_API_KEY || '';
}

module.exports = { getConfig, setConfig, getOpenAIKey };
