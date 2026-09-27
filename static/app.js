/* app.js · page furniture: theme, clocks, scramble, marquee assist, cursor, filters */
(() => {
  'use strict';
  const root = document.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ── Theme button (cycles midnight → graphite → paper → blueprint) ──
  const THEMES = ['midnight', 'graphite', 'paper', 'blueprint'];
  const themeBtn = $('.theme-btn');
  const syncTheme = () => {
    const name = root.dataset.theme[0].toUpperCase() + root.dataset.theme.slice(1);
    themeBtn.setAttribute('aria-label', `Colour theme: ${name}. Click to change.`);
  };
  themeBtn.addEventListener('click', () => {
    root.dataset.theme = THEMES[(THEMES.indexOf(root.dataset.theme) + 1) % THEMES.length];
    try { localStorage.theme = root.dataset.theme; } catch (e) { /* private mode */ }
    syncTheme();
  });
  syncTheme();

  // ── Scroll progress ──
  const bar = $('.progress i');
  const setBar = () => {
    const max = root.scrollHeight - root.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
    root.classList.toggle('stage-hero', scrollY < 24);
  };
  addEventListener('scroll', setBar, { passive: true });
  setBar();

  // ── Deploy log clock, America/Los_Angeles ──
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', weekday: 'short', day: '2-digit',
      month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      second: '2-digit', hour12: false,
    });
    const tick = () => {
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
      clock.textContent = `${p.weekday} ${p.day} ${p.month} ${p.year} · ${p.hour}:${p.minute}:${p.second} PT`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ── Reveal on scroll + highlighter draw-in ──
  if (!REDUCED) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
    const mo = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-drawn'); mo.unobserve(e.target); } });
    }, { threshold: 0.4 });
    $$('.ink-mark').forEach((el) => mo.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('visible'));
    $$('.ink-mark').forEach((el) => el.classList.add('is-drawn'));
  }

  // ── Text-art stage: full opacity in the hero, dimmed after, gone over .pc ──
  const pcEls = $$('.pc');
  if (pcEls.length) {
    const pcVis = new Set();
    const pcIo = new IntersectionObserver((es) =>
      es.forEach((e) => {
        if (e.isIntersecting) pcVis.add(e.target); else pcVis.delete(e.target);
        root.classList.toggle('stage-hidden', pcVis.size > 0);
      }), { threshold: 0 });
    pcEls.forEach((el) => pcIo.observe(el));
  }

  // ── Headline scramble (waits for the boot overlay to finish) ──
  const h1 = $('[data-scramble]');
  const scramble = () => {
    const orig = h1.innerHTML;
    const frag = document.createDocumentFragment();
    const chars = [];
    const build = (node, out) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'sc-word';
            for (const ch of part) {
              const c = document.createElement('span');
              c.className = 'sc-ch';
              c.dataset.f = ch;
              c.textContent = ch;
              w.appendChild(c);
              chars.push(c);
            }
            out.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const c = document.createElement(n.tagName.toLowerCase());
          out.appendChild(c);
          build(n, c);
        }
      });
    };
    const tmp = document.createElement('div');
    tmp.innerHTML = orig;
    build(tmp, frag);
    h1.innerHTML = '';
    h1.appendChild(frag);
    chars.forEach((c) => { c.style.width = `${c.offsetWidth}px`; }); // pin widths: no reflow while scrambling
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const t0 = performance.now(), DUR = 1100, N = chars.length;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / DUR);
      chars.forEach((c, i) => {
        if (!/[A-Za-z]/.test(c.dataset.f) || p >= (i + 1) / N) c.textContent = c.dataset.f;
        else if (p > (i / N) * 0.55) c.textContent = POOL[(Math.random() * 52) | 0];
      });
      if (p < 1) requestAnimationFrame(tick);
      else h1.innerHTML = orig;
    })(t0);
  };
  if (h1 && !REDUCED) {
    if (root.classList.contains('booting')) document.addEventListener('boot:done', scramble, { once: true });
    else scramble();
  }

  // ── Experience filter chips ──
  const chips = $$('.fchip');
  if (chips.length) {
    const orgs = $$('.org[data-org]');
    chips.forEach((ch) => ch.addEventListener('click', () => {
      const id = ch.dataset.org;
      const showAll = id === 'all' || ch.getAttribute('aria-pressed') === 'true';
      chips.forEach((c) => c.setAttribute('aria-pressed', String(showAll ? c.dataset.org === 'all' : c === ch)));
      orgs.forEach((o) => { o.style.display = (showAll || o.dataset.org === id) ? '' : 'none'; });
    }));
  }

  // ── Point-grid cursor field (fine pointers only) ──
  if (FINE && !REDUCED) {
    const cv = $('.cursor-field');
    const ctx = cv.getContext('2d');
    const SP = 8, R = 120, LEN = 18;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      cv.style.width = `${innerWidth}px`;
      cv.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    let mx = -1e4, my = -1e4, inside = false, decay = 0, raf = null, lastDraw = 0;
    const paperish = () => root.dataset.theme === 'paper' || root.dataset.theme === 'blueprint';
    const draw = (alphaMul) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.lineWidth = 1.5;
      const now = performance.now() / 1000;
      const x0 = Math.max(0, Math.floor((mx - R) / SP)), x1 = Math.ceil((mx + R) / SP);
      const y0 = Math.max(0, Math.floor((my - R) / SP)), y1 = Math.ceil((my + R) / SP);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const px = gx * SP, py = gy * SP;
          const dx = mx - px, dy = my - py;
          const d = Math.hypot(dx, dy);
          if (d > R || d === 0) continue;
          const t = 1 - d / R;
          if (t < 0.15) continue; // keeps the gradient count low
          const len = LEN * t * t * t * (0.7 + 0.3 * Math.sin(now * 2.4 - d * 0.09));
          if (len < 0.5) continue;
          const tx = px + (dx / d) * len, ty = py + (dy / d) * len;
          const g = ctx.createLinearGradient(px, py, tx, ty);
          g.addColorStop(0, 'rgba(255,180,84,0)');
          g.addColorStop(0.4, '#FFB454');
          g.addColorStop(0.75, '#FF6B6B');
          g.addColorStop(1, '#B69CFF');
          ctx.strokeStyle = g;
          ctx.globalAlpha = t * (paperish() ? 0.6 : 1) * alphaMul;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    const stop = () => { raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); };
    const loop = () => {
      if (document.hidden) { stop(); return; }
      const t = performance.now();
      if (t - lastDraw >= 33) {
        lastDraw = t;
        if (!inside && --decay <= 0) { stop(); return; }
        draw(inside ? 1 : decay / 12);
      }
      raf = requestAnimationFrame(loop);
    };
    addEventListener('mousemove', (e) => {
      inside = true;
      mx = e.clientX;
      my = e.clientY;
      decay = 12;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    addEventListener('mouseout', (e) => { if (!e.relatedTarget) inside = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  }

  // ── Build bot: the little engineer in the corner ──
  const egg = $('.egg');
  if (egg) {
    let lines = [];
    try { lines = JSON.parse($('#egg-data').textContent); } catch (e) { /* no lines, no bot */ }
    if (lines.length) {
      const lineEl = $('.egg-line', egg);
      const bot = $('.egg-bot', egg);
      const xBtn = $('.egg-x', egg);
      let li = 0, waveT = null, shown = false;
      const setLine = (i) => { li = ((i % lines.length) + lines.length) % lines.length; lineEl.textContent = lines[li]; };
      const show = () => {
        shown = true;
        egg.classList.add('peek');
        egg.setAttribute('aria-hidden', 'false');
        setLine(li);
        if (!REDUCED) {
          egg.classList.add('waving');
          clearTimeout(waveT);
          waveT = setTimeout(() => egg.classList.remove('waving'), 2400);
        }
      };
      const hide = () => {
        shown = false;
        egg.classList.remove('peek', 'waving');
        egg.setAttribute('aria-hidden', 'true');
        clearTimeout(waveT);
      };
      bot.addEventListener('click', () => setLine(li + 1));
      xBtn.addEventListener('click', hide);

      const KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      let ki = 0, word = '';
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { if (shown) hide(); return; }
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        ki = (k === KON[ki]) ? ki + 1 : (k === KON[0] ? 1 : 0);
        if (ki === KON.length) { ki = 0; show(); }
        const typing = e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
        if (typing) { word = ''; return; }
        if (e.key.length === 1) {
          word = (word + e.key.toLowerCase()).slice(-5);
          if (word === 'hello') { word = ''; show(); }
        } else word = '';
      });

      const name = $('.mast-name');
      if (name) {
        let clicks = [];
        name.addEventListener('click', () => {
          const t = performance.now();
          clicks = clicks.filter((c) => t - c < 1200);
          clicks.push(t);
          if (clicks.length >= 3) { clicks = []; show(); }
        });
      }
    }
  }
})();
