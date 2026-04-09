// =========================================
// main.js — Global Effects & Interactions
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initNav();
  initTheme();
  initScrollProgress();
  initReveal();
  I18n.init();
});

// ─── Page Loader ───
function initLoader() {
  const loader = document.querySelector('.page-loader');
  if (!loader) return;
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('hidden'), 600);
  });
}



// ─── Navigation ───
function initNav() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
    link.classList.toggle('active', isActive);
  });
}

// ─── Theme Toggle ───
function initTheme() {
  const savedTheme = localStorage.getItem('8ora_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.querySelectorAll('.nav-theme-toggle').forEach(btn => {
    updateThemeIcon(btn, savedTheme);
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('8ora_theme', next);
      updateThemeIcon(btn, next);
    });
  });

  function updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark' ? '☼' : '☾';
    btn.title = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

// ─── Scroll Progress Bar ───
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (window.scrollY / total * 100) + '%';
  }, { passive: true });
}

// ─── Scroll Reveal ───
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => observer.observe(el));
}

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? '✓' : '✕';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-weight:700;font-size:1rem">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Marquee Clone (for infinite loop) ───
function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  const clone = track.cloneNode(true);
  track.parentElement.appendChild(clone);
}
initMarquee();

// ─── Glitch Data Attribute ───
document.querySelectorAll('.glitch').forEach(el => {
  el.setAttribute('data-text', el.textContent);
});

// ─── Circular SVG Text ───
function initCircularText(el, text) {
  if (!el) return;
  const r = 55; const cx = 70; const cy = 70;
  const pathId = 'circlePath_' + Math.random().toString(36).slice(2);
  el.innerHTML = `
    <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="${pathId}" d="M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,1 ${r*2},0 a ${r},${r} 0 1,1 -${r*2},0"/>
      </defs>
      <text fill="currentColor" font-family="Space Grotesk,sans-serif" font-size="13" font-weight="600" letter-spacing="3">
        <textPath href="#${pathId}">${text}</textPath>
      </text>
    </svg>
  `;
}

document.querySelectorAll('[data-circular-text]').forEach(el => {
  initCircularText(el, el.dataset.circularText);
});

// ─── Smooth Page Link Transitions ───
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;

  link.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const overlay = document.querySelector('.page-transition');
    if (overlay) {
      overlay.classList.add('enter');
      setTimeout(() => { window.location.href = href; }, 450);
    } else {
      window.location.href = href;
    }
  });
});

// Reveal on enter
window.addEventListener('pageshow', () => {
  const overlay = document.querySelector('.page-transition');
  if (overlay) { overlay.classList.remove('enter'); overlay.classList.add('exit'); }
});
