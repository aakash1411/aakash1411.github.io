/* boot.js · BIOS-style startup overlay. Armed by the inline head script (html.booting). */
(() => {
  'use strict';
  const root = document.documentElement;
  const el = document.getElementById('boot');
  const toTop = () => { if (root.classList.contains('boot-top')) scrollTo({ top: 0, behavior: 'instant' }); };
  const finish = (fade) => {
    if (finish.done) return;
    finish.done = true;
    const release = () => {
      el && el.remove();
      toTop();
      root.classList.remove('booting');
      root.classList.remove('boot-top');
      try { sessionStorage.setItem('booted', '1'); } catch (e) { /* private mode */ }
      document.dispatchEvent(new Event('boot:done'));
    };
    if (fade && el) {
      el.classList.add('boot-out');
      setTimeout(release, 300);
    } else release();
  };

  if (!el || !root.classList.contains('booting')) {
    // Not armed (or markup missing): make sure nothing stays locked.
    if (root.classList.contains('booting')) finish(false);
    return;
  }

  toTop();
  addEventListener('load', toTop, { once: true });

  let data = { title: '', modules: [] };
  try { data = JSON.parse(document.getElementById('boot-data').textContent); } catch (e) { /* keep defaults */ }

  const log = el.querySelector('.boot-log');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lines = [];
  const render = () => { log.innerHTML = lines.join('\n'); };
  const push = (l) => { lines.push(l); render(); };
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => timers.forEach(clearTimeout);

  push('ASX BIOS v26.09  (C) 2021-2026 Aakash Shah');
  push('Applied AI Workstation · Los Angeles, CA');
  push('');
  push('Memory test : 5 yrs applied AI ... OK');
  push('Eval harness : 129 golden questions ... OK');
  push('');

  const N = data.modules.length;
  let loadIdx = -1, dotTick = 0;
  let dotTimer = null;
  let loaded = 0;

  const step = (i) => {
    if (i >= N) {
      clearInterval(dotTimer);
      lines[loadIdx] = 'FINISHED LOADING MODULES';
      push('');
      push(`All modules loaded, launching '<strong>${esc(data.title)}</strong>'`);
      later(() => finish(true), 600);
      return;
    }
    loaded = i + 1;
    const m = data.modules[i];
    const label = `  Loaded ${m.id} (${m.detail})`;
    const pct = Math.round(((i + 1) / N) * 100);
    push(`${label} ${'.'.repeat(Math.max(3, 62 - label.length))} ${pct}%`);
    later(() => step(i + 1), 140);
  };

  later(() => {
    loadIdx = lines.length;
    push(`LOADING MODULES (0/${N})`);
    dotTimer = setInterval(() => {
      dotTick = (dotTick + 1) % 4;
      lines[loadIdx] = `LOADING MODULES (${loaded}/${N})${'.'.repeat(dotTick)}`;
      render();
    }, 160);
    step(0);
  }, 300);

  // A click during loading skips straight to the site.
  el.addEventListener('click', () => {
    clearTimers();
    clearInterval(dotTimer);
    finish(true);
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('boot')) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(true); }
  });
})();
