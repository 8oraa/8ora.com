const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.data.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || '8ora_secret_jwt_key_2026',
    { expiresIn: '24h' }
  );
  res.json({ token, username: user.username });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid passwords' });
  }

  const user = db.getById('users', req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.update('users', req.user.id, { password_hash: newHash });
  res.json({ success: true });
});

router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, username: req.user.username });
});

module.exports = router;
