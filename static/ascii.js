/* ascii.js · text-art canvas in .scene-stage. Four phases chosen by page scroll progress. */
(() => {
  'use strict';
  const stage = document.querySelector('.scene-stage');
  if (!stage) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mq = matchMedia('(min-width: 1240px)');
  const CW = 7, CH = 11;

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  stage.insertBefore(cv, stage.firstChild);
  const cap = document.createElement('div');
  cap.className = 'scene-cap';
  stage.appendChild(cap);
  const ctx = cv.getContext('2d');

  let cols = 0, rows = 0, W = 0, H = 0, ox = 0, oy = 0, ink = '#fff';
  const CAPS = ['FIG. 1 · CONTOUR', 'FIG. 2 · GLUCOSE TRACE', 'FIG. 3 · TENSOR', 'FIG. 4 · LORENZ'];

  const readInk = () => {
    ink = (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#fff').trim();
  };
  const hidden = () => document.documentElement.classList.contains('stage-hidden');
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.attributeName === 'data-theme') readInk();
      else if (!hidden()) kick(); // stage re-shown: resume the loop
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  readInk();

  // Pointer-follow state: window mouse position eases onto the art grid.
  const ptr = { u: .5, v: .5, s: 0 };
  let tu = .5, tv = .5, ts = 0, mx = 0, my = 0;
  if (matchMedia('(pointer: fine)').matches && !REDUCED) {
    addEventListener('mousemove', (e) => {
      tu = e.clientX / innerWidth;
      tv = e.clientY / innerHeight;
      ts = 1;
    }, { passive: true });
    addEventListener('mouseout', (e) => { if (!e.relatedTarget) ts = 0; });
  }

  // Word stream the figures mask through (id="art-words", emitted by build.js).
  const ALPHA = { '.': .1, ',': .14, ':': .18, '-': .24, '=': .3, '+': .38, '*': .5, '#': .8, '%': .9, '@': 1 };
  let STREAM = '';
  try {
    const words = JSON.parse(document.getElementById('art-words').textContent);
    if (Array.isArray(words) && words.length) STREAM = words.join(' ') + ' ';
  } catch (e) { /* no stream: draw the mask chars literally */ }

  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sm = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    const u = sm(fx), v = sm(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const grid = () => Array.from({ length: rows }, () => new Array(cols).fill(' '));

  // FIG. 1: drifting 2-octave value-noise contour map
  const RAMP = ' .:-=+*#%@';
  function contour(g, t) {
    const sig = Math.min(cols, rows * CH / CW) * 0.16;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - mx, dy = (y - my) * (CH / CW);
        const n = 0.62 * noise(x * 0.11 + t * 0.13, y * 0.14 + t * 0.05)
                + 0.38 * noise(x * 0.24 - t * 0.09, y * 0.27 + t * 0.11)
                + 0.45 * ptr.s * Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
        if (n < 0.28) continue;
        let iso = false;
        for (const b of [0.34, 0.47, 0.6, 0.73, 0.86]) {
          if (Math.abs(n - b) < 0.018) { iso = true; break; }
        }
        g[y][x] = iso ? '@' : RAMP[Math.min(9, Math.max(1, Math.floor(((n - 0.28) / 0.72) * 10)))];
      }
    }
  }

  // FIG. 2: scrolling CGM-style trace with dashed 180/70 target lines
  function glucose(g, t) {
    const lo = 40, hi = 230;
    const rowOf = (v) => Math.round((1 - (v - lo) / (hi - lo)) * (rows - 3)) + 1;
    const r180 = rowOf(180), r70 = rowOf(70);
    for (let x = 4; x < cols; x++) {
      if (r180 >= 0 && r180 < rows && x % 4 < 2) g[r180][x] = '-';
      if (r70 >= 0 && r70 < rows && x % 4 < 2) g[r70][x] = '-';
    }
    [...'180'].forEach((c, i) => { if (r180 >= 0 && r180 < rows) g[r180][i] = c; });
    [...'70'].forEach((c, i) => { if (r70 >= 0 && r70 < rows) g[r70][i] = c; });
    const vals = new Array(cols);
    for (let x = 0; x < cols; x++) {
      let v = 112 + 26 * Math.sin(x * 0.16 + t * 1.15) + 14 * Math.sin(x * 0.052 + t * 0.63);
      for (let k = 0; k < 3; k++) {
        const c = ((k * 57 + t * 9) % (cols + 28)) - 14;
        const dx = x - c;
        v += (34 + k * 8) * Math.exp(-(dx * dx) / 7);
      }
      const cv = Math.min(hi - 5, Math.max(lo + 5, v));
      vals[x] = cv;
      const r = rowOf(cv);
      if (r >= 0 && r < rows) g[r][x] = '#';
    }
    if (ptr.s > 0.5) {
      const cx = Math.max(0, Math.min(cols - 1, Math.round(mx)));
      const vr = rowOf(vals[cx]);
      for (let y = 0; y < rows; y++) if (g[y][cx] === ' ') g[y][cx] = '|';
      if (vr >= 0 && vr < rows) g[vr][cx] = 'o';
      const txt = `${Math.round(vals[cx])} mg/dL`;
      const ry = Math.max(0, vr - 1);
      let x0 = cx + 2;
      if (x0 + txt.length > cols) x0 = cx - 1 - txt.length;
      const gap = x0 > cx ? cx + 1 : cx - 1;
      if (gap >= 0 && gap < cols && ry < rows) g[ry][gap] = ' ';
      for (let i = 0; i < txt.length; i++) {
        const x = x0 + i;
        if (x >= 0 && x < cols && ry < rows) g[ry][x] = txt[i];
      }
    }
  }

  // FIG. 3: rotating wireframe cube, Bresenham edges into the char grid
  const CUBE_V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const CUBE_E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  function tensor(g, t) {
    const ay = t * 0.6 + (ptr.u - 0.5) * 2.4 * ptr.s, ax = t * 0.45 + (ptr.v - 0.5) * 2.4 * ptr.s;
    const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    const P = CUBE_V.map(([x, y, z]) => {
      const X = x * ca + z * sa, Z = -x * sa + z * ca;
      const Y = y * cb - Z * sb, Z2 = y * sb + Z * cb;
      const per = 1 / (1 + Z2 * 0.18);
      return [X * per, Y * per];
    });
    const S = Math.min(cols / 2.7, rows / 2);
    const pts = P.map(([x, y]) => [Math.round(cols / 2 + x * S), Math.round(rows / 2 + y * S * 0.62)]);
    for (const [a, b] of CUBE_E) {
      let [x0, y0] = pts[a];
      const [x1, y1] = pts[b];
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (x0 >= 0 && x0 < cols && y0 >= 0 && y0 < rows) g[y0][x0] = '#';
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    for (const [x, y] of pts) if (x >= 0 && x < cols && y >= 0 && y < rows) g[y][x] = '@';
  }

  // FIG. 4: live Lorenz attractor, brightness by recency
  const LP = [];
  let lx = 0.12, ly = 0, lz = 20;
  const lint = () => {
    const dt = 0.006;
    lx += 10 * (ly - lx) * dt;
    ly += (lx * (28 - lz) - ly) * dt;
    lz += (lx * ly - (8 / 3) * lz) * dt;
  };
  for (let i = 0; i < 2500; i++) lint();
  for (let i = 0; i < 1500; i++) { lint(); LP.push([lx, ly, lz]); }
  function lorenz(g) {
    for (let i = 0; i < 10; i++) { lint(); LP.push([lx, ly, lz]); }
    while (LP.length > 1500) LP.shift();
    const ramp = '.,:+*#@';
    const th = (ptr.u - 0.5) * Math.PI * 0.9 * ptr.s, ph = (ptr.v - 0.5) * 0.8 * ptr.s;
    const cth = Math.cos(th), sth = Math.sin(th), cph = Math.cos(ph), sph = Math.sin(ph);
    LP.forEach(([x, y, z], i) => {
      const sx = x * cth + y * sth;
      const depth = -x * sth + y * cth;
      const sz = (z - 25) * cph - depth * sph + 25;
      const cx = Math.round(cols / 2 + sx * (cols / 46));
      const cy = Math.round(rows - 2 - sz * (rows / 56));
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) g[cy][cx] = ramp[Math.min(6, Math.floor((i / LP.length) * 7))];
    });
  }

  const PHASES = [contour, glucose, tensor, lorenz];
  const BOUNDS = [0.18, 0.45, 0.72];
  const pNow = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  };

  function draw(g, capI) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = ink;
    const off = capI * 1009;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = g[y][x];
        if (c === ' ') continue;
        let ch = c, a = 1;
        if (STREAM && ALPHA[c] !== undefined) {
          // ponytail: row-major fill breaks words at row ends; word-wrap the stream per row if readability matters
          ch = STREAM[(off + y * cols + x) % STREAM.length];
          a = ALPHA[c];
        }
        if (ch === ' ') continue;
        ctx.globalAlpha = a;
        ctx.fillText(ch, ox + x * CW, oy + y * CH);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!cols || !rows || !mq.matches || hidden()) return;
    ptr.u += (tu - ptr.u) * 0.2;
    ptr.v += (tv - ptr.v) * 0.2;
    ptr.s += (ts - ptr.s) * 0.1;
    mx = ptr.u * cols;
    my = ptr.v * rows;
    const p = pNow();
    let g, capI = p < BOUNDS[0] ? 0 : p < BOUNDS[1] ? 1 : p < BOUNDS[2] ? 2 : 3;
    let bi = -1;
    for (let i = 0; i < 3; i++) if (Math.abs(p - BOUNDS[i]) < 0.025) bi = i;
    g = grid();
    if (bi >= 0) {
      // dither crossfade between neighbouring phases over ~0.05 of p
      const f = (p - (BOUNDS[bi] - 0.025)) / 0.05;
      const a = grid(), b = grid();
      PHASES[bi](a, t);
      PHASES[bi + 1](b, t);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) g[y][x] = hash(x * 3.7 + 1, y * 9.1 + 5) < f ? b[y][x] : a[y][x];
      }
      capI = f < 0.5 ? bi : bi + 1;
    } else {
      PHASES[capI](g, t);
    }
    draw(g, capI);
    cap.textContent = CAPS[capI];
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '11px "DM Mono", monospace';
    ctx.textBaseline = 'top';
    cols = Math.floor(W / CW);
    rows = Math.floor(H / CH);
    ox = (W - cols * CW) / 2;
    oy = (H - rows * CH) / 2;
  }

  let raf = null, last = 0;
  const loop = (ts) => {
    raf = null;
    if (document.hidden || !mq.matches || hidden()) return;
    if (ts - last >= 33) { last = ts; frame(ts / 1000); }
    raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && !REDUCED) raf = requestAnimationFrame(loop); };

  resize();
  if (REDUCED) {
    // Static only: one frame now, and refresh the phase once scrolling settles.
    let st = null;
    frame(0);
    addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => frame(0), 160);
    }, { passive: true });
  } else {
    addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    mq.addEventListener('change', () => { resize(); kick(); });
    kick();
  }
  addEventListener('resize', () => { resize(); if (REDUCED) frame(0); else kick(); });
})();
