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

// Only decorative Hero circles move. Cache geometry on entry; frames only write
// transforms and stop once settled. Touch and reduced-motion never start a loop.
(() => {
  const hero = document.querySelector('.hero');
  const circles = [...hero.querySelectorAll('.orb[data-depth]')];
  const motion = window.matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const depths = circles.map(circle => Number(circle.dataset.depth));
  let bounds;
  let frame = 0;
  let lastTime = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  function render(time) {
    const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16;
    lastTime = time;
    const ease = 1 - Math.exp(-elapsed / 110);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    const settled = Math.abs(targetX - x) < .001 && Math.abs(targetY - y) < .001;
    if (settled) { x = targetX; y = targetY; }
    circles.forEach((circle, index) => {
      circle.style.transform = x || y ? `translate3d(${x * depths[index]}px, ${y * depths[index]}px, 0)` : '';
    });
    frame = settled ? 0 : requestAnimationFrame(render);
    if (settled) lastTime = 0;
  }

  function start() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function reset() {
    targetX = targetY = 0;
    bounds = null;
    if (motion.matches) start();
    else {
      cancelAnimationFrame(frame);
      frame = lastTime = x = y = 0;
      circles.forEach(circle => { circle.style.transform = ''; });
    }
  }

  hero.addEventListener('pointerenter', event => {
    if (motion.matches && event.pointerType === 'mouse') bounds = hero.getBoundingClientRect();
  });
  hero.addEventListener('pointermove', event => {
    if (!motion.matches || event.pointerType !== 'mouse') return;
    if (!bounds) bounds = hero.getBoundingClientRect();
    targetX = -Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    targetY = -Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    start();
  }, {passive: true});
  hero.addEventListener('pointerleave', reset);
  hero.addEventListener('pointercancel', reset);
  window.addEventListener('resize', reset, {passive: true});
  window.addEventListener('scroll', () => { bounds = null; }, {passive: true});
  window.addEventListener('blur', reset);
  motion.addEventListener('change', reset);
})();
