require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const lobbyRoutes = require('./routes/lobby');
const adminRoutes = require('./routes/admin');
const { initSocket, gameRooms } = require('./socket/index');

const app = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (isProd ? '*' : 'http://localhost:5173');

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);

const rooms = initSocket(io);
lobbyRoutes.setGameRooms(rooms);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Emergency password reset (requires RESET_SECRET env variable)
app.post('/api/reset-password', async (req, res) => {
  const { secret, username, password } = req.body;
  const RESET_SECRET = process.env.RESET_SECRET;
  if (!RESET_SECRET || secret !== RESET_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const bcrypt = require('bcryptjs');
  const db = require('./db/database');
  const user = await db.users.findOne({ username });
  if (!user) return res.status(404).json({ error: `Usuario '${username}' no encontrado en la base de datos` });
  const hash = await bcrypt.hash(password, 10);
  await db.users.update({ username }, { $set: { passwordHash: hash, status: 'active' } });
  res.json({ ok: true, message: `Contraseña de ${username} actualizada` });
});

// List users (debug)
app.get('/api/debug-users/:secret', async (req, res) => {
  const RESET_SECRET = process.env.RESET_SECRET;
  if (!RESET_SECRET || req.params.secret !== RESET_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const db = require('./db/database');
  const users = await db.users.find({}, { sort: { createdAt: -1 } });
  res.json(users.map(u => ({ username: u.username, status: u.status, isAdmin: u.isAdmin, chips: u.chips })));
});

// Servir el build de React en producción
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Poker server running on port ${PORT}`));
