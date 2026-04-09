const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/posts';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

router.get('/', (req, res) => {
  let { category, page = 1, limit = 10 } = req.query;
  let posts = db.getAll('posts').filter(p => !!p.published);
  
  if (category && category !== 'all') {
    posts = posts.filter(p => p.category === category);
  }
  
  posts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  
  const total = posts.length;
  const offset = (page - 1) * limit;
  posts = posts.slice(offset, offset + Number(limit));

  res.json({ posts, total, page: Number(page), pages: Math.ceil(total / limit) });
});

router.get('/all', authMiddleware, (req, res) => {
  const posts = [...db.getAll('posts')].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(posts);
});

router.get('/:slug', (req, res) => {
  const post = db.getAll('posts').find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  
  db.update('posts', post.id, { views: (post.views || 0) + 1 });
  res.json({ ...post, views: (post.views || 0) + 1 });
});

router.post('/', authMiddleware, upload.single('cover_image'), (req, res) => {
  const { title_tr, title_en, content_tr, content_en, excerpt_tr, excerpt_en,
          category, published, read_time,
          seo_title, seo_description, seo_keywords } = req.body;

  const isPublishing = published === 'true' || published === true;

  // Only enforce required fields when actually publishing
  if (isPublishing && (!title_tr || !title_en || !content_tr || !content_en)) {
    return res.status(400).json({ error: 'Yayınlamak için başlık ve içerik zorunludur.' });
  }
  // For drafts, at least a TR title is required to make a slug
  if (!title_tr) {
    return res.status(400).json({ error: 'Başlık (TR) alanı zorunludur.' });
  }

  let slug = slugify(title_tr);
  if (db.getAll('posts').some(p => p.slug === slug)) slug = slug + '-' + Date.now();

  const cover_image = req.file ? '/uploads/posts/' + req.file.filename : null;

  const id = db.insert('posts', {
    slug, title_tr, title_en: title_en || '', content_tr: content_tr || '', content_en: content_en || '',
    excerpt_tr: excerpt_tr || '', excerpt_en: excerpt_en || '', category: category || 'genel',
    cover_image, published: isPublishing,
    read_time: Number(read_time) || 5, views: 0,
    seo_title: seo_title || '', seo_description: seo_description || '', seo_keywords: seo_keywords || ''
  });

  res.json({ id, slug });
});

router.put('/:id', authMiddleware, upload.single('cover_image'), (req, res) => {
  const post = db.getById('posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const body = req.body;
  const isPublishing = body.published === 'true' || body.published === true;

  // Only enforce required fields when publishing
  if (isPublishing && (!body.title_tr && !post.title_tr || !body.title_en && !post.title_en ||
      !body.content_tr && !post.content_tr || !body.content_en && !post.content_en)) {
    return res.status(400).json({ error: 'Yayınlamak için başlık ve içerik zorunludur.' });
  }

  let cover_image = post.cover_image;
  if (req.file) {
    cover_image = '/uploads/posts/' + req.file.filename;
  } else if (body.delete_cover_image === 'true') {
    if (post.cover_image) {
      const imgPath = './public' + post.cover_image;
      if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch(e){}
    }
    cover_image = null;
  }

  db.update('posts', req.params.id, {
    title_tr: body.title_tr || post.title_tr,
    title_en: body.title_en || post.title_en,
    content_tr: body.content_tr !== undefined ? body.content_tr : post.content_tr,
    content_en: body.content_en !== undefined ? body.content_en : post.content_en,
    excerpt_tr: body.excerpt_tr ?? post.excerpt_tr,
    excerpt_en: body.excerpt_en ?? post.excerpt_en,
    category: body.category || post.category,
    cover_image,
    published: isPublishing || (body.published === undefined ? post.published : false),
    read_time: Number(body.read_time) || post.read_time,
    seo_title: body.seo_title !== undefined ? body.seo_title : (post.seo_title || ''),
    seo_description: body.seo_description !== undefined ? body.seo_description : (post.seo_description || ''),
    seo_keywords: body.seo_keywords !== undefined ? body.seo_keywords : (post.seo_keywords || '')
  });

  res.json({ success: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.getById('posts', req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  db.remove('posts', req.params.id);
  res.json({ success: true });
});

// ─── Comment Routes ───

// Get approved comments for a post (public)
router.get('/:slug/comments', (req, res) => {
  const post = db.getAll('posts').find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comments = db.getAll('comments')
    .filter(c => c.post_slug === req.params.slug && c.approved)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(comments);
});

// Add a new comment (public, pending approval)
router.post('/:slug/comments', (req, res) => {
  const post = db.getAll('posts').find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { author_name, author_email, content } = req.body;
  if (!author_name || !content) {
    return res.status(400).json({ error: 'İsim ve yorum içeriği zorunludur.' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Yorum en fazla 2000 karakter olabilir.' });
  }

  const id = db.insert('comments', {
    post_slug: req.params.slug,
    post_title_tr: post.title_tr,
    post_title_en: post.title_en,
    author_name: author_name.trim().substring(0, 100),
    author_email: (author_email || '').trim().substring(0, 200),
    content: content.trim(),
    approved: false
  });

  res.json({ success: true, id, message: 'Yorumunuz alındı, onaylandıktan sonra yayınlanacak.' });
});

// Get all comments (admin)
router.get('/admin/comments', authMiddleware, (req, res) => {
  const comments = [...db.getAll('comments')]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(comments);
});

// Approve comment (admin)
router.put('/admin/comments/:id/approve', authMiddleware, (req, res) => {
  const comment = db.getById('comments', req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  db.update('comments', req.params.id, { approved: true });
  res.json({ success: true });
});

// Delete comment (admin)
router.delete('/admin/comments/:id', authMiddleware, (req, res) => {
  const comment = db.getById('comments', req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  db.remove('comments', req.params.id);
  res.json({ success: true });
});

module.exports = router;

