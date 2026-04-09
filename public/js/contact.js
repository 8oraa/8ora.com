// =========================================
// contact.js — Contact Form Handler
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
});

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = form.querySelector('[type="submit"]');
  const btnText = submitBtn?.querySelector('.btn-text');

  // Animated input labels
  form.querySelectorAll('.animated-input').forEach(input => {
    const label = input.parentElement.querySelector('.float-label');
    if (!label) return;
    const update = () => {
      label.classList.toggle('active', !!input.value || document.activeElement === input);
    };
    input.addEventListener('focus', update);
    input.addEventListener('blur', update);
    input.addEventListener('input', update);
    update();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const lang = I18n.getCurrent();

    // Validate
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showToast(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(lang === 'tr' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.', 'error');
      return;
    }

    // Loading state
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }
    if (btnText) btnText.textContent = I18n.get('contact.sending');

    try {
      const res = await fetch('/api/settings/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject: form.subject?.value || '', message })
      });

      if (res.ok) {
        showToast(I18n.get('contact.success'), 'success');
        form.reset();
        form.querySelectorAll('.float-label').forEach(l => l.classList.remove('active'));
        // Success animation
        const successEl = document.getElementById('form-success');
        if (successEl) { successEl.style.display = 'flex'; form.style.display = 'none'; }
      } else {
        throw new Error('Server error');
      }
    } catch {
      showToast(I18n.get('contact.error'), 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      if (btnText) btnText.textContent = I18n.get('contact.send');
    }
  });
}
