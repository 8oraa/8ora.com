// =========================================
// i18n.js — Language Management System
// =========================================

const I18n = (() => {
  let currentLang = localStorage.getItem('8ora_lang') || 'tr';
  const observers = [];

  function get(path) {
    const t = translations[currentLang];
    return path.split('.').reduce((obj, key) => obj && obj[key], t) || path;
  }

  function set(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('8ora_lang', lang);
    document.documentElement.lang = lang;
    applyTranslations();
    observers.forEach(fn => fn(lang));
  }

  function getCurrent() { return currentLang; }

  function applyTranslations() {
    // data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = get(key);
      if (val) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
        else el.textContent = val;
      }
    });
    // data-i18n-html (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = get(key);
      if (val) el.innerHTML = val;
    });
    // data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = get(key);
      if (val) el.title = val;
    });
    // Update lang toggle buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    // Update page title
    const pageTitleKey = document.querySelector('meta[name="i18n-title"]')?.content;
    if (pageTitleKey) {
      const val = get(pageTitleKey);
      if (val) document.title = val;
    }
  }

  function onLangChange(fn) { observers.push(fn); }

  function init() {
    document.documentElement.lang = currentLang;
    // Wire lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => set(btn.dataset.lang));
    });
    applyTranslations();
  }

  return { get, set, getCurrent, init, applyTranslations, onLangChange };
})();
