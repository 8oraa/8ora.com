const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const xss = require('xss');

router.get('/', (req, res) => {
  const settings = {};
  db.getAll('settings').forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

router.put('/', authMiddleware, (req, res) => {
  const updates = req.body;
  const current = db.getAll('settings');
  
  for (const [key, value] of Object.entries(updates)) {
    const idx = current.findIndex(s => s.key === key);
    if (idx !== -1) {
      current[idx].value = value;
    } else {
      current.push({ key, value });
    }
  }
  db.save();
  res.json({ success: true });
});

router.get('/messages', authMiddleware, (req, res) => {
  const messages = [...db.getAll('messages')].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(messages);
});

router.post('/messages', (req, res) => {
  let { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Required fields missing' });
  
  name = xss(name);
  email = xss(email);
  subject = subject ? xss(subject) : '';
  message = xss(message);

  db.insert('messages', { name, email, subject, message, read: false });
  res.json({ success: true });
});

router.put('/messages/:id/read', authMiddleware, (req, res) => {
  db.update('messages', req.params.id, { read: true });
  res.json({ success: true });
});

router.delete('/messages/:id', authMiddleware, (req, res) => {
  db.remove('messages', req.params.id);
  res.json({ success: true });
});

module.exports = router;
