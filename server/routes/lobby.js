const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

let gameRooms = null;
router.setGameRooms = (rooms) => { gameRooms = rooms; };

router.get('/tables', authMiddleware, async (req, res) => {
  const tables = await db.tables.find({}).sort({ createdAt: -1 });
  const enriched = tables.map(t => {
    const room = gameRooms?.get(t.id);
    return { ...t, playerCount: room ? room.getPlayerCount() : 0, status: room ? room.getStatus() : 'waiting' };
  });
  res.json(enriched);
});

router.post('/tables', authMiddleware, async (req, res) => {
  const { name, smallBlind = 10, bigBlind = 20, maxPlayers = 9, minBuyIn = 200, maxBuyIn = 2000 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre de mesa requerido' });
  if (maxPlayers < 2 || maxPlayers > 9) return res.status(400).json({ error: 'La mesa debe tener entre 2 y 9 jugadores' });

  const id = uuidv4();
  const table = { _id: id, id, name, small_blind: smallBlind, big_blind: bigBlind, max_players: maxPlayers, min_buy_in: minBuyIn, max_buy_in: maxBuyIn, createdAt: Date.now() };
  await db.tables.insert(table);
  res.status(201).json({ ...table, status: 'waiting', playerCount: 0 });
});

router.get('/leaderboard', authMiddleware, async (req, res) => {
  const users = await db.users.find({}).sort({ chips: -1 }).limit(20);
  res.json(users.map(u => ({ username: u.username, chips: u.chips, total_wins: u.totalWins, total_hands: u.totalHands })));
});

module.exports = router;
