// =========================================
// projects.js — 3D Tilt, Magnetic, Modal
// =========================================

let allProjects = [];
let activeFilter = 'all';
let projectCategories = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();

  I18n.onLangChange(() => {
    renderProjectFilters();
    renderProjects(allProjects);
  });
});

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  try {
    // Fetch categories first
    const catRes = await fetch('/api/categories?type=project');
    projectCategories = await catRes.json();
    renderProjectFilters();

    const res = await fetch('/api/projects');
    allProjects = await res.json();
    renderProjects(allProjects);
    updateCount(allProjects.length);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Projeler yüklenemedi.</p></div>`;
  }
}

function renderProjectFilters() {
  const container = document.getElementById('project-filters');
  if (!container) return;
  const lang = I18n.getCurrent();

  const allLabel = lang === 'tr' ? 'Tümü' : 'All';
  let html = `<button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">${allLabel}</button>`;

  projectCategories.forEach(cat => {
    const name = lang === 'tr' ? cat.name_tr : cat.name_en;
    html += `<button class="filter-btn ${activeFilter === cat.slug ? 'active' : ''}" data-filter="${cat.slug}">${name}</button>`;
  });

  container.innerHTML = html;
  initFilterBar();
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const lang = I18n.getCurrent();

  const filtered = activeFilter === 'all'
    ? projects
    : projects.filter(p => p.category === activeFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗂️</div><p>${I18n.get('projects.no_projects')}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const techs = JSON.parse(p.technologies || '[]');
    const title = lang === 'tr' ? p.title_tr : p.title_en;
    const desc = lang === 'tr' ? p.description_tr : p.description_en;
    const coverChar = title.charAt(0).toUpperCase();

    return `
      <article class="project-card reveal reveal-delay-${(i % 4) + 1}" 
               data-id="${p.id}" data-aos-delay="${i * 80}"
               onclick="openModal(${p.id})">
        <div class="magnetic-highlight"></div>
        <div class="project-card-image">
          ${p.cover_image
            ? `<img src="${p.cover_image}" alt="${title}" loading="lazy">`
            : `<div class="project-card-cover">${coverChar}</div>`
          }
          <div class="project-category-tag">
            <span class="pill">${getCategoryLabel(p.category)}</span>
          </div>
          ${p.featured ? `<div class="featured-badge">${I18n.get('projects.featured')}</div>` : ''}
        </div>
        <div class="project-card-body">
          <h3 class="project-card-title glitch" data-text="${title}">${title}</h3>
          <p class="project-card-desc">${desc}</p>
          <div class="project-card-tech">
            ${techs.slice(0, 4).map(t => `<span class="tech-badge">${t}</span>`).join('')}
            ${techs.length > 4 ? `<span class="tech-badge">+${techs.length - 4}</span>` : ''}
          </div>
          <div class="project-card-footer">
            <div class="project-links" onclick="event.stopPropagation()">
              ${p.project_url ? `<a href="${p.project_url}" target="_blank" rel="noopener" class="project-link" title="${I18n.get('projects.view_project')}">${svgExternal()}</a>` : ''}
              ${p.github_url ? `<a href="${p.github_url}" target="_blank" rel="noopener" class="project-link" title="GitHub">${svgGithub()}</a>` : ''}
            </div>
            <button class="arrow-btn" onclick="event.stopPropagation(); openModal(${p.id})" title="${I18n.get('projects.view_details')}">↗</button>
          </div>
        </div>
      </article>`;
  }).join('');

  updateCount(filtered.length);

  // Re-observe reveals
  document.querySelectorAll('.project-card.reveal').forEach(el => {
    el.classList.remove('visible');
    revealObserver.observe(el);
  });

  // Attach effects
  requestAnimationFrame(() => {
    initTiltEffect();
    initMagneticHighlight();
  });
}

// ─── Reveal Observer (shared) ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

// ─── 3D Tilt Effect ───
function initTiltEffect() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -8;
      const rotY = ((x - cx) / cx) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(5px)`;
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });
  });
}

// ─── Magnetic Gradient Highlight ───
function initMagneticHighlight() {
  document.querySelectorAll('.project-card').forEach(card => {
    const highlight = card.querySelector('.magnetic-highlight');
    if (!highlight) return;

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      highlight.style.setProperty('--mx', x + '%');
      highlight.style.setProperty('--my', y + '%');
    });
  });
}

// ─── Filter Bar ───
function initFilterBar() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(allProjects);
    });
  });
}

function updateFilterLabels() {
  renderProjectFilters();
}

function getCategoryLabel(cat) {
  const lang = I18n.getCurrent();
  const category = projectCategories.find(c => c.slug === cat);
  if (category) return lang === 'tr' ? category.name_tr : category.name_en;
  return cat;
}

function updateCount(n) {
  const el = document.getElementById('project-count');
  if (el) el.textContent = `${n} ${I18n.getCurrent() === 'tr' ? 'proje' : 'project'}`;
}

// ─── Project Modal ───
let currentProject = null;

async function openModal(id) {
  const overlay = document.getElementById('project-modal');
  const modalEl = overlay?.querySelector('.project-modal');
  if (!overlay) return;

  const project = allProjects.find(p => p.id === id);
  if (!project) return;
  currentProject = project;

  const lang = I18n.getCurrent();
  const title = lang === 'tr' ? project.title_tr : project.title_en;
  const desc = lang === 'tr' ? (project.long_desc_tr || project.description_tr) : (project.long_desc_en || project.description_en);
  const techs = JSON.parse(project.technologies || '[]');
  const coverChar = title.charAt(0).toUpperCase();

  overlay.querySelector('.modal-image').innerHTML = project.cover_image
    ? `<img src="${project.cover_image}" alt="${title}">`
    : `<div class="project-card-cover" style="border-radius:var(--radius-xl) var(--radius-xl) 0 0">${coverChar}</div>`;

  overlay.querySelector('.modal-title').textContent = title;
  overlay.querySelector('.modal-desc').textContent = desc;
  overlay.querySelector('.modal-tech').innerHTML = techs.map(t => `<span class="tech-badge">${t}</span>`).join('');

  const linksEl = overlay.querySelector('.modal-links');
  linksEl.innerHTML = '';
  if (project.project_url) linksEl.innerHTML += `<a href="${project.project_url}" target="_blank" class="btn btn-primary">${svgExternal()} ${I18n.get('projects.view_project')}</a>`;
  if (project.github_url) linksEl.innerHTML += `<a href="${project.github_url}" target="_blank" class="btn btn-outline">${svgGithub()} GitHub</a>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('project-modal');
  if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
}

// Close modal on overlay click / Escape
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('project-modal');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── SVG Icons ───
function svgExternal() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>`;
}
function svgGithub() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
}
