require('dotenv').config();
const db = require('./db/database');
const bcrypt = require('bcryptjs');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.log('Uso: node reset-password.js <usuario> <nueva_contraseña>');
  process.exit(1);
}

setTimeout(async () => {
  try {
    const user = await db.users.findOne({ username });
    if (!user) {
      console.log('Usuario no encontrado:', username);
      process.exit(1);
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.users.update({ username }, { $set: { passwordHash: hash, status: 'active' } });
    console.log('Contraseña actualizada correctamente para:', username);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}, 3000);
