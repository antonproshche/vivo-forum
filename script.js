'use strict';

// Keep these unset until the organizer supplies the final destinations.
// Relative paths are supported for the downloadable PDF and privacy policy.
const integrations = Object.freeze({
  registration: '',
  program: '',
  privacy: '',
  social: ''
});

const pendingMessages = {
  registration: 'Ссылка на регистрацию пока не предоставлена. Для уточнения информации свяжитесь с организаторами форума.',
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
