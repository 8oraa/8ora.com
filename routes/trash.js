const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Sadece admin erişebilir
router.use(authMiddleware);

// GET /api/trash -> Get all deleted items
router.get('/', (req, res) => {
  const tPosts = db.getAll('posts', true).filter(x => x.deleted_at);
  const tProjects = db.getAll('projects', true).filter(x => x.deleted_at);
  const tComments = db.getAll('comments', true).filter(x => x.deleted_at);
  const tMessages = db.getAll('messages', true).filter(x => x.deleted_at);

  res.json({
    posts: tPosts,
    projects: tProjects,
    comments: tComments,
    messages: tMessages
  });
});

// PUT /api/trash/:table/:id/restore -> Restore item
router.put('/:table/:id/restore', (req, res) => {
  const { table, id } = req.params;
  const validTables = ['posts', 'projects', 'comments', 'messages'];
  
  if (!validTables.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const success = db.restore(table, id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Item not found in trash' });
  }
});

// DELETE /api/trash/:table/:id -> Hard delete item
router.delete('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  const validTables = ['posts', 'projects', 'comments', 'messages'];
  
  if (!validTables.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const success = db.hardRemove(table, id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

module.exports = router;
