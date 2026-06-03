const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { GameRoom } = require('../game/GameRoom');
const { JWT_SECRET } = require('../middleware/auth');

const gameRooms = new Map();

// Cleanup empty rooms after delay (don't delete immediately on disconnect)
function scheduleRoomCleanup(tableId) {
  setTimeout(() => {
    const room = gameRooms.get(tableId);
    if (room && room.getPlayerCount() === 0 && room.getStatus() === 'waiting') {
      gameRooms.delete(tableId);
      console.log(`Room ${tableId} cleaned up`);
    }
  }, 30000); // 30 seconds grace period
}

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No autorizado'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;

    // Re-join rooms if reconnecting
    for (const [tableId, room] of gameRooms) {
      if (room.players.find(p => p.id === userId)) {
        room.updateSocket(userId, socket.id);
        socket.join(tableId);
        socket.emit('game_state', room.getFullState(userId));
        console.log(`${username} reconnected to room ${tableId}`);
      }
    }

    socket.on('join_table', async ({ tableId, buyIn }) => {
      try {
        const tableConfig = await db.tables.findOne({ id: tableId });
        if (!tableConfig) return socket.emit('error', { message: 'Mesa no encontrada' });

        if (!gameRooms.has(tableId)) {
          gameRooms.set(tableId, new GameRoom(tableConfig, io));
        }
        const room = gameRooms.get(tableId);

        // Leave other tables
        for (const [tid, r] of gameRooms) {
          if (tid !== tableId && r.players.find(p => p.id === userId)) {
            await r.removePlayer(socket.id);
            socket.leave(tid);
          }
        }

        const result = await room.addPlayer(socket.user, socket.id, buyIn || tableConfig.min_buy_in);
        if (result.error) return socket.emit('error', { message: result.error });

        socket.join(tableId);
        socket.emit('joined_table', { tableId, state: room.getFullState(userId) });
      } catch (err) {
        console.error('join_table error:', err);
        socket.emit('error', { message: 'Error al unirse a la mesa' });
      }
    });

    socket.on('leave_table', async ({ tableId }) => {
      const room = gameRooms.get(tableId);
      if (room) {
        await room.removePlayer(socket.id);
        socket.leave(tableId);
        scheduleRoomCleanup(tableId);
      }
      socket.emit('left_table', { tableId });
    });

    socket.on('action', ({ tableId, action, amount }) => {
      const room = gameRooms.get(tableId);
      if (!room) {
        console.log(`Action: room ${tableId} not found. Rooms: ${[...gameRooms.keys()]}`);
        return socket.emit('error', { message: 'Mesa no encontrada' });
      }
      const result = room.handleAction(socket.id, action, amount);
      if (result?.error) socket.emit('error', { message: result.error });
    });

    socket.on('chat', ({ tableId, text }) => {
      if (!text?.trim()) return;
      const room = gameRooms.get(tableId);
      if (room) room.sendMessage(userId, username, text.trim().slice(0, 200));
    });

    socket.on('get_state', ({ tableId }) => {
      const room = gameRooms.get(tableId);
      if (room) socket.emit('game_state', room.getFullState(userId));
    });

    socket.on('disconnect', async () => {
      for (const [tableId, room] of gameRooms) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          // Don't remove immediately — give time to reconnect
          setTimeout(async () => {
            // Check if player reconnected (socket id would have changed)
            const stillDisconnected = !room.players.find(p => p.id === player.id && p.socketId !== socket.id);
            if (stillDisconnected && room.players.find(p => p.socketId === socket.id)) {
              await room.removePlayer(socket.id);
              scheduleRoomCleanup(tableId);
            }
          }, 10000); // 10 second grace period before removing
        }
      }
    });
  });

  return gameRooms;
}

module.exports = { initSocket, gameRooms };
