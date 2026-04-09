// =========================================
// admin.js — Full Admin Dashboard Logic
// =========================================

const API = '/api';
let token = localStorage.getItem('8ora_admin_token');
let currentSection = 'dashboard';
let editingPost = null;
let editingProject = null;

// Auth check
if (!token) window.location.href = '/admin';

const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

async function apiFetch(url, opts = {}) {
  try {
    opts.headers = { ...headers(), ...opts.headers };
    if (opts.body instanceof FormData) delete opts.headers['Content-Type'];
    const res = await fetch(API + url, opts);
    if (res.status === 401 || res.status === 403) { 
      console.warn('Auth error, logging out...');
      logout(); 
      return null; 
    }
    if (res.status === 429) {
      showAdminToast('Çok fazla istek gönderildi. Lütfen bekleyin.', 'error');
      return res;
    }
    return res;
  } catch (err) {
    console.error('API Fetch Error:', err);
    showAdminToast('Sunucu bağlantı hatası', 'error');
    return null;
  }
}

function logout() {
  localStorage.removeItem('8ora_admin_token');
  localStorage.removeItem('8ora_admin_user');
  window.location.href = '/admin';
}

function removeImageSelect(previewId, inputId) {
  const preview = document.getElementById(previewId);
  const input = document.getElementById(inputId);
  if (preview) preview.innerHTML = '';
  if (input) input.value = '';
  
  // Set delete flag
  const type = inputId.split('-')[0]; // 'pf' or 'prj'
  const deleteInput = document.getElementById(type + '-delete-cover');
  if (deleteInput) deleteInput.value = 'true';
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
  await verifyToken();
  initSidebar();
  loadDashboard();
  initDrawerClose();
  loadCommentsBadge();
});

async function verifyToken() {
  const res = await apiFetch('/auth/verify');
  if (!res || !res.ok) logout();
  const data = await res?.json();
  if (data?.username) {
    document.getElementById('admin-username').textContent = data.username;
    document.getElementById('sidebar-avatar-text').textContent = data.username.charAt(0).toUpperCase();
  }
}

// ─── Sidebar Navigation ───
function initSidebar() {
  document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      navigateTo(section);
    });
  });

  // Mobile toggle
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }
}

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(i =>
    i.classList.toggle('active', i.dataset.section === section)
  );

  const titles = {
    dashboard: 'Dashboard', posts: 'Blog Yazıları', projects: 'Projeler',
    messages: 'Mesajlar', comments: 'Yorumlar', trash: 'Çöp Kutusu', settings: 'Ayarlar'
  };
  document.getElementById('admin-page-title').textContent = titles[section] || section;

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'posts': loadPosts(); break;
    case 'projects': loadProjects(); break;
    case 'messages': loadMessages(); break;
    case 'comments': loadAdminComments(); break;
    case 'trash': loadTrash(); break;
    case 'settings': loadSettings(); break;
  }
}

// ─── Dashboard ───
async function loadDashboard() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="stats-grid" id="stats-grid"></div><div class="grid-2" style="gap:1.5rem;margin-top:1.5rem"><div id="recent-posts-panel"></div><div id="recent-messages-panel"></div></div>`;

  // Load stats
  const [postsRes, projectsRes, msgRes] = await Promise.all([
    apiFetch('/posts/all'), apiFetch('/projects'), apiFetch('/settings/messages')
  ]);

  const posts = await postsRes?.json() || [];
  const projects = await projectsRes?.json() || [];
  const messages = await msgRes?.json() || [];
  const unread = messages.filter(m => !m.read).length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon">✍️</div><div class="stat-label">Yayınlanan Yazı</div><div class="stat-value">${posts.filter(p=>p.published).length}</div></div>
    <div class="stat-card"><div class="stat-icon">🚀</div><div class="stat-label">Toplam Proje</div><div class="stat-value">${projects.length}</div></div>
    <div class="stat-card"><div class="stat-icon">📩</div><div class="stat-label">Yeni Mesaj</div><div class="stat-value">${unread}</div></div>
    <div class="stat-card"><div class="stat-icon">👁</div><div class="stat-label">Toplam Görüntülenme</div><div class="stat-value">${posts.reduce((s,p)=>s+(p.views||0),0)}</div></div>
  `;

  document.getElementById('recent-posts-panel').innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header"><span class="admin-panel-title">Son Yazılar</span><button class="btn btn-outline" style="padding:0.4rem 0.9rem;font-size:0.78rem" onclick="navigateTo('posts')">Tümü →</button></div>
      <table class="admin-table"><thead><tr><th>Başlık</th><th>Durum</th><th>Tarih</th></tr></thead>
      <tbody>${posts.slice(0,5).map(p=>`<tr>
        <td class="td-title">${p.title_tr}</td>
        <td><span class="status-badge ${p.published?'status-published':'status-draft'}">${p.published?'Yayında':'Taslak'}</span></td>
        <td class="td-muted">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
      </tr>`).join('')}</tbody></table>
    </div>`;

  document.getElementById('recent-messages-panel').innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header"><span class="admin-panel-title">Son Mesajlar</span><button class="btn btn-outline" style="padding:0.4rem 0.9rem;font-size:0.78rem" onclick="navigateTo('messages')">Tümü →</button></div>
      ${messages.slice(0,5).map(m=>`
        <div class="message-item" onclick="navigateTo('messages')">
          <div class="message-dot ${m.read?'read':''}"></div>
          <div style="flex:1;min-width:0">
            <div class="message-subject">${m.name} — ${m.subject||'(Konu yok)'}</div>
            <div class="message-preview">${m.message}</div>
          </div>
          <div class="message-meta">${new Date(m.created_at).toLocaleDateString('tr-TR')}</div>
        </div>`).join('') || '<div style="padding:1.5rem;text-align:center;color:var(--text-muted)">Henüz mesaj yok</div>'}
    </div>`;
}

// ─── Posts ───
async function loadPosts() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-panel"><div class="admin-panel-header"><span class="admin-panel-title">Blog Yazıları</span><button class="btn btn-primary" onclick="openPostDrawer()">+ Yeni Yazı</button></div><div id="posts-table-wrap"><div style="padding:2rem;text-align:center;color:var(--text-muted)">Yükleniyor...</div></div></div>`;

  const res = await apiFetch('/posts/all');
  const posts = await res?.json() || [];

  document.getElementById('posts-table-wrap').innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Başlık (TR)</th><th>Kategori</th><th>Görüntülenme</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
      <tbody>${posts.map(p=>`<tr>
        <td class="td-title">${p.title_tr}</td>
        <td class="td-muted">${p.category||'-'}</td>
        <td class="td-muted">${p.views||0}</td>
        <td><span class="status-badge ${p.published?'status-published':'status-draft'}">${p.published?'Yayında':'Taslak'}</span></td>
        <td class="td-muted">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
        <td><div class="action-btns">
          <button class="action-btn success" onclick="window.open('/blog/${p.slug}', '_blank')" title="Siteye Git">👁️</button>
          <button class="action-btn" onclick="openPostDrawer(${p.id})" title="Düzenle">✏️</button>
          <button class="action-btn" onclick="togglePublish(${p.id},${p.published})" title="${p.published?'Yayından Kaldır':'Yayınla'}">${p.published?'🔴':'🟢'}</button>
          <button class="action-btn danger" onclick="deletePost(${p.id})" title="Sil">🗑️</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">Henüz yazı yok</td></tr>'}</tbody>
    </table>`;
}

async function openPostDrawer(id = null) {
  editingPost = id;
  const drawer = document.getElementById('post-drawer');
  document.getElementById('post-drawer-title').textContent = id ? 'Yazıyı Düzenle' : 'Yeni Yazı';
  document.getElementById('post-form').reset();
  document.getElementById('post-cover-preview').innerHTML = '';
  
  // Load categories and populate select
  const catRes = await apiFetch('/categories?type=post');
  const categories = await catRes?.json() || [];
  const catSelect = document.getElementById('pf-category');
  catSelect.innerHTML = categories.map(c => `<option value="${c.slug}">${c.name_tr}</option>`).join('');

  // Reset SEO section
  document.getElementById('pf-seo-title').value = '';
  document.getElementById('pf-seo-description').value = '';
  document.getElementById('pf-seo-keywords').value = '';
  updateSeoPreview();

  if (id) {
    const r = await apiFetch('/posts/all');
    const posts = await r?.json() || [];
    const p = posts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pf-title-tr').value = p.title_tr || '';
    document.getElementById('pf-title-en').value = p.title_en || '';
    document.getElementById('pf-excerpt-tr').value = p.excerpt_tr || '';
    document.getElementById('pf-excerpt-en').value = p.excerpt_en || '';
    document.getElementById('pf-content-tr').value = p.content_tr || '';
    document.getElementById('pf-content-en').value = p.content_en || '';
    document.getElementById('pf-category').value = p.category || '';
    document.getElementById('pf-read-time').value = p.read_time || 5;
    document.getElementById('pf-delete-cover').value = 'false';
    // Fill SEO fields
    document.getElementById('pf-seo-title').value = p.seo_title || '';
    document.getElementById('pf-seo-description').value = p.seo_description || '';
    document.getElementById('pf-seo-keywords').value = p.seo_keywords || '';
    // Update preview with post data
    if (typeof updateSeoPreview === 'function') updateSeoPreview();
    if (p.cover_image) {
      document.getElementById('post-cover-preview').innerHTML = `
        <div style="position:relative">
          <img src="${p.cover_image}" style="width:100%;border-radius:8px;max-height:150px;object-fit:cover;margin-top:0.75rem">
          <button type="button" class="upload-preview-remove" onclick="removeImageSelect('post-cover-preview','pf-cover-img')" title="Resmi Kaldır">✕</button>
        </div>`;
    }
  }
  openDrawer('post-drawer');
}

async function savePost(publishStatus) {
  const form = document.getElementById('post-form');
  const fd = new FormData();
  fd.append('title_tr', document.getElementById('pf-title-tr').value);
  fd.append('title_en', document.getElementById('pf-title-en').value);
  fd.append('excerpt_tr', document.getElementById('pf-excerpt-tr').value);
  fd.append('excerpt_en', document.getElementById('pf-excerpt-en').value);
  fd.append('content_tr', document.getElementById('pf-content-tr').value);
  fd.append('content_en', document.getElementById('pf-content-en').value);
  fd.append('category', document.getElementById('pf-category').value);
  fd.append('read_time', document.getElementById('pf-read-time').value);
  // SEO fields
  fd.append('seo_title', document.getElementById('pf-seo-title').value);
  fd.append('seo_description', document.getElementById('pf-seo-description').value);
  fd.append('seo_keywords', document.getElementById('pf-seo-keywords').value);

  const finalPublish = publishStatus !== undefined ? publishStatus : (document.getElementById('pf-published').value === 'true');
  fd.append('published', finalPublish);
  const img = document.getElementById('pf-cover-img').files[0];
  if (img) fd.append('cover_image', img);
  fd.append('delete_cover_image', document.getElementById('pf-delete-cover').value);

  const url = editingPost ? `/posts/${editingPost}` : '/posts';
  const method = editingPost ? 'PUT' : 'POST';
  const res = await apiFetch(url, { method, body: fd });
  if (res?.ok) { closeDrawer('post-drawer'); loadPosts(); showAdminToast(finalPublish ? 'Yayınlandı ✓' : 'Taslak kaydedildi ✓'); }
  else {
    const data = await res?.json().catch(() => ({}));
    showAdminToast(data?.error || 'Hata oluştu', 'error');
  }
}

async function togglePublish(id, current) {
  if (!confirm(current ? 'Yayından kaldırılsın mı?' : 'Yayınlansın mı?')) return;
  const res = await apiFetch('/posts/all').then(r => r?.json()).then(posts => {
    const p = posts.find(x => x.id === id);
    if (!p) return null;
    const fd = new FormData();
    Object.entries(p).forEach(([k,v]) => { if (v != null) fd.append(k, v); });
    fd.set('published', current ? 'false' : 'true');
    return apiFetch(`/posts/${id}`, { method: 'PUT', body: fd });
  });
  if (res?.ok) { loadPosts(); showAdminToast(current ? 'Yayından kaldırıldı' : 'Yayınlandı ✓'); }
}

async function deletePost(id) {
  console.log('deletePost called for ID:', id);
  if (!confirm('Bu yazı silinsin mi?')) return;
  const res = await apiFetch(`/posts/${id}`, { method: 'DELETE' });
  if (res?.ok) { 
    loadPosts(); 
    showAdminToast('Yazı silindi ✓'); 
  } else {
    showAdminToast('Silme işlemi başarısız', 'error');
  }
}

// ─── Projects ───
async function loadProjects() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-panel"><div class="admin-panel-header"><span class="admin-panel-title">Projeler</span><button class="btn btn-primary" onclick="openProjectDrawer()">+ Yeni Proje</button></div><div id="projects-table-wrap"><div style="padding:2rem;text-align:center;color:var(--text-muted)">Yükleniyor...</div></div></div>`;

  const res = await apiFetch('/projects');
  const projects = await res?.json() || [];

  document.getElementById('projects-table-wrap').innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Proje Adı (TR)</th><th>Kategori</th><th>Teknolojiler</th><th>Öne Çıkan</th><th>İşlem</th></tr></thead>
      <tbody>${projects.map(p=>`<tr>
        <td class="td-title">${p.title_tr}</td>
        <td class="td-muted">${p.category||'-'}</td>
        <td class="td-muted">${JSON.parse(p.technologies||'[]').slice(0,3).join(', ')}</td>
        <td><span class="status-badge ${p.featured?'status-published':'status-draft'}">${p.featured?'Öne Çıkan':'Normal'}</span></td>
        <td><div class="action-btns">
          <button class="action-btn success" onclick="window.open('/projects', '_blank')" title="Siteye Git">👁️</button>
          <button class="action-btn" onclick="openProjectDrawer(${p.id})" title="Düzenle">✏️</button>
          <button class="action-btn danger" onclick="deleteProject(${p.id})" title="Sil">🗑️</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">Henüz proje yok</td></tr>'}</tbody>
    </table>`;
}

async function openProjectDrawer(id = null) {
  editingProject = id;
  document.getElementById('proj-drawer-title').textContent = id ? 'Projeyi Düzenle' : 'Yeni Proje';
  document.getElementById('proj-form').reset();
  document.getElementById('proj-cover-preview').innerHTML = '';
  document.getElementById('proj-tech-chips').innerHTML = '';
  currentTechs = [];

  // Load categories and populate select
  const catRes = await apiFetch('/categories?type=project');
  const categories = await catRes?.json() || [];
  const catSelect = document.getElementById('prj-category');
  catSelect.innerHTML = categories.map(c => `<option value="${c.slug}">${c.name_tr}</option>`).join('');

  if (id) {
    const res = await apiFetch(`/projects/${id}`);
    const p = await res?.json();
    if (!p) return;
    document.getElementById('prj-title-tr').value = p.title_tr || '';
    document.getElementById('prj-title-en').value = p.title_en || '';
    document.getElementById('prj-desc-tr').value = p.description_tr || '';
    document.getElementById('prj-desc-en').value = p.description_en || '';
    document.getElementById('prj-long-tr').value = p.long_desc_tr || '';
    document.getElementById('prj-long-en').value = p.long_desc_en || '';
    document.getElementById('prj-url').value = p.project_url || '';
    document.getElementById('prj-github').value = p.github_url || '';
    document.getElementById('prj-category').value = p.category || '';
    document.getElementById('prj-featured').checked = !!p.featured;
    document.getElementById('prj-order').value = p.order_index || 0;
    currentTechs = JSON.parse(p.technologies || '[]');
    document.getElementById('prj-delete-cover').value = 'false';
    renderTechChips();
    if (p.cover_image) {
      document.getElementById('proj-cover-preview').innerHTML = `
        <div style="position:relative">
          <img src="${p.cover_image}" style="width:100%;border-radius:8px;max-height:150px;object-fit:cover;margin-top:0.75rem">
          <button type="button" class="upload-preview-remove" onclick="removeImageSelect('proj-cover-preview','prj-cover-img')" title="Resmi Kaldır">✕</button>
        </div>`;
    }
  }
  openDrawer('proj-drawer');
}

let currentTechs = [];
function addTech(e) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.trim().replace(/,$/, '');
  if (val && !currentTechs.includes(val)) { currentTechs.push(val); renderTechChips(); }
  e.target.value = '';
}
function removeTech(i) { currentTechs.splice(i, 1); renderTechChips(); }
function renderTechChips() {
  document.getElementById('proj-tech-chips').innerHTML = currentTechs.map((t,i) =>
    `<span class="tech-chip">${t}<span class="tech-chip-remove" onclick="removeTech(${i})">✕</span></span>`
  ).join('');
}

async function saveProject() {
  const fd = new FormData();
  fd.append('title_tr', document.getElementById('prj-title-tr').value);
  fd.append('title_en', document.getElementById('prj-title-en').value);
  fd.append('description_tr', document.getElementById('prj-desc-tr').value);
  fd.append('description_en', document.getElementById('prj-desc-en').value);
  fd.append('long_desc_tr', document.getElementById('prj-long-tr').value);
  fd.append('long_desc_en', document.getElementById('prj-long-en').value);
  fd.append('project_url', document.getElementById('prj-url').value);
  fd.append('github_url', document.getElementById('prj-github').value);
  fd.append('category', document.getElementById('prj-category').value);
  fd.append('featured', document.getElementById('prj-featured').checked);
  fd.append('order_index', document.getElementById('prj-order').value);
  fd.append('technologies', JSON.stringify(currentTechs));
  const img = document.getElementById('prj-cover-img').files[0];
  if (img) fd.append('cover_image', img);
  fd.append('delete_cover_image', document.getElementById('prj-delete-cover').value);

  const url = editingProject ? `/projects/${editingProject}` : '/projects';
  const method = editingProject ? 'PUT' : 'POST';
  const res = await apiFetch(url, { method, body: fd });
  if (res?.ok) { closeDrawer('proj-drawer'); loadProjects(); showAdminToast('Proje kaydedildi ✓'); }
  else showAdminToast('Hata oluştu', 'error');
}

async function deleteProject(id) {
  console.log('deleteProject called for ID:', id);
  if (!confirm('Bu proje silinsin mi?')) return;
  const res = await apiFetch(`/projects/${id}`, { method: 'DELETE' });
  if (res?.ok) { 
    loadProjects(); 
    showAdminToast('Proje silindi ✓'); 
  } else {
    showAdminToast('Silme işlemi başarısız', 'error');
  }
}

// ─── Messages ───
async function loadMessages() {
  const content = document.getElementById('admin-content');
  const res = await apiFetch('/settings/messages');
  const messages = await res?.json() || [];

  content.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header"><span class="admin-panel-title">Gelen Mesajlar</span><span class="td-muted">${messages.filter(m=>!m.read).length} okunmamış</span></div>
      <div id="messages-list">
        ${messages.map(m=>`
          <div class="message-item" onclick="viewMessage(${m.id},'${escHtml(m.name)}','${escHtml(m.email)}','${escHtml(m.subject||'')}','${escHtml(m.message)}')">
            <div class="message-dot ${m.read?'read':''}"></div>
            <div style="flex:1;min-width:0">
              <div class="message-subject">${m.name} <span style="color:var(--text-faint);font-size:0.8rem">&lt;${m.email}&gt;</span></div>
              <div class="message-preview">${m.subject ? m.subject + ' — ' : ''}${m.message}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;flex-shrink:0">
              <div class="message-meta">${new Date(m.created_at).toLocaleDateString('tr-TR')}</div>
              <button class="action-btn danger" onclick="event.stopPropagation();deleteMessage(${m.id})" title="Sil">🗑️</button>
            </div>
          </div>`).join('') || '<div style="padding:3rem;text-align:center;color:var(--text-muted)">📭 Henüz mesaj yok</div>'}
      </div>
    </div>`;
}

function escHtml(s) {
  return (s||'').replace(/'/g,"&#39;").replace(/"/g,'&quot;');
}

async function viewMessage(id, name, email, subject, message) {
  await apiFetch(`/settings/messages/${id}/read`, { method: 'PUT' });
  const el = document.querySelector(`.message-item:nth-of-type(${id})`);
  alert(`Gönderen: ${name} <${email}>\nKonu: ${subject||'(yok)'}\n\n${message}`);
  loadMessages();
}

async function deleteMessage(id) {
  console.log('deleteMessage called for ID:', id);
  if (!confirm('Mesaj silinsin mi?')) return;
  const res = await apiFetch(`/settings/messages/${id}`, { method: 'DELETE' });
  if (res?.ok) { 
    loadMessages(); 
    showAdminToast('Mesaj silindi ✓'); 
  } else {
    showAdminToast('Silme işlemi başarısız', 'error');
  }
}

// ─── Settings ───
async function loadSettings() {
  const content = document.getElementById('admin-content');
  const res = await apiFetch('/settings');
  const catRes = await apiFetch('/categories');
  const settings = await res?.json() || {};
  const categories = await catRes?.json() || [];

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="admin-panel">
        <div class="admin-panel-header"><span class="admin-panel-title">Site Ayarları</span></div>
        <div class="admin-panel-body">
          <form id="settings-form">
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" name="email" value="${settings.email||''}"></div>
            <div class="form-group"><label class="form-label">Telefon</label><input class="form-input" name="phone" value="${settings.phone||''}"></div>
            <div class="form-group"><label class="form-label">GitHub</label><input class="form-input" name="github" value="${settings.github||''}"></div>
            <div class="form-group"><label class="form-label">LinkedIn</label><input class="form-input" name="linkedin" value="${settings.linkedin||''}"></div>
            <div class="form-group"><label class="form-label">Twitter/X</label><input class="form-input" name="twitter" value="${settings.twitter||''}"></div>
            <div class="form-group"><label class="form-label">Instagram</label><input class="form-input" name="instagram" value="${settings.instagram||''}"></div>
            <div class="form-group"><label class="form-label">Hakkımda (TR)</label><textarea class="form-textarea" name="about_tr">${settings.about_tr||''}</textarea></div>
            <div class="form-group"><label class="form-label">About (EN)</label><textarea class="form-textarea" name="about_en">${settings.about_en||''}</textarea></div>
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </form>
        </div>
      </div>
      <div class="admin-panel">
        <div class="admin-panel-header"><span class="admin-panel-title">Şifre Değiştir</span></div>
        <div class="admin-panel-body">
          <form id="password-form">
            <div class="form-group"><label class="form-label">Mevcut Şifre</label><input class="form-input" type="password" id="cur-pw" required></div>
            <div class="form-group"><label class="form-label">Yeni Şifre</label><input class="form-input" type="password" id="new-pw" required minlength="6"></div>
            <div class="form-group"><label class="form-label">Yeni Şifre Tekrar</label><input class="form-input" type="password" id="new-pw2" required></div>
            <button type="submit" class="btn btn-primary">Şifreyi Değiştir</button>
          </form>
        </div>
      </div>
      <div class="admin-panel" style="grid-column: 1 / -1">
        <div class="admin-panel-header"><span class="admin-panel-title">Kategori Yönetimi</span></div>
        <div class="admin-panel-body" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
          <div>
            <h4 style="margin-bottom:1rem;color:var(--white);">Yeni Kategori Ekle</h4>
            <form id="category-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tür</label>
                  <select id="cat-type" class="form-select" required>
                    <option value="post">Blog Yazısı</option>
                    <option value="project">Proje</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Kısa URL (Slug)</label>
                  <input class="form-input" id="cat-slug" required placeholder="ornek-kategori">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ad (Türkçe)</label>
                  <input class="form-input" id="cat-tr" required placeholder="Örnek Kategori">
                </div>
                <div class="form-group">
                  <label class="form-label">Ad (İngilizce)</label>
                  <input class="form-input" id="cat-en" required placeholder="Example Category">
                </div>
              </div>
              <button type="submit" class="btn btn-primary">Kategori Ekle</button>
            </form>
          </div>
          <div>
            <h4 style="margin-bottom:1rem;color:var(--white);">Mevcut Kategoriler</h4>
            <div id="categories-list" style="max-height: 300px; overflow-y: auto;">
              ${categories.map(c => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:0.5rem">
                  <div>
                    <span class="status-badge" style="background:var(--gray-600);color:var(--white);font-size:0.65rem">${c.type.toUpperCase()}</span>
                    <strong style="margin-left:0.5rem">${c.name_tr}</strong> <span style="color:var(--text-faint);font-size:0.85rem">/ ${c.name_en}</span>
                  </div>
                  <button class="action-btn danger" onclick="deleteCategory(${c.id})" title="Sil">🗑️</button>
                </div>
              `).join('') || '<div style="color:var(--text-muted)">Hiç kategori yok.</div>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const obj = Object.fromEntries(fd.entries());
      const res = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(obj) });
      if (res?.ok) showAdminToast('Ayarlar kaydedildi ✓');
      else showAdminToast('Hata', 'error');
    });
  }

  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        type: document.getElementById('cat-type').value,
        slug: document.getElementById('cat-slug').value,
        name_tr: document.getElementById('cat-tr').value,
        name_en: document.getElementById('cat-en').value
      };
      const res = await apiFetch('/categories', { method: 'POST', body: JSON.stringify(payload) });
      if (res?.ok) { showAdminToast('Kategori eklendi'); loadSettings(); }
      else showAdminToast('Kategori eklenemedi', 'error');
    };
  }

  const pwForm = document.getElementById('password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async e => {
      e.preventDefault();
      const np = document.getElementById('new-pw').value;
      const np2 = document.getElementById('new-pw2').value;
      if (np !== np2) { showAdminToast('Şifreler eşleşmiyor', 'error'); return; }
      const res = await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: document.getElementById('cur-pw').value, newPassword: np }) });
      if (res?.ok) { showAdminToast('Şifre değiştirildi ✓'); e.target.reset(); }
      else showAdminToast('Mevcut şifre hatalı', 'error');
    });
  }
}


async function deleteCategory(id) {
  if (!confirm('Kategoriyi silmek istediğinize emin misiniz?')) return;
  const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
  if (res?.ok) { showAdminToast('Kategori silindi'); loadSettings(); }
  else showAdminToast('Silinemedi', 'error');
}

// ─── Drawer Helpers ───
function openDrawer(id) {
  document.getElementById(id + '-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer(id) {
  document.getElementById(id + '-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function initDrawerClose() {
  document.querySelectorAll('.admin-drawer-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(overlay.id.replace('-overlay', '')); });
  });
}

// ─── Toast ───
function showAdminToast(message, type = 'success') {
  if (typeof showToast === 'function') { showToast(message, type); return; }
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type==='success'?'✓':'✕'}</span><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Admin Comments ───
async function loadAdminComments() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <span class="admin-panel-title">Yorumlar</span>
        <span class="td-muted" id="pending-comments-count"></span>
      </div>
      <div id="comments-table-wrap"><div style="padding:2rem;text-align:center;color:var(--text-muted)">Yükleniyor...</div></div>
    </div>`;

  const res = await apiFetch('/posts/admin/comments');
  if (!res || !res.ok) {
    document.getElementById('comments-table-wrap').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Yorumlar yüklenemedi.</div>';
    return;
  }
  const comments = await res.json();

  const pending = comments.filter(c => !c.approved).length;
  const pendingEl = document.getElementById('pending-comments-count');
  if (pendingEl) pendingEl.textContent = pending > 0 ? `${pending} onay bekliyor` : 'Tüm yorumlar onaylı';

  // Update sidebar badge
  const badge = document.getElementById('sidebar-comments-badge');
  if (badge) {
    if (pending > 0) { badge.textContent = pending; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';
  }

  if (comments.length === 0) {
    document.getElementById('comments-table-wrap').innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-muted)">💬 Henüz hiç yorum yok.</div>';
    return;
  }

  document.getElementById('comments-table-wrap').innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Yazar</th>
        <th>Yazı</th>
        <th>Yorum</th>
        <th>Tarih</th>
        <th>Durum</th>
        <th>İşlem</th>
      </tr></thead>
      <tbody>
        ${comments.map(c => `<tr>
          <td>
            <div class="td-title">${escHtml(c.author_name)}</div>
            ${c.author_email ? `<div class="td-muted" style="font-size:0.75rem">${escHtml(c.author_email)}</div>` : ''}
          </td>
          <td class="td-muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            <a href="/blog/${c.post_slug}" target="_blank" style="color:var(--text-muted);text-underline-offset:3px">${escHtml(c.post_title_tr || c.post_slug)}</a>
          </td>
          <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:0.875rem">${escHtml(c.content)}</td>
          <td class="td-muted">${new Date(c.created_at).toLocaleDateString('tr-TR')}</td>
          <td><span class="status-badge ${c.approved ? 'status-published' : 'status-draft'}">${c.approved ? '✓ Onaylı' : '⏳ Bekliyor'}</span></td>
          <td><div class="action-btns">
            ${!c.approved ? `<button class="action-btn success" onclick="approveComment(${c.id})" title="Onayla">✓</button>` : ''}
            <button class="action-btn danger" onclick="deleteAdminComment(${c.id})" title="Sil">🗑️</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function approveComment(id) {
  const res = await apiFetch(`/posts/admin/comments/${id}/approve`, { method: 'PUT' });
  if (res?.ok) { loadAdminComments(); showAdminToast('Yorum onaylandı ✓'); }
  else showAdminToast('Hata oluştu', 'error');
}

async function deleteAdminComment(id) {
  if (!confirm('Bu yorum silinsin mi?')) return;
  const res = await apiFetch(`/posts/admin/comments/${id}`, { method: 'DELETE' });
  if (res?.ok) { loadAdminComments(); showAdminToast('Yorum silindi ✓'); }
  else showAdminToast('Silme başarısız', 'error');
}

// Load comments badge count on init
async function loadCommentsBadge() {
  const res = await apiFetch('/posts/admin/comments');
  if (!res || !res.ok) return;
  const comments = await res.json();
  const pending = comments.filter(c => !c.approved).length;
  const badge = document.getElementById('sidebar-comments-badge');
  if (badge && pending > 0) { badge.textContent = pending; badge.style.display = 'inline-flex'; }
}

// ─── SEO Section Logic ───
function toggleSeoSection() {
  const body = document.getElementById('seo-section-body');
  const icon = document.getElementById('seo-toggle-icon');
  if (body) body.classList.toggle('open');
  if (icon) icon.classList.toggle('open');
  updateSeoPreview();
}

function updateSeoPreview() {
  const titleInput = document.getElementById('pf-seo-title');
  const descInput = document.getElementById('pf-seo-description');
  const mainTitleInput = document.getElementById('pf-title-tr');
  const titleCount = document.getElementById('seo-title-count');
  const descCount = document.getElementById('seo-desc-count');
  const previewTitle = document.getElementById('seo-preview-title');
  const previewDesc = document.getElementById('seo-preview-desc');

  if (!titleInput || !descInput) return;

  const tLen = titleInput.value.length;
  titleCount.textContent = `${tLen}/70`;
  titleCount.className = 'seo-char-count' + (tLen > 60 ? ' warn' : '') + (tLen >= 70 ? ' over' : '');

  const dLen = descInput.value.length;
  descCount.textContent = `${dLen}/160`;
  descCount.className = 'seo-char-count' + (dLen > 150 ? ' warn' : '') + (dLen >= 160 ? ' over' : '');

  const displayTitle = titleInput.value.trim() || mainTitleInput?.value.trim() || 'Yazı Başlığı';
  if (previewTitle) previewTitle.textContent = displayTitle;

  const displayDesc = descInput.value.trim() || 'Meta açıklama burada görünecek...';
  if (previewDesc) previewDesc.textContent = displayDesc;
}

// ─── Trash Section ───
async function loadTrash() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-panel">
      <div class="admin-panel-header"><span class="admin-panel-title">Çöp Kutusu</span><span class="td-muted">Silinen öğeler 60 gün sonra kalıcı olarak silinir.</span></div>
      <div id="trash-table-wrap"><div style="padding:2rem;text-align:center;color:var(--text-muted)">Yükleniyor...</div></div>
    </div>`;

  const res = await apiFetch('/trash'); // using our api fetch handler wrapper 
  if (!res || !res.ok) {
    document.getElementById('trash-table-wrap').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Hata oluştu.</div>';
    return;
  }
  const trashData = await res.json();

  const renderItems = (items, typeName, tableKey) => {
    if (!items || items.length === 0) return '';
    const now = new Date();
    return items.map(item => {
      let title = item.title_tr || item.name || (item.author_name ? 'Yorum: ' + item.author_name : 'Bilinmeyen Öğe');
      let created = new Date(item.deleted_at);
      let daysLeft = 60 - Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return `<tr>
        <td><span class="status-badge" style="background:#374151;color:#fff">${typeName}</span></td>
        <td class="td-title">${escHtml(title)}</td>
        <td class="td-muted">${created.toLocaleDateString('tr-TR')}</td>
        <td class="${daysLeft < 5 ? 'td-title' : 'td-muted'}" style="${daysLeft < 5 ? 'color:#f87171' : ''}">${daysLeft} gün kaldı</td>
        <td><div class="action-btns">
          <button class="action-btn success" onclick="restoreTrashItem('${tableKey}', ${item.id})" title="Geri Yükle">♻️</button>
          <button class="action-btn danger" onclick="hardDeleteTrashItem('${tableKey}', ${item.id})" title="Kalıcı Olarak Sil">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  };

  let rows = '';
  rows += renderItems(trashData.posts, 'Yazı', 'posts');
  rows += renderItems(trashData.projects, 'Proje', 'projects');
  rows += renderItems(trashData.comments, 'Yorum', 'comments');
  rows += renderItems(trashData.messages, 'Mesaj', 'messages');

  if (!rows) {
    document.getElementById('trash-table-wrap').innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-muted)">Çöp kutusu boş.</div>';
  } else {
    document.getElementById('trash-table-wrap').innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Tür</th><th>Öğe</th><th>Silinme Tarihi</th><th>Kalan Süre</th><th>İşlem</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
}

async function restoreTrashItem(table, id) {
  if (!confirm('Bu öğeyi geri yüklemek istediğinize emin misiniz?')) return;
  const res = await apiFetch(`/trash/${table}/${id}/restore`, { method: 'PUT' });
  if (res?.ok) { showAdminToast('Öğe geri yüklendi ✓'); loadTrash(); }
  else showAdminToast('Hata oluştu', 'error');
}

async function hardDeleteTrashItem(table, id) {
  if (!confirm('Bu öğeyi kalıcı olarak SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
  const res = await apiFetch(`/trash/${table}/${id}`, { method: 'DELETE' });
  if (res?.ok) { showAdminToast('Öğe kalıcı olarak silindi'); loadTrash(); }
  else showAdminToast('Silme başarısız', 'error');
}

