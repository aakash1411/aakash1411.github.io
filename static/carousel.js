/* carousel.js · every .pc is a horizontal scroll-snap strip. While the pointer
   is over a carousel, the vertical wheel pans it left/right one card per
   gesture; anywhere else, the wheel scrolls the page. */
(() => {
  'use strict';
  document.querySelectorAll('.pc').forEach((pc) => {
    const track = pc.querySelector('.pc-track');
    const cells = [...pc.querySelectorAll('.pc-cell')];
    const frames = cells.map((c) => c.querySelector('.pc-frame'));
    const counter = pc.querySelector('.pc-count');
    const prev = pc.querySelector('.pc-prev');
    const next = pc.querySelector('.pc-next');
    const N = cells.length;
    if (!N) return;

    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = REDUCED ? 'auto' : 'smooth';
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const pad = (n) => String(n).padStart(2, '0');

    const setLive = (i) => {
      cells.forEach((f, j) => f.classList.toggle('is-live', j === i));
      counter.textContent = `${pad(i + 1)} / ${pad(N)}`;
    };
    const stripTo = (i) => {
      const f = cells[clamp(i, 0, N - 1)];
      track.scrollTo({ left: f.offsetLeft - (track.clientWidth - f.offsetWidth) / 2, behavior });
    };
    const fbIndex = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = 1e9;
      cells.forEach((f, i) => {
        const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    };

    const stepFrame = (dir) => stripTo(fbIndex() + dir);
    prev.addEventListener('click', () => stepFrame(-1));
    next.addEventListener('click', () => stepFrame(1));
    frames.forEach((f, i) => f.addEventListener('focusin', () => stripTo(i)));

    addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const r = pc.getBoundingClientRect();
      if (!(r.top <= innerHeight / 2 && r.bottom >= innerHeight / 2)) return;
      stepFrame(e.key === 'ArrowLeft' ? -1 : 1);
    });

    // ponytail: one card per wheel gesture (lock extends while momentum events arrive); tune 420/120 if trackpads feel sticky
    let lockUntil = 0;
    pc.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return; // horizontal swipes + pinch stay native
      const now = performance.now();
      if (now < lockUntil) { e.preventDefault(); lockUntil = Math.max(lockUntil, now + 120); return; }
      const dir = e.deltaY > 0 ? 1 : -1, i = fbIndex();
      if ((dir < 0 && i === 0) || (dir > 0 && i === N - 1)) return; // at an end: let the page scroll
      e.preventDefault();
      stripTo(i + dir);
      lockUntil = now + 420;
    }, { passive: false });

    track.addEventListener('scroll', () => setLive(fbIndex()), { passive: true });
    setLive(fbIndex());
  });
})();
