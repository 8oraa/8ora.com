const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/projects';
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

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  let { category, featured } = req.query;
  let projects = [...db.getAll('projects')];

  if (category && category !== 'all') {
    projects = projects.filter(p => p.category === category);
  }
  if (featured === 'true') {
    projects = projects.filter(p => !!p.featured);
  }

  projects.sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
  res.json(projects);
});

router.get('/:id', (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.post('/', authMiddleware, upload.single('cover_image'), (req, res) => {
  const { title_tr, title_en, description_tr, description_en, long_desc_tr, long_desc_en, technologies, project_url, github_url, category, featured, order_index } = req.body;

  if (!title_tr || !title_en || !description_tr || !description_en) {
    return res.status(400).json({ error: 'Title and description required' });
  }

  const cover_image = req.file ? '/uploads/projects/' + req.file.filename : null;
  let techStr = technologies;
  if (typeof technologies !== 'string') techStr = JSON.stringify(technologies);

  const id = db.insert('projects', {
    title_tr, title_en, description_tr, description_en,
    long_desc_tr: long_desc_tr || '', long_desc_en: long_desc_en || '',
    technologies: techStr,
    project_url: project_url || null, github_url: github_url || null,
    category: category || 'web', cover_image,
    featured: featured === 'true' || featured === true,
    order_index: Number(order_index) || 0
  });

  res.json({ id });
});

router.put('/:id', authMiddleware, upload.single('cover_image'), (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  console.log('PUT Project body:', req.body, 'file:', req.file);

  const body = req.body;
  let cover_image = project.cover_image;

  if (req.file) {
    cover_image = '/uploads/projects/' + req.file.filename;
  } else if (body.delete_cover_image === 'true') {
    if (project.cover_image) {
      const imgPath = './public' + project.cover_image;
      if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch(e){}
    }
    cover_image = null;
  }

  let techStr = body.technologies ? (typeof body.technologies === 'string' ? body.technologies : JSON.stringify(body.technologies)) : project.technologies;

  db.update('projects', req.params.id, {
    title_tr: body.title_tr || project.title_tr,
    title_en: body.title_en || project.title_en,
    description_tr: body.description_tr || project.description_tr,
    description_en: body.description_en || project.description_en,
    long_desc_tr: body.long_desc_tr ?? project.long_desc_tr,
    long_desc_en: body.long_desc_en ?? project.long_desc_en,
    technologies: techStr,
    project_url: body.project_url ?? project.project_url,
    github_url: body.github_url ?? project.github_url,
    category: body.category || project.category,
    cover_image,
    featured: body.featured === 'true' || body.featured === true,
    order_index: Number(body.order_index) ?? project.order_index
  });

  res.json({ success: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  db.remove('projects', req.params.id);
  res.json({ success: true });
});

module.exports = router;
