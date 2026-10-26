// One shared effects channel prevents rapid clicks from stacking loudly.
(function () {
  'use strict';
  let enabled = true;
  try { enabled = sessionStorage.getItem('thainative-sfx') !== 'off'; } catch {}
  const toggle = document.getElementById('sfx-toggle');
  const clips = Object.fromEntries(['click', 'open', 'purchase', 'summon'].map(name => {
    const clip = new Audio(`assets/sfx/${name}.mp3`);
    clip.volume = name === 'summon' ? 0.3 : 0.25;
    clip.preload = 'auto';
    return [name, clip];
  }));
  let current;
  function play(name = 'click') {
    if (!enabled || !clips[name]) return;
    if (current) current.pause();
    current = clips[name];
    current.currentTime = 0;
    current.play().catch(() => {}); // Audio restrictions must never block a game action.
  }
  function updateToggle() {
    if (!toggle) return;
    toggle.textContent = enabled ? '♪ เสียงกด' : '♪ ปิดอยู่';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'ปิดเสียงเอฟเฟกต์ปุ่ม' : 'เปิดเสียงเอฟเฟกต์ปุ่ม');
  }
  toggle?.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled && current) current.pause();
    try { sessionStorage.setItem('thainative-sfx', enabled ? 'on' : 'off'); } catch {}
    updateToggle();
    if (enabled) play();
  });
  document.addEventListener('click', event => {
    const control = event.target.closest('button, a[href]');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true' ||
        control.id === 'sfx-toggle' || control.matches('[data-buy], [data-summon]')) return;
    play(control.matches('[data-panel]') ? 'open' : 'click');
  }, true);
  window.ThaiNativeSounds = { play };
  updateToggle();
})();
