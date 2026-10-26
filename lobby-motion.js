'use strict';
(() => {
  const village = document.querySelector('.village');
  const world = document.querySelector('.scene-world');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.getElementById('motion-toggle');
  let preference = null;
  try { preference = localStorage.getItem('thainative-motion'); } catch {}
  let enabled;
  function update() {
    enabled = preference === null ? !motion.matches : preference === 'on';
    document.documentElement.classList.toggle('motion-enabled', enabled);
    document.documentElement.classList.toggle('motion-paused', !enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '✧ ฉากเคลื่อนไหว: เปิด' : '✧ เปิดฉากเคลื่อนไหว';
    reset();
  }
  toggle.addEventListener('click', () => {
    preference = enabled ? 'off' : 'on';
    try { localStorage.setItem('thainative-motion', preference); } catch {}
    update();
  });
  function reset() {
    world.style.removeProperty('--pan-x');
    world.style.removeProperty('--pan-y');
  }
  village.addEventListener('pointermove', event => {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = village.getBoundingClientRect();
    world.style.setProperty('--pan-x', `${((event.clientX - bounds.left) / bounds.width - .5) * -8}px`);
    world.style.setProperty('--pan-y', `${((event.clientY - bounds.top) / bounds.height - .5) * -5}px`);
  });
  village.addEventListener('pointerleave', reset);
  motion.addEventListener('change', update);
  update();
})();
