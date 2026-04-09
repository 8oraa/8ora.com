require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Security & Middleware imports
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Basic Rate Limiter (applies to all requests)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict Rate Limiter for Auth Routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // Increased for development
  handler: (req, res) => {
    res.status(429).json({ error: 'Çok fazla giriş denemesi. Lütfen bir saat sonra tekrar deneyin.' });
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Simplified for compatibility, but adds basic protections like XSS filter, noSniff
}));
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/trash', require('./routes/trash'));
app.use('/api/categories', require('./routes/categories'));

// Serve SPA pages
const pages = ['/', '/projects', '/blog', '/contact'];
pages.forEach(p => {
  app.get(p, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', p === '/' ? 'index.html' : p.slice(1) + '.html'));
  });
});

app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog-post.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 8ora.com server running at http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Login: bora / 8ora2026\n`);
});
