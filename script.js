'use strict';

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

// Orthographic projection: visible width = diameter * cos(angle).
// Observe layout size, never the animated surface, so flips cannot affect geometry.
const orbSizeObserver = new ResizeObserver(entries => {
  entries.forEach(({target, contentRect}) => {
    const diameter = contentRect.width;
    if (!diameter) return;
    const edgeWidth = parseFloat(getComputedStyle(target).getPropertyValue('--orb-edge-width'));
    const angle = Math.acos(Math.min(1, edgeWidth / diameter)) * 180 / Math.PI;
    target.style.setProperty('--orb-flip-angle', `${angle}deg`);
  });
});
document.querySelectorAll('.orb-band').forEach(circle => orbSizeObserver.observe(circle));
