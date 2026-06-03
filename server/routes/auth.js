const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'El usuario debe tener entre 3 y 20 caracteres' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user = { _id: id, id, username, email, passwordHash, chips: 5000, totalWins: 0, totalHands: 0, createdAt: Date.now() };
    await db.users.insert(user);
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, username, chips: 5000 } });
  } catch (err) {
    if (err.errorType === 'uniqueViolated') return res.status(409).json({ error: 'Usuario o email ya registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = await db.users.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, chips: user.chips, totalWins: user.totalWins, totalHands: user.totalHands } });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: user.id, username: user.username, email: user.email, chips: user.chips, totalWins: user.totalWins, totalHands: user.totalHands });
});

module.exports = router;
