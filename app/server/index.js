require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pedidosRouter = require('./routes/pedidos');
const clientesRouter = require('./routes/clientes');
const exportarRouter = require('./routes/exportar');
const aprobacionesRouter = require('./routes/aprobaciones');
const authRouter = require('./routes/auth');
const personalRouter = require('./routes/personal');
const integracionesRouter = require('./routes/integraciones');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd ? false : 'http://localhost:5173',
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/productos', pedidosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/exportar', exportarRouter);
app.use('/api/aprobaciones', aprobacionesRouter);
app.use('/api/auth', authRouter);
app.use('/api/personal', personalRouter);
app.use('/api/integraciones', integracionesRouter);

// En producción: servir el build de React
if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} [${isProd ? 'producción' : 'desarrollo'}]`);
});
