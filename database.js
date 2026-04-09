const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './data/8ora.json';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const defaultData = {
  users: [],
  posts: [],
  projects: [],
  comments: [],
  settings: [
    { key: 'site_title_tr', value: 'Bora Özaras — Yazılımcı' },
    { key: 'site_title_en', value: 'Bora Özaras — Developer' },
    { key: 'hero_subtitle_tr', value: 'Yazılım & Uygulama Geliştirme' },
    { key: 'hero_subtitle_en', value: 'Software & Application Development' },
    { key: 'about_tr', value: 'Merhaba! Ben Bora Özaras. Web ve mobil uygulama geliştirme alanında çalışan bir yazılımcıyım. Modern teknolojiler kullanarak kullanıcı deneyimini ön planda tutan projeler üretiyorum.' },
    { key: 'about_en', value: "Hi! I'm Bora Özaras. I'm a developer working in web and mobile application development. I create projects that prioritize user experience using modern technologies." },
    { key: 'email', value: '8oradev@gmail.com' },
    { key: 'phone', value: '+90 507 901 63 20' },
    { key: 'website', value: '8ora.com' },
    { key: 'github', value: 'https://github.com/8oraa' },
    { key: 'linkedin', value: 'https://linkedin.com/in/8oraa/' },
    { key: 'twitter', value: 'https://x.com/8oraa' },
    { key: 'instagram', value: 'https://www.instagram.com/8oraa' }
  ],
  messages: [],
  categories: [
    { id: 1, type: 'post', slug: 'teknoloji', name_tr: 'Teknoloji', name_en: 'Technology' },
    { id: 2, type: 'post', slug: 'gelistirme', name_tr: 'Geliştirme', name_en: 'Development' },
    { id: 3, type: 'post', slug: 'mobil', name_tr: 'Mobil', name_en: 'Mobile' },
    { id: 4, type: 'post', slug: 'genel', name_tr: 'Genel', name_en: 'General' },
    { id: 5, type: 'project', slug: 'web', name_tr: 'Web', name_en: 'Web' },
    { id: 6, type: 'project', slug: 'mobil-proje', name_tr: 'Mobil', name_en: 'Mobile' },
    { id: 7, type: 'project', slug: 'api', name_tr: 'API', name_en: 'API' }
  ]
};


let data = { ...defaultData };

function cleanupTrash() {
  const now = new Date();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let changed = false;

  ['posts', 'projects', 'comments', 'messages'].forEach(table => {
    if (!data[table]) return;
    for (let i = data[table].length - 1; i >= 0; i--) {
      const item = data[table][i];
      if (item.deleted_at) {
        const deletedDate = new Date(item.deleted_at);
        const daysDiff = (now - deletedDate) / ONE_DAY;
        if (daysDiff >= 60) {
          if (item.cover_image) {
            const imgPath = path.join(__dirname, 'public', item.cover_image);
            if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch(e){}
          }
          data[table].splice(i, 1);
          changed = true;
        }
      }
    }
  });
  if (changed) save();
}

function load() {
  if (fs.existsSync(dbPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      data = { ...defaultData, ...fileData };
    } catch (e) { console.error('DB parse error:', e); }
  } else {
    // Seed admin
    const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '8ora2026', 10);
    data.users.push({ id: 1, username: 'bora', password_hash: adminHash, created_at: new Date().toISOString() });
    
    // Seed demo projects
    data.projects = [
      { id: 1, title_tr: 'E-Ticaret Platformu', title_en: 'E-Commerce Platform', description_tr: 'React ve Node.js ile geliştirilmiş modern bir e-ticaret platformu.', description_en: 'A modern e-commerce platform built with React and Node.js.', long_desc_tr: '', long_desc_en: '', technologies: '["React", "Node.js", "PostgreSQL", "Stripe"]', project_url: 'https://demo.8ora.com', github_url: 'https://github.com/8oraa', cover_image: null, category: 'web', featured: 1, order_index: 1, created_at: new Date().toISOString() },
      { id: 2, title_tr: 'Fitness Takip Uygulaması', title_en: 'Fitness Tracking App', description_tr: 'iOS ve Android için kişisel fitness takip uygulaması.', description_en: 'Personal fitness tracking app for iOS and Android.', long_desc_tr: '', long_desc_en: '', technologies: '["React Native", "Firebase"]', project_url: null, github_url: null, cover_image: null, category: 'mobil', featured: 1, order_index: 2, created_at: new Date().toISOString() }
    ];

    // Seed demo posts
    data.posts = [
      { id: 1, slug: 'modern-web-gelistirme-trendleri-2026', title_tr: 'Modern Web Geliştirme Trendleri 2026', title_en: '2026 Modern Web Development Trends', excerpt_tr: 'Bu yıl öne çıkan teknolojiler.', excerpt_en: 'Technologies standing out this year.', content_tr: '## Giriş\n\n2026 yılı heyecan verici.', content_en: '## Intro\n\n2026 is exciting.', category: 'teknoloji', cover_image: null, published: 1, read_time: 7, views: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];

    save();
  }
  cleanupTrash();
}

function save() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

load();

module.exports = {
  data,
  save,
  // Helper methods
  getAll: (table, includeDeleted = false) => includeDeleted ? (data[table] || []) : (data[table] || []).filter(x => !x.deleted_at),
  getById: (table, id, includeDeleted = false) => {
    const list = includeDeleted ? (data[table] || []) : (data[table] || []).filter(x => !x.deleted_at);
    return list.find(x => x.id === Number(id));
  },
  insert: (table, record) => {
    const id = (data[table] && data[table].length > 0) ? Math.max(...data[table].map(x => x.id)) + 1 : 1;
    const newRecord = { id, ...record, created_at: new Date().toISOString() };
    if (!data[table]) data[table] = [];
    data[table].push(newRecord);
    save();
    return id;
  },
  update: (table, id, updates) => {
    if (!data[table]) return false;
    const idx = data[table].findIndex(x => x.id === Number(id));
    if (idx !== -1) {
      data[table][idx] = { ...data[table][idx], ...updates, updated_at: new Date().toISOString() };
      save();
      return true;
    }
    return false;
  },
  remove: (table, id) => {
    if (!data[table]) return false;
    const idx = data[table].findIndex(x => x.id === Number(id));
    if (idx !== -1) {
      data[table][idx].deleted_at = new Date().toISOString();
      save();
      return true;
    }
    return false;
  },
  hardRemove: (table, id) => {
    if (!data[table]) return false;
    const idx = data[table].findIndex(x => x.id === Number(id));
    if (idx !== -1) {
      const item = data[table][idx];
      if (item.cover_image) {
        const imgPath = path.join(__dirname, 'public', item.cover_image);
        if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch(e){}
      }
      data[table].splice(idx, 1);
      save();
      return true;
    }
    return false;
  },
  restore: (table, id) => {
    if (!data[table]) return false;
    const idx = data[table].findIndex(x => x.id === Number(id));
    if (idx !== -1 && data[table][idx].deleted_at) {
      delete data[table][idx].deleted_at;
      save();
      return true;
    }
    return false;
  }
};
