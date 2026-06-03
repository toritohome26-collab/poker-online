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

// Servir el build de React en producción
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Poker server running on port ${PORT}`));
