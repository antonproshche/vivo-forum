'use strict';

// Keep these unset until the organizer supplies the final destinations.
// Relative paths are supported for the downloadable PDF and privacy policy.
const integrations = Object.freeze({
  // Set this to the organizer's HTTPS n8n webhook URL to enable registration submissions.
  // An HTTP URL is accepted only for a local mock endpoint on localhost or 127.0.0.1.
  registrationWebhookUrl: '',
  program: '',
  privacy: '',
  social: ''
});

const pendingMessages = {
  program: 'Файл программы для скачивания пока не предоставлен. Программа форума доступна в соответствующем разделе страницы.',
  privacy: 'Политика в отношении обработки персональных данных пока не предоставлена.',
  social: 'Ссылка на страницу Ассоциации «ПСПиОН» во ВКонтакте пока не предоставлена.'
};

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
const mobileViewport = window.matchMedia('(max-width: 1000px)');
function closeMenu(restoreFocus = false) {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuButton.focus();
}
function syncMenu() {
  menuButton.hidden = !mobileViewport.matches;
  closeMenu();
}
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  navigation.classList.toggle('is-open', !expanded);
});
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  const target = document.querySelector(link.hash);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({preventScroll: true});
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
mobileViewport.addEventListener('change', syncMenu);
document.documentElement.classList.add('js');
syncMenu();

const registrationDialog = document.querySelector('#registration-dialog');
const registrationForm = document.querySelector('#registration-form');
const registrationStatus = document.querySelector('#registration-status');
const registrationSubmit = registrationForm.querySelector('[type="submit"]');
const registrationName = document.querySelector('#registration-name');
const registrationPhone = document.querySelector('#registration-phone');
const registrationEmail = document.querySelector('#registration-email');
const registrationConsent = document.querySelector('#registration-consent');
const registrationPrivacy = document.querySelector('#registration-privacy');
let registrationTrigger;
let registrationScrollY = 0;
let registrationRequestId = 0;
let registrationController;
let registrationSubmitting = false;

function setRegistrationStatus(message, state = '') {
  registrationStatus.textContent = message;
  registrationStatus.dataset.state = state;
}

function setFieldError(input, message) {
  document.getElementById(input.getAttribute('aria-describedby')).textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validateRegistration() {
  const fullName = registrationName.value.trim();
  const phone = registrationPhone.value.trim();
  const email = registrationEmail.value.trim();
  setFieldError(registrationName, fullName ? '' : 'Укажите имя и фамилию.');
  setFieldError(registrationPhone, phone.replace(/\D/g, '').length >= 7 ? '' : 'Укажите телефон (не менее 7 цифр).');
  setFieldError(registrationEmail, email && registrationEmail.checkValidity() ? '' : 'Укажите корректный E-mail.');
  setFieldError(registrationConsent, registrationConsent.checked ? '' : 'Подтвердите согласие на обработку персональных данных.');
  const invalid = registrationForm.querySelector('[aria-invalid="true"]');
  if (invalid) {
    setRegistrationStatus('Проверьте выделенные поля.', 'error');
    invalid.focus();
    return null;
  }
  return {fullName, phone, email, consent: true, submittedAt: new Date().toISOString(), source: 'forum.pspion.ru'};
}

function getRegistrationWebhookUrl() {
  try {
    const url = new URL(integrations.registrationWebhookUrl);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!url.username && !url.password && (url.protocol === 'https:' || (local && url.protocol === 'http:'))) return url.href;
  } catch (_) {
    // The webhook is intentionally unset until the organizer provides it.
  }
  return null;
}

document.querySelectorAll('[data-registration-open]').forEach(button => {
  button.addEventListener('click', () => {
    registrationTrigger = button;
    registrationScrollY = window.scrollY;
    setRegistrationStatus('');
    registrationDialog.showModal();
    document.body.style.position = 'fixed';
    document.body.style.top = `-${registrationScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    registrationName.focus();
  });
});

registrationDialog.querySelector('.registration-close').addEventListener('click', () => registrationDialog.close());
registrationDialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...registrationDialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
registrationDialog.addEventListener('click', event => {
  if (event.target !== registrationDialog) return;
  const rect = registrationDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) registrationDialog.close();
});
registrationDialog.addEventListener('close', () => {
  registrationRequestId += 1;
  registrationController?.abort();
  registrationController = undefined;
  registrationSubmitting = false;
  registrationSubmit.disabled = false;
  registrationSubmit.textContent = 'ЗАРЕГИСТРИРОВАТЬСЯ';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  window.scrollTo({top: registrationScrollY, behavior: 'instant'});
  registrationTrigger?.focus({preventScroll: true});
});

if (integrations.privacy) registrationPrivacy.href = integrations.privacy;
else registrationPrivacy.addEventListener('click', event => {
  event.preventDefault();
  setRegistrationStatus(pendingMessages.privacy, 'error');
});

registrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (registrationSubmitting) return;
  const payload = validateRegistration();
  if (!payload) return;
  const webhookUrl = getRegistrationWebhookUrl();
  if (!webhookUrl) {
    setRegistrationStatus('Отправка регистрации временно недоступна. Данные в форме сохранены; попробуйте позже.', 'error');
    return;
  }
  registrationSubmitting = true;
  registrationSubmit.disabled = true;
  registrationSubmit.textContent = 'ОТПРАВКА…';
  setRegistrationStatus('Отправляем регистрацию…');
  registrationController = new AbortController();
  const requestId = ++registrationRequestId;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: registrationController.signal
    });
    if (!response.ok) throw new Error('Registration request failed');
    if (requestId !== registrationRequestId) return;
    setRegistrationStatus('Регистрация успешно отправлена.', 'success');
    registrationForm.reset();
  } catch (error) {
    if (requestId !== registrationRequestId) return;
    setRegistrationStatus('Не удалось отправить регистрацию. Проверьте соединение и попробуйте снова. Данные в форме сохранены.', 'error');
  } finally {
    if (requestId === registrationRequestId) {
      registrationSubmitting = false;
      registrationController = undefined;
      registrationSubmit.disabled = false;
      registrationSubmit.textContent = 'ЗАРЕГИСТРИРОВАТЬСЯ';
    }
  }
});

const dialog = document.querySelector('#pending-dialog');
const description = document.querySelector('#dialog-description');
document.querySelectorAll('[data-pending]').forEach(button => {
  const key = button.dataset.pending;
  const destination = integrations[key];
  if (destination) {
    const link = document.createElement('a');
    link.className = button.className;
    link.innerHTML = button.innerHTML;
    link.href = destination;
    if (key === 'program') link.setAttribute('download', '');
    const note = document.getElementById(button.getAttribute('aria-describedby'));
    if (note) note.hidden = true;
    link.querySelector('small')?.remove();
    button.replaceWith(link);
    return;
  }
  button.addEventListener('click', () => {
    description.textContent = pendingMessages[key];
    dialog.showModal();
  });
});
dialog.querySelectorAll('.dialog-close, .dialog-dismiss').forEach(button => {
  button.addEventListener('click', () => dialog.close());
});
dialog.querySelector('a').addEventListener('click', () => {
  dialog.close();
  // Move keyboard focus to the destination as well as scrolling there.
  const contacts = document.querySelector('#contacts');
  contacts.setAttribute('tabindex', '-1');
  contacts.focus({preventScroll: true});
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
