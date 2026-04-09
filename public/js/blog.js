// =========================================
// blog.js — Blog List & Single Post
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('blog-grid')) {
    loadBlogList();
  }
  if (document.getElementById('blog-post-content')) {
    loadSinglePost();
  }
  I18n.onLangChange(() => {
    if (document.getElementById('blog-grid')) loadBlogList();
    if (document.getElementById('blog-post-content')) loadSinglePost();
  });
});

// ─── Blog List ───
let blogCategories = [];

async function loadBlogList() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;

  try {
    // Fetch categories first
    const catRes = await fetch('/api/categories?type=post');
    blogCategories = await catRes.json();
    renderBlogFilters();

    const res = await fetch('/api/posts');
    const data = await res.json();
    allPosts = data.posts || [];
    renderBlogList(allPosts);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Yazılar yüklenemedi.</p></div>`;
  }
}

function renderBlogFilters() {
  const container = document.getElementById('blog-category-filters');
  if (!container) return;
  const lang = I18n.getCurrent();
  
  const allLabel = lang === 'tr' ? 'Tümü' : 'All';
  let html = `<button class="blog-filter-btn ${blogFilter === 'all' ? 'active' : ''}" data-cat="all">${allLabel}</button>`;
  
  blogCategories.forEach(cat => {
    const name = lang === 'tr' ? cat.name_tr : cat.name_en;
    html += `<button class="blog-filter-btn ${blogFilter === cat.slug ? 'active' : ''}" data-cat="${cat.slug}">${name}</button>`;
  });
  
  container.innerHTML = html;
  initBlogFilter();
}

function renderBlogList(posts) {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  const lang = I18n.getCurrent();

  const filtered = blogFilter === 'all' ? posts : posts.filter(p => p.category === blogFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✍️</div><p>${I18n.get('blog.no_posts')}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const title = lang === 'tr' ? p.title_tr : p.title_en;
    const excerpt = lang === 'tr' ? p.excerpt_tr : p.excerpt_en;
    const date = new Date(p.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
    const catLabel = getCategoryLabel(p.category, lang);

    return `
      <article class="blog-card card reveal reveal-delay-${(i % 3) + 1}">
        ${p.cover_image ? `
          <div class="blog-card-image">
            <img src="${p.cover_image}" alt="${title}" loading="lazy">
          </div>` : ''}
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <span class="pill">${catLabel}</span>
            <span class="blog-read-time">⏱ ${p.read_time} ${I18n.get('blog.read_time')}</span>
          </div>
          <h2 class="blog-card-title"><a href="/blog/${p.slug}">${title}</a></h2>
          <p class="blog-card-excerpt">${excerpt || ''}</p>
          <div class="blog-card-footer">
            <time class="blog-date">${date}</time>
            <a href="/blog/${p.slug}" class="blog-read-more">
              ${I18n.get('blog.read_more')} <span>→</span>
            </a>
          </div>
        </div>
      </article>`;
  }).join('');

  // Re-observe
  document.querySelectorAll('.blog-card.reveal:not(.visible)').forEach(el => {
    blogRevealObserver.observe(el);
  });
}

const blogRevealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); blogRevealObserver.unobserve(e.target); } });
}, { threshold: 0.1 });

// Filter
function initBlogFilter() {
  document.querySelectorAll('.blog-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      blogFilter = btn.dataset.cat;
      document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBlogList(allPosts);
    });
  });
}
document.addEventListener('DOMContentLoaded', initBlogFilter);

function getCategoryLabel(cat, lang) {
  const category = blogCategories.find(c => c.slug === cat);
  if (category) return lang === 'tr' ? category.name_tr : category.name_en;
  return cat;
}

// ─── Single Post ───
async function loadSinglePost() {
  const slug = window.location.pathname.split('/blog/')[1];
  if (!slug) return;

  const container = document.getElementById('blog-post-content');
  const lang = I18n.getCurrent();

  try {
    // Ensure categories are loaded
    if (blogCategories.length === 0) {
      const catRes = await fetch('/api/categories?type=post');
      blogCategories = await catRes.json();
    }

    const res = await fetch(`/api/posts/${slug}`);
    if (!res.ok) { container.innerHTML = `<div class="empty-state"><p>Yazı bulunamadı.</p></div>`; return; }

    const post = await res.json();
    const title = lang === 'tr' ? post.title_tr : post.title_en;
    const content = lang === 'tr' ? post.content_tr : post.content_en;
    const date = new Date(post.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year:'numeric', month:'long', day:'numeric' });

    document.title = title + ' — Bora Özaras';

    const header = document.getElementById('post-header');
    if (header) {
      header.innerHTML = `
        <div class="section-label">${getCategoryLabel(post.category, lang)} · ${post.read_time} ${I18n.get('blog.read_time')}</div>
        <h1 class="post-title">${title}</h1>
        <div class="post-meta">
          <time>${date}</time>
          <span>·</span>
          <span>${post.views || 0} ${lang === 'tr' ? 'görüntülenme' : 'views'}</span>
        </div>
        ${post.cover_image ? `<div class="post-cover"><img src="${post.cover_image}" alt="${title}"></div>` : ''}
      `;
    }

    container.innerHTML = renderMarkdown(content);

    // Syntax highlight code blocks
    highlightCode(container);

    // Load related posts and comments
    loadRelatedPosts(post, lang);
    loadComments(slug, lang);

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title, url: window.location.href });
        } else {
          navigator.clipboard.writeText(window.location.href);
          showToast(lang === 'tr' ? 'Bağlantı kopyalandı!' : 'Link copied!');
        }
      });
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><p>Yazı yüklenemedi.</p></div>`;
  }
}

// ─── Simple Markdown Renderer ───
function renderMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code class="language-${lang}">${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|p|u|b|p|o|c])(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/<\/p>\s*<p>/g, '</p><p>');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightCode(container) {
  container.querySelectorAll('pre code').forEach(block => {
    block.parentElement.style.cssText = `
      background: var(--gray-800); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 1.25rem 1.5rem;
      overflow-x: auto; margin: 1.5rem 0;
      font-family: 'Courier New', monospace; font-size: 0.875rem; line-height: 1.8;
    `;
  });
}

// ─── Related Posts ───
async function loadRelatedPosts(currentPost, lang) {
  const section = document.getElementById('related-posts-section');
  const grid = document.getElementById('related-posts-grid');
  const heading = document.getElementById('related-posts-heading');
  if (!section || !grid) return;

  try {
    const res = await fetch('/api/posts?limit=50');
    const data = await res.json();
    const all = (data.posts || []).filter(p => p.slug !== currentPost.slug);

    // Same category first, then random
    let related = all.filter(p => p.category === currentPost.category);
    if (related.length < 3) {
      const others = all.filter(p => p.category !== currentPost.category);
      related = [...related, ...others.sort(() => 0.5 - Math.random())].slice(0, 3);
    } else {
      related = related.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    if (related.length === 0) return;

    if (heading) heading.textContent = lang === 'tr' ? 'Beğenebileceğiniz Diğer Yazılar' : 'You Might Also Like';

    grid.innerHTML = related.map(p => {
      const title = lang === 'tr' ? p.title_tr : p.title_en;
      const catLabel = getCategoryLabel(p.category, lang);
      const date = new Date(p.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      return `
        <a href="/blog/${p.slug}" class="related-card">
          ${p.cover_image ? `<div class="related-card-img"><img src="${p.cover_image}" alt="${title}" loading="lazy"></div>` : ''}
          <div class="related-card-body">
            <div class="related-card-cat">${catLabel}</div>
            <div class="related-card-title">${title}</div>
            <div class="related-card-meta">⏱ ${p.read_time} dk · ${date}</div>
          </div>
        </a>`;
    }).join('');

    section.style.display = 'block';
  } catch (e) {
    console.error('Related posts error:', e);
  }
}

// ─── Comments ───
let currentPostSlug = '';

async function loadComments(slug, lang) {
  currentPostSlug = slug;
  const list = document.getElementById('comments-list');
  const emptyEl = document.getElementById('comments-empty');
  const countLabel = document.getElementById('comments-count-label');
  if (!list) return;

  try {
    const res = await fetch(`/api/posts/${slug}/comments`);
    const comments = await res.json();

    // Clear previous items (keep empty placeholder)
    list.querySelectorAll('.comment-item').forEach(el => el.remove());

    if (!Array.isArray(comments) || comments.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (countLabel) countLabel.textContent = lang === 'tr' ? 'Yorumlar (0)' : 'Comments (0)';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (countLabel) countLabel.textContent = `${lang === 'tr' ? 'Yorumlar' : 'Comments'} (${comments.length})`;

    comments.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const initials = c.author_name.trim().split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

      const item = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `
        <div class="comment-avatar">${initials}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${escHtml(c.author_name)}</span>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">${escHtml(c.content)}</div>
        </div>`;
      list.appendChild(item);
    });

  } catch (e) {
    console.error('Comments load error:', e);
  }
}

async function submitComment(e) {
  e.preventDefault();
  const slug = currentPostSlug;
  if (!slug) return;

  const btn = document.getElementById('comment-submit-btn');
  const author = document.getElementById('comment-author').value.trim();
  const email = document.getElementById('comment-email').value.trim();
  const content = document.getElementById('comment-content').value.trim();

  if (!author || !content) return;

  btn.disabled = true;
  btn.textContent = '⏳ Gönderiliyor...';

  try {
    const res = await fetch(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: author, author_email: email, content })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      document.getElementById('comment-form').reset();
      const notice = document.getElementById('comment-notice');
      if (notice) {
        notice.style.color = 'var(--color-success, #4ade80)';
        notice.textContent = '✅ Yorumunuz alındı! Admin onayından sonra yayınlanacak.';
        setTimeout(() => {
          notice.style.color = '';
          notice.textContent = 'Yorumunuz admin onayından sonra yayınlanacaktır.';
        }, 5000);
      }
    } else {
      showToast(data.error || 'Bir hata oluştu.');
    }
  } catch (err) {
    showToast('Bağlantı hatası. Lütfen tekrar deneyin.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💬 Yorum Gönder';
  }
}

