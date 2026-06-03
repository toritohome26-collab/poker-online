const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  const users = await db.users.find({}, { sort: { createdAt: -1 } });
  res.json(users.map(u => ({
    id: u.id, username: u.username, email: u.email,
    chips: u.chips, status: u.status, isAdmin: u.isAdmin,
    totalWins: u.totalWins, totalHands: u.totalHands, createdAt: u.createdAt
  })));
});

router.post('/users/:id/approve', async (req, res) => {
  const { chips = 1000 } = req.body;
  await db.users.update({ id: req.params.id }, { $set: { status: 'active', chips: Number(chips) } });
  res.json({ ok: true });
});

router.post('/users/:id/reject', async (req, res) => {
  await db.users.update({ id: req.params.id }, { $set: { status: 'rejected' } });
  res.json({ ok: true });
});

router.post('/users/:id/ban', async (req, res) => {
  await db.users.update({ id: req.params.id }, { $set: { status: 'banned' } });
  res.json({ ok: true });
});

router.post('/users/:id/unban', async (req, res) => {
  await db.users.update({ id: req.params.id }, { $set: { status: 'active' } });
  res.json({ ok: true });
});

router.post('/users/:id/chips', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Monto inválido' });
  await db.users.update({ id: req.params.id }, { $inc: { chips: Number(amount) } });
  const user = await db.users.findOne({ id: req.params.id });
  res.json({ ok: true, chips: user.chips });
});

router.post('/users/:id/set-chips', async (req, res) => {
  const { amount } = req.body;
  if (amount === undefined || isNaN(amount)) return res.status(400).json({ error: 'Monto inválido' });
  await db.users.update({ id: req.params.id }, { $set: { chips: Number(amount) } });
  res.json({ ok: true });
});

router.post('/users/:id/make-admin', async (req, res) => {
  await db.users.update({ id: req.params.id }, { $set: { isAdmin: true } });
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  await db.users.remove({ id: req.params.id });
  res.json({ ok: true });
});

router.post('/tables', async (req, res) => {
  const { name, smallBlind = 10, bigBlind = 20, maxPlayers = 9, minBuyIn = 200, maxBuyIn = 2000, isTournament = false, buyIn = 0, prizePool = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const id = uuidv4();
  const table = { id, name, small_blind: smallBlind, big_blind: bigBlind, max_players: maxPlayers, min_buy_in: minBuyIn, max_buy_in: maxBuyIn, isTournament, buyIn, prizePool, createdAt: Date.now() };
  await db.tables.insert(table);
  res.status(201).json(table);
});

router.delete('/tables/:id', async (req, res) => {
  await db.tables.remove({ id: req.params.id });
  res.json({ ok: true });
});

router.get('/stats', async (req, res) => {
  const [totalUsers, pendingUsers, activeUsers, totalTables, totalHands] = await Promise.all([
    db.users.count({}),
    db.users.count({ status: 'pending' }),
    db.users.count({ status: 'active' }),
    db.tables.count({}),
    db.hands.count({}),
  ]);
  res.json({ totalUsers, pendingUsers, activeUsers, totalTables, totalHands });
});

module.exports = router;
