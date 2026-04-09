const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// GET /api/categories (Public)
router.get('/', (req, res) => {
  const { type } = req.query;
  let categories = [...db.getAll('categories')];
  
  if (type) {
    categories = categories.filter(c => c.type === type);
  }
  
  res.json(categories);
});

// POST /api/categories (Admin only)
router.post('/', authMiddleware, (req, res) => {
  let { type, slug, name_tr, name_en } = req.body;
  if (!type || !slug || !name_tr || !name_en) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Generate URL-friendly slug if needed
  slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const id = db.insert('categories', {
    type,
    slug,
    name_tr,
    name_en
  });

  res.json({ id });
});

// DELETE /api/categories/:id (Admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  const category = db.getById('categories', req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  // Note: hardRemove used to actually delete category. We don't need soft delete for setup categories.
  // Wait, db.hardRemove is designed to unlink images too but category has no image.
  // We can just use hardRemove, it is safe.
  db.hardRemove('categories', req.params.id);
  res.json({ success: true });
});

module.exports = router;
