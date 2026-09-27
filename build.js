#!/usr/bin/env node
/**
 * Portfolio build script. No dependencies.
 *
 *   node build.js          → validates content/*.md, renders src/template.html → dist/
 *
 * Content lives in content/site.md + content/sections/*.md (hand-editable Markdown,
 * see README.md). Design lives in src/template.html + static/site.css + static/app.js.
 * Posts are pulled from the Substack and Medium RSS feeds at build time.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse, md, escapeHtml, escapeAttr } = require('./src/content');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const STATIC = path.join(ROOT, 'static');
const errors = [];

// ── Load content ────────────────────────────────────────────────────────────
// Private blocklist, kept out of the public repo: FORBIDDEN env var (CI secret) or gitignored .forbidden file; comma- or newline-separated.
let privateNames = process.env.FORBIDDEN || '';
try { privateNames ||= fs.readFileSync(path.join(ROOT, '.forbidden'), 'utf8'); } catch {}
const FORBIDDEN = ['[METRIC NEEDED]', '[UNKNOWN]', ...privateNames.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)];
if (FORBIDDEN.length === 2) {
  const msg = 'no private blocklist: set the FORBIDDEN secret (CI) or create .forbidden';
  if (process.env.CI) errors.push(msg); else console.warn(`! ${msg}`);
}

function checkForbidden(name, text) {
  for (const f of FORBIDDEN) {
    if (text && text.includes(f)) errors.push(`${name}: contains forbidden string "${f}" (internal name or unfilled metric)`);
  }
}

function load(rel) {
  let text;
  try { text = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { errors.push(`${rel}: missing or unreadable`); return null; }
  checkForbidden(rel, text);
  return parse(text);
}
const site = load('content/site.md');

const csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const mdLinks = (s) => [...String(s || '').matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((m) => ({ label: m[1], href: m[2] }));
const grp = (d, name) => (d ? d.groups.find((g) => g.title.trim().toLowerCase() === name) : null);

const sectionIds = site ? csv(site.fields.sections) : [];
const docs = {};
for (const id of sectionIds) {
  docs[id] = load(`content/sections/${id}.md`);
}
if (errors.length) fail();

// ── Validation ──────────────────────────────────────────────────────────────
function checkHref(name, href) {
  if (!/^(https?:\/\/|mailto:|#)/.test(href || '')) errors.push(`${name}: bad href "${href}"`);
}
function need(name, fields, keys) {
  for (const k of keys) {
    if (!String(fields?.[k] ?? '').trim()) errors.push(`${name}: missing required field "${k}"`);
  }
}

need('site.md', site.fields, ['title', 'description', 'ogDescription', 'url',
  'jsonldName', 'jsonldJobTitle', 'jsonldWorksFor', 'jsonldEmail', 'sameAs',
  'rail', 'colophon', 'sections']);
csv(site.fields.sameAs).forEach((u, i) => checkHref(`site.sameAs[${i}]`, u));
if (!sectionIds.length) errors.push('site.md: "sections" lists no sections');
const BOOT_ON = site.fields.boot === 'on';
if (site.fields.boot && !['on', 'off'].includes(site.fields.boot)) errors.push('site.md: "boot" must be on or off');
if (BOOT_ON) need('site.md', site.fields, ['bootTitle']);
if (!(grp(site, 'easter egg') || {}).list?.length) errors.push('site.md: missing "# Easter egg" list');

const hero = grp(site, 'hero');
if (!hero) errors.push('site.md: missing "# Hero" group');
else {
  need('site.md # Hero', hero.fields, ['overline', 'title', 'primary', 'secondary']);
  if (!hero.body.length) errors.push('site.md # Hero: missing lede (group body)');
  for (const k of ['primary', 'secondary']) {
    if (hero.fields[k] && !mdLinks(hero.fields[k]).length) errors.push(`site.md # Hero: "${k}" must be a [label](url) link`);
  }
  mdLinks(hero.fields.primary).concat(mdLinks(hero.fields.secondary)).forEach((l) => checkHref('site.md # Hero', l.href));
}
const deployLog = grp(site, 'deploy log');
if (!deployLog || !deployLog.items.length) errors.push('site.md: missing "# Deploy log" items');
else deployLog.items.forEach((r) => {
  need(`site.md # Deploy log ## ${r.title}`, r.fields, ['time', 'status', 'tone']);
  if (r.fields.tone && !['ok', 'amber', 'green'].includes(r.fields.tone)) errors.push(`site.md # Deploy log ## ${r.title}: tone must be ok, amber or green`);
});
const proof = grp(site, 'proof');
if (!proof || !proof.list.length) errors.push('site.md: missing "# Proof" list');

const TYPES = ['cases', 'projects', 'feed', 'stack', 'contact', 'text'];
for (const id of sectionIds) {
  const d = docs[id];
  if (!d) continue;
  const t = d.fields.type;
  if (!TYPES.includes(t)) { errors.push(`${id}.md: unknown section type "${t}"`); continue; }
  need(`${id}.md`, d.fields, ['title']);
  const at = (n) => `${id}.md ${n}`;
  switch (t) {
    case 'cases':
      if (!d.body.length) errors.push(at('(root)') + ': missing intro (root body)');
      if (!d.groups.length) errors.push(at('(root)') + ': no "# Org" groups');
      d.groups.forEach((g) => {
        need(at(`# ${g.title}`), g.fields, ['meta']);
        if (!g.body.length) errors.push(at(`# ${g.title}`) + ': missing org sub (group body)');
        if (!g.items.length) errors.push(at(`# ${g.title}`) + ': no "## Case" items');
        g.items.forEach((c) =>
          need(at(`# ${g.title} ## ${c.title}`), c.fields, ['subtitle', 'badge', 'status', 'problem', 'shipped', 'proof', 'tags']));
      });
      break;
    case 'projects':
      d.items.forEach((c) => {
        need(at(`## ${c.title}`), c.fields, ['subtitle', 'badge', 'year', 'proof', 'tags']);
        if (!c.body.length) errors.push(at(`## ${c.title}`) + ': missing desc (item body)');
        mdLinks(c.fields.links).forEach((l) => checkHref(at(`## ${c.title}`), l.href));
      });
      (grp(d, 'publications')?.items || []).forEach((p) => {
        need(at(`# Publications ## ${p.title}`), p.fields, ['year', 'venue', 'url']);
        checkHref(at(`# Publications ## ${p.title}`), p.fields.url);
      });
      break;
    case 'feed':
      need(`${id}.md`, d.fields, ['heading', 'headingLink']);
      if (d.fields.headingLink && !mdLinks(d.fields.headingLink).length) errors.push(`${id}.md: "headingLink" must be a [label](url) link`);
      mdLinks(d.fields.headingLink).concat(mdLinks(d.fields.chips)).forEach((l) => checkHref(`${id}.md`, l.href));
      (grp(d, 'pinned')?.items || []).forEach((p) => {
        need(at(`# Pinned ## ${p.title}`), p.fields, ['url']);
        checkHref(at(`# Pinned ## ${p.title}`), p.fields.url);
      });
      break;
    case 'stack':
      d.items.forEach((c) => { if (!c.list.length) errors.push(at(`## ${c.title}`) + ': empty cluster (no "- " lines)'); });
      break;
    case 'contact':
      need(`${id}.md`, d.fields, ['display']);
      if (!d.body.length) errors.push(at('(root)') + ': missing pitch (root body)');
      d.items.forEach((l) => {
        need(at(`## ${l.title}`), l.fields, ['value', 'url']);
        checkHref(at(`## ${l.title}`), l.fields.url);
      });
      break;
  }
}
if (errors.length) fail();

// ── RSS feeds (build time) ──────────────────────────────────────────────────
const FEED_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const decodeEntities = (s) => s.replace(/&(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);/g, (m, e) =>
  e === 'amp' ? '&' : e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'quot' ? '"' :
  String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

async function fetchFeed(url, source) {
  if (!url) return [];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': FEED_UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = [];
    for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
      const field = (tag) => (m[0].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [, ''])[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      const link = field('link').split('?source=')[0];
      if (!link.startsWith('https://')) continue;
      items.push({
        title: decodeEntities(field('title')).replace(/\s*[\u2014\u2013]\s*/g, ' - ').trim(),
        link,
        date: new Date(field('pubDate')),
        source,
      });
    }
    if (!items.length) console.warn(`! ${source} feed: fetched but no usable items`);
    return items;
  } catch (e) {
    console.warn(`! ${source} feed failed: ${e.message}`);
    return [];
  }
}

const shortDate = (d) => isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// ── Renderers ───────────────────────────────────────────────────────────────
const ROMAN_MAP = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const roman = (n) => { let s = ''; for (const [v, r] of ROMAN_MAP) while (n >= v) { s += r; n -= v; } return s; };
const pad2 = (n) => String(n).padStart(2, '0');

const rects = (list) => list.map((r) => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/>`).join('');
const px = (list) => `<svg viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${rects(list)}</svg>`;
const ICONS = {
  experience: px([[8, 4, 8, 2], [8, 4, 2, 5], [14, 4, 2, 5], [4, 8, 16, 4], [4, 14, 16, 6], [11, 12, 2, 2]]),
  projects: px([[5, 5, 14, 4], [10, 7, 4, 2], [6, 11, 12, 9], [11, 11, 2, 5]]),
  writing: px([[7, 3, 10, 2], [7, 3, 2, 18], [15, 3, 2, 18], [7, 19, 10, 2], [10, 8, 5, 1], [10, 11, 5, 1], [10, 14, 5, 1]]),
  contact: px([[4, 6, 16, 2], [4, 18, 16, 2], [4, 6, 2, 14], [18, 6, 2, 14], [7, 9, 2, 2], [9, 11, 2, 2], [11, 13, 2, 2], [13, 11, 2, 2], [15, 9, 2, 2]]),
};

const secHead = (d, idx, id) => `      <div class="sec-head reveal">
        <div class="sec-tag">${ICONS[id] || ''}<span class="sec-roman">§ ${roman(idx + 1)}</span><span class="sec-name">${md(d.fields.title)}</span></div>
        ${d.fields.display ? `<h2 class="display">${md(d.fields.display)}</h2>` : ''}
      </div>`;

const tags = (list) =>
  `          <div class="tags">${list.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;

function renderNavLinks() {
  return sectionIds
    .filter((id) => docs[id]?.fields.nav)
    .map((id) => `        <a href="#${escapeAttr(id)}">${ICONS[id] || ''}${escapeHtml(docs[id].fields.nav)}</a>`).join('\n');
}

function renderHero() {
  const f = hero.fields;
  const [primary, secondary] = [mdLinks(f.primary)[0], mdLinks(f.secondary)[0]];
  const rows = deployLog.items.map((r) => `            <li><time>${escapeHtml(r.fields.time)}</time><span class="f-what">${escapeHtml(r.title)}</span><span class="f-st${r.fields.tone === 'ok' ? '' : ` ${r.fields.tone}`}">${escapeHtml(r.fields.status)}</span></li>`).join('\n');
  return `        <div class="hero-left">
          <p class="overline">${md(f.overline)}</p>
          <h1 data-scramble>${md(f.title)}</h1>
          <p class="lede">${md(hero.body.join(' '))}</p>
          <div class="hero-cta">
            <a href="${escapeAttr(primary.href)}" class="btn-main">${escapeHtml(primary.label)}</a>
            <a href="${escapeAttr(secondary.href)}" class="cta-link">${escapeHtml(secondary.label)}</a>
          </div>
          <div class="filed">
            <div class="filed-head"><span class="f-label">DEPLOY LOG</span><span id="clock"></span></div>
            <ol class="filed-log">
${rows}
            </ol>
          </div>
        </div>
        <div class="scene-stage" aria-hidden="true"></div>`;
}

function renderMarquee() {
  const items = proof.list.map((l) =>
    `<span class="mq${l.startsWith('$') ? ' mq-cmd' : ''}">${md(l)}</span>`).join('<span class="mq-sep">/</span>');
  return `          <span class="mq-half">${items}</span><span class="mq-half mq-dup" aria-hidden="true">${items}</span>`;
}

function section(id, inner) {
  return `    <section id="${escapeAttr(id)}">
      <div class="container">
${inner}
      </div>
    </section>`;
}

// Scroll-driven carousel: full-bleed .pc block (markup consumed by carousel.js).
function carousel(cells, noun, compact) {
  return `      <div class="pc${compact ? ' pc-compact' : ''}">
        <div class="pc-stage">
          <div class="pc-track">
${cells.map((c) => `          <div class="pc-cell">
            <span class="pc-num">${c.label}</span>
            <article class="pc-frame" tabindex="0">
            <div class="pc-cover" aria-hidden="true">${c.cover}</div>
            <div class="pc-info">
${c.info}
            </div>
          </article>
          </div>`).join('\n')}
          </div>
          <div class="pc-ui">
            <button type="button" class="pc-btn pc-prev" aria-label="Previous ${noun}">←</button>
            <span class="pc-count" aria-live="polite">01 / ${pad2(cells.length)}</span>
            <button type="button" class="pc-btn pc-next" aria-label="Next ${noun}">→</button>
          </div>
        </div>
      </div>`;
}

function renderCases(d, id, idx) {
  let num = 0;
  const filters = `      <div class="filters js-only reveal">
        <button class="fchip" data-org="all" aria-pressed="true">All</button>
${d.groups.map((g) => `        <button class="fchip" data-org="${escapeAttr(g.fields.id || g.title)}" aria-pressed="false">${escapeHtml(g.fields.short || g.title)}</button>`).join('\n')}
      </div>`;
  const orgs = d.groups.map((org) => {
    const oid = org.fields.id || org.title;
    const cells = org.items.map((c) => {
      const f = c.fields;
      const n = pad2(++num);
      return {
        label: `${n} · ${escapeHtml(c.title)}`,
        cover: n,
        info: `              <p class="case-line">${escapeHtml(f.badge)} · ${escapeHtml(f.status)}</p>
              <h3 class="pc-title"><span class="pc-rl"><span>${md(c.title)}</span></span></h3>
              <p class="case-sub pc-sub"><span class="pc-rl"><span>${md(f.subtitle)}</span></span></p>
              <p class="case-proof">${md(f.proof)}</p>
${tags(csv(f.tags))}
            <details class="case-detail">
              <summary><span class="s-open">Read the case ↓</span><span class="s-close">Close ↑</span></summary>
              <div class="case-cols">
                <div class="case-problem">
                  <p class="case-label">The problem</p>
                  <p>${md(f.problem)}</p>
                </div>
                <div class="case-shipped">
                  <p class="case-label">What I shipped</p>
                  <p>${md(f.shipped)}</p>
                </div>
              </div>
            </details>`,
      };
    });
    const also = org.list.length ? `      <div class="container">
        <div class="case-more reveal">
          <h4 class="era-head">Also in this era</h4>
          <ul class="bullets">
${org.list.map((it) => `            <li>${md(it)}</li>`).join('\n')}
          </ul>
        </div>
      </div>` : '';
    return `      <div class="org" id="${escapeAttr(oid)}" data-org="${escapeAttr(oid)}">
        <div class="container">
          <div class="org-head reveal">
            <h3 class="org-name">${escapeHtml(org.title)}</h3>
            <span class="org-meta">${escapeHtml(org.fields.meta)}</span>${org.fields.badge ? `
            <span class="org-badge">${escapeHtml(org.fields.badge)}</span>` : ''}
          </div>
          <p class="org-sub reveal">${md(org.body.join(' '))}</p>
        </div>
${carousel(cells, 'case', false)}${also ? `\n${also}` : ''}
      </div>`;
  }).join('\n\n');

  return `    <section id="${escapeAttr(id)}">
      <div class="container">
${secHead(d, idx, id)}
      <p class="sec-intro reveal">${md(d.body.join(' '))}</p>
${filters}
      </div>
${orgs}
    </section>`;
}

function renderProjects(d, id, idx) {
  const cells = d.items.map((c, i) => {
    const f = c.fields;
    const links = mdLinks(f.links).map((l) =>
      `              <a class="mchip" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`);
    const chips = csv(f.chips).map((t) => `              <span class="mchip">${escapeHtml(t)}</span>`);
    const cover = f.cover || c.title.trim().slice(0, 2);
    return {
      label: `${pad2(i + 1)} · ${escapeHtml(c.title)}`,
      cover: escapeHtml(cover),
      info: `              <p class="case-line">${escapeHtml(f.badge)} · ${escapeHtml(f.year)}</p>
              <h3 class="pc-title"><span class="pc-rl"><span>${md(c.title)}</span></span></h3>
              <p class="case-sub pc-sub"><span class="pc-rl"><span>${md(f.subtitle)}</span></span></p>
              <p class="case-desc">${md(c.body.join(' '))}</p>
              <p class="case-proof">${md(f.proof)}</p>
${[...links, ...chips].length ? `              <div class="links-row">\n${[...links, ...chips].join('\n')}\n              </div>` : ''}
${tags(csv(f.tags))}`,
    };
  });

  const pubs = grp(d, 'publications');
  const pubCells = pubs ? pubs.items.map((p, i) => {
    const n = pad2(i + 1);
    return {
      label: `${n} · ${escapeHtml(p.fields.year)}`,
      cover: n,
      info: `              <p class="case-line">${md(p.fields.venue)} · ${escapeHtml(p.fields.year)}</p>
              <h3 class="pc-title"><span class="pc-rl"><span>${md(p.title)}</span></span></h3>
              <div class="links-row">
              <a class="mchip" href="${escapeAttr(p.fields.url)}" target="_blank" rel="noopener">Read the paper ↗</a>
              </div>`,
    };
  }) : [];

  return `    <section id="${escapeAttr(id)}">
      <div class="container">
${secHead(d, idx, id)}
      </div>
${carousel(cells, 'project', false)}${pubs ? `
      <div class="org" id="publications">
        <div class="container">
          <div class="org-head reveal">
            <h3 class="org-name">${escapeHtml(pubs.title)}</h3>
            <span class="org-meta">${escapeHtml(pubs.fields.meta || '')} · ${pubs.items.length} papers</span>
          </div>
        </div>
${carousel(pubCells, 'paper', true)}${pubs.body.length ? `
        <div class="container">
      <p class="research-note reveal">${md(pubs.body.join(' '))}</p>
        </div>` : ''}
      </div>` : ''}
    </section>`;
}

function linkedinFrame(line) {
  let urn = (line.match(/urn:li:(?:share|ugcPost|activity):\d+/) || [])[0];
  if (!urn) { const a = line.match(/activity-(\d{15,25})/); if (a) urn = `urn:li:activity:${a[1]}`; }
  if (!urn) {
    errors.push(`writing.md: invalid LinkedIn line "${line.length > 100 ? line.slice(0, 100) + '…' : line}"`);
    return '';
  }
  const height = (line.match(/height="(\d+)"/) || [])[1] || '550';
  return `        <iframe src="https://www.linkedin.com/embed/feed/update/${urn}" height="${height}" loading="lazy" title="LinkedIn post" allowfullscreen></iframe>`;
}

const feedCounts = {};
async function renderFeed(d, id, idx) {
  const f = d.fields;
  const head = mdLinks(f.headingLink)[0] || {};
  const pinned = grp(d, 'pinned')?.items || [];
  const fetched = (await Promise.all([fetchFeed(f.substack, 'Substack'), fetchFeed(f.medium, 'Medium')]))
    .flat().sort((a, b) => b.date - a.date).slice(0, parseInt(f.limit, 10) || 6);
  feedCounts[id] = fetched.length || pinned.length;
  let rows;
  if (fetched.length) {
    rows = fetched.map((p) => `          <li><a class="post" href="${escapeAttr(p.link)}" target="_blank" rel="noopener"><span class="post-t">${escapeHtml(p.title)}</span><span class="post-m">${p.source} · ${shortDate(p.date)}</span></a></li>`).join('\n');
  } else {
    rows = pinned.map((p) =>
      `          <li><a class="post" href="${escapeAttr(p.fields.url)}" target="_blank" rel="noopener"><span class="post-t">${escapeHtml(p.title)}</span></a></li>`).join('\n');
  }
  const embeds = (grp(d, 'linkedin')?.list || []).map(linkedinFrame).filter(Boolean);
  const chips = mdLinks(f.chips).map((c) =>
    `          <a class="mchip" href="${escapeAttr(c.href)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('\n');
  return section(id, `${secHead(d, idx, id)}
      <div class="writing-grid reveal">
        <div class="writing-meta">
          <div class="col-head">
            <h3>${escapeHtml(f.heading)}</h3>
            <a href="${escapeAttr(head.href || '')}" target="_blank" rel="noopener">${escapeHtml(head.label || '')}</a>
          </div>
          <p class="col-sub">${md(d.body.join(' '))}</p>
          <div class="chip-row">
${chips}
          </div>
        </div>
        <div class="writing-list">
          <ul class="posts">
${rows}
          </ul>${embeds.length ? `
          <div class="li-grid">
${embeds.join('\n')}
          </div>` : ''}
        </div>
      </div>`);
}

function renderStack(d, id, idx) {
  const cells = d.items.map((c, i) => `        <div class="stack-cell">
          <h4><span class="n">${String.fromCharCode(65 + i)}/</span>${escapeHtml(c.title)}</h4>
          <div class="stack-items">
            ${c.list.map((it) => `<span>${escapeHtml(it)}</span>`).join('')}
          </div>
        </div>`).join('\n');
  return section(id, `${secHead(d, idx, id)}
      <div class="stack-grid reveal">
${cells}
      </div>`);
}

function renderContact(d, id, idx) {
  const links = d.items.map((l) =>
    `          <li><a class="c-card" href="${escapeAttr(l.fields.url)}"${l.fields.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span class="c-k">${escapeHtml(l.title)}</span><span class="c-v">${escapeHtml(l.fields.value)}</span><span class="c-arr" aria-hidden="true">↗</span></a></li>`).join('\n');
  return section(id, `${secHead(d, idx, id)}
      <p class="pitch reveal">${md(d.body.join(' '))}</p>
      <ul class="contact-cards reveal">
${links}
      </ul>`);
}

function renderText(d, id, idx) {
  const cells = d.list.map((it, i) => {
    const n = pad2(i + 1);
    return {
      label: n,
      cover: n,
      info: `              <p class="pc-title pc-text"><span class="pc-rl"><span>${md(it)}</span></span></p>`,
    };
  });
  return `    <section id="${escapeAttr(id)}">
      <div class="container">
${secHead(d, idx, id)}
${d.body.map((p) => `      <p class="sec-intro reveal">${md(p)}</p>`).join('\n')}
      </div>${d.list.length ? `
${carousel(cells, 'item', true)}` : ''}
    </section>`;
}

const RENDER = { cases: renderCases, projects: renderProjects, feed: renderFeed, stack: renderStack, contact: renderContact, text: renderText };

// ── Boot sequence + build bot ───────────────────────────────────────────────
function renderBoot() {
  const detail = (id) => {
    const d = docs[id];
    if (!d) return '';
    switch (d.fields.type) {
      case 'cases': return `${d.groups.reduce((n, g) => n + g.items.length, 0)} case files`;
      case 'projects': { const pubs = grp(d, 'publications'); return `${d.items.length} builds${pubs ? `, ${pubs.items.length} papers` : ''}`; }
      case 'feed': return `${feedCounts[id] || 0} posts`;
      case 'stack': return `${d.items.reduce((n, c) => n + c.list.length, 0)} tools`;
      case 'text': return `${d.list.length} items`;
      case 'contact': return `${d.items.length} channels`;
      default: return '';
    }
  };
  const data = JSON.stringify({
    title: site.fields.bootTitle || '',
    modules: sectionIds.map((id) => ({ id, detail: detail(id) })),
  }).replace(/</g, '\\u003c');
  return `  <div id="boot" aria-hidden="true">
    <pre class="boot-log"></pre>
    <p class="boot-foot">Press ESC or ENTER to skip</p>
  </div>
  <script type="application/json" id="boot-data">${data}</script>`;
}

// Build bot: 32x40 pixel grid, ink silhouette + paper cut-outs. Original art.
const EGG_INK = [
  [12, 4, 8, 1], // hood top
  ...[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((y) => [11, y, 10, 1]), // head
  [12, 16, 8, 1], // chin
  [12, 3, 8, 1], [10, 9, 1, 3], [21, 9, 1, 3], // headset band + cups
  [11, 17, 10, 1], // shoulders
  ...[18, 19, 20, 21, 22, 23, 24, 25, 26].map((y) => [10, y, 12, 1]), // hoodie torso
  [11, 27, 10, 1],
  [9, 18, 1, 6], // left arm
  [12, 28, 3, 2], [17, 28, 3, 2], // legs
];
const EGG_PAPER = [
  [13, 8, 6, 7], // face
  [15, 18, 1, 8], // zipper
  [13, 18, 1, 2], [17, 18, 1, 2], // drawstrings
  [10, 12, 1, 1], [11, 13, 2, 1], // mic boom
  [12, 20, 7, 4], // laptop
];
const EGG_IDLE = [[22, 18, 1, 6]]; // right arm down
const EGG_WAVE = [[22, 10, 2, 7], [21, 16, 2, 2], [22, 8, 2, 2]]; // arm up + hand
const EGG_FACE = [[13, 21, 5, 2], [13, 13, 1, 1]]; // laptop screen + mic tip
const EGG_EYES = [[13, 10, 2, 2], [15, 10, 2, 1], [17, 10, 2, 2]]; // glasses

function renderEgg() {
  const lines = grp(site, 'easter egg').list;
  const svg = `<svg viewBox="0 0 32 40" shape-rendering="crispEdges" aria-hidden="true"><g transform="translate(0 4)"><g class="egg-ink">${rects(EGG_INK)}</g><g class="egg-paper">${rects(EGG_PAPER)}</g><g class="egg-pose-idle">${rects(EGG_IDLE)}</g><g class="egg-pose-wave">${rects(EGG_WAVE)}</g><g class="egg-face">${rects(EGG_FACE)}</g><g class="egg-eyes">${rects(EGG_EYES)}</g></g></svg>`;
  return `  <aside class="egg" aria-hidden="true">
    <div class="egg-bubble">
      <p class="egg-line" aria-live="polite"></p>
      <button type="button" class="egg-x" aria-label="Dismiss">×</button>
    </div>
    <button type="button" class="egg-bot" aria-label="Build bot, click for another tip">${svg}</button>
  </aside>
  <script type="application/json" id="egg-data">${JSON.stringify(lines).replace(/</g, '\\u003c')}</script>`;
}

function renderJsonld() {
  const f = site.fields;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: f.jsonldName,
    jobTitle: f.jsonldJobTitle,
    worksFor: { '@type': 'Organization', name: f.jsonldWorksFor },
    url: f.url,
    email: f.jsonldEmail,
    sameAs: csv(f.sameAs),
  }, null, 2);
}

// ── Assemble ────────────────────────────────────────────────────────────────
async function main() {
  let html = fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8');

  const av = crypto.createHash('md5');
  const assetFiles = fs.readdirSync(STATIC).filter((f) => /\.(css|js)$/.test(f)).sort();
  for (const f of assetFiles) av.update(fs.readFileSync(path.join(STATIC, f)));

  const sections = [];
  for (const [i, id] of sectionIds.entries()) {
    const d = docs[id];
    if (!d) continue;
    sections.push(await RENDER[d.fields.type](d, id, i));
  }
  const slots = {
    TITLE: escapeAttr(site.fields.title),
    DESCRIPTION: escapeAttr(site.fields.description),
    OG_DESCRIPTION: escapeAttr(site.fields.ogDescription),
    URL: escapeAttr(site.fields.url),
    JSONLD: renderJsonld(),
    ASSET_V: av.digest('hex').slice(0, 8),
    RAIL: escapeHtml(site.fields.rail),
    NAV_LINKS: renderNavLinks(),
    HERO: renderHero(),
    MARQUEE: renderMarquee(),
    SECTIONS: sections.join('\n\n'),
    COLOPHON: md(site.fields.colophon).replace('{year}', String(new Date().getFullYear())),
    BOOT_ON: BOOT_ON ? 'true' : 'false',
    BOOT: BOOT_ON ? renderBoot() : '',
    EGG: renderEgg(),
  };

  // Unique words from the rendered copy; the text-art canvas draws through them as a mask.
  const artText = decodeEntities([slots.HERO, slots.MARQUEE, slots.SECTIONS].join(' ').replace(/<[^>]+>/g, ' '));
  const seen = new Set();
  const artWords = [];
  let artTotal = 0;
  for (const m of artText.matchAll(/[\p{L}\p{N}][\p{L}\p{N}+#'./-]*[\p{L}\p{N}+#]|[\p{L}\p{N}]/gu)) {
    if (m[0].length < 2) continue;
    artTotal++;
    const k = m[0].toLowerCase();
    if (!seen.has(k)) { seen.add(k); artWords.push(m[0]); }
  }
  slots.ART = `  <script type="application/json" id="art-words">${JSON.stringify(artWords).replace(/</g, '\\u003c')}</script>`;

  for (const [k, v] of Object.entries(slots)) html = html.split(`{{${k}}}`).join(v);

  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) errors.push(`template: unfilled slots ${[...new Set(leftover)].join(', ')}`);

  // No em/en dashes anywhere in the rendered site or in static assets we ship verbatim.
  const dashCheck = (name, text) => {
    const m = text.match(/[\u2014\u2013]/);
    if (m) errors.push(`${name}: contains an em/en dash: "...${text.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\n/g, ' ').trim()}..."`);
  };
  dashCheck('index.html', html);
  for (const f of fs.readdirSync(STATIC).filter((f) => /\.(html|css|js)$/.test(f))) {
    dashCheck(`static/${f}`, fs.readFileSync(path.join(STATIC, f), 'utf8'));
  }
  if (errors.length) fail();

  // ── Write dist/ ──
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  for (const f of fs.readdirSync(STATIC)) {
    fs.copyFileSync(path.join(STATIC, f), path.join(OUT, f));
  }

  console.log('✔ build ok');
  console.log(`  sections: ${sectionIds.join(', ')}`);
  console.log(`  assets: ${assetFiles.join(', ')} · v=${slots.ASSET_V}`);
  console.log(`  art words: ${artWords.length} unique of ${artTotal} total`);
  console.log(`  dist/index.html · ${(html.length / 1024).toFixed(1)} KB`);
}

main().catch((e) => { console.error('✖ build failed:', e); process.exit(1); });

function fail() {
  console.error('✖ build failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
