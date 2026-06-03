const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'El usuario debe tener entre 3 y 20 caracteres' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // First user or admin username gets admin + active status
    const userCount = await db.users.count({});
    const isAdmin = userCount === 0 || username === ADMIN_USERNAME;
    const status = isAdmin ? 'active' : 'pending';

    const user = {
      _id: id, id, username, email, passwordHash,
      chips: isAdmin ? 99999 : 0,
      totalWins: 0, totalHands: 0,
      isAdmin, status,
      createdAt: Date.now()
    };
    await db.users.insert(user);

    if (status === 'pending') {
      return res.status(201).json({ pending: true, message: 'Registro recibido. El administrador debe aprobar tu cuenta antes de que puedas jugar.' });
    }

    const token = jwt.sign({ id, username, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, username, chips: user.chips, isAdmin } });
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

  if (user.status === 'pending') return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' });
  if (user.status === 'banned') return res.status(403).json({ error: 'Tu cuenta fue suspendida. Contactá al administrador.' });

  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, chips: user.chips, totalWins: user.totalWins, totalHands: user.totalHands, isAdmin: user.isAdmin } });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: user.id, username: user.username, email: user.email, chips: user.chips, totalWins: user.totalWins, totalHands: user.totalHands, isAdmin: user.isAdmin });
});

module.exports = router;
