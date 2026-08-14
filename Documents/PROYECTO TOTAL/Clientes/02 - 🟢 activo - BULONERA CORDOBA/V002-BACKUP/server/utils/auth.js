const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.auth.rol)) return res.status(403).json({ error: 'No tenés permiso para esta acción' });
    next();
  };
}

module.exports = { firmarToken, requireAuth, requireRole };
