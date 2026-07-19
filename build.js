#!/usr/bin/env node
/**
 * Portfolio build script — no dependencies.
 *
 *   node build.js          → validates content/*.json, renders src/template.html → dist/
 *
 * Content lives in content/*.json (hand-editable). Design lives in src/template.html.
 * Inline markup in content strings: **bold**, *italic*, [text](url). Everything else
 * is escaped, so content can never break the page.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const errors = [];

// ── Load content ────────────────────────────────────────────────────────────
function load(name) {
  const p = path.join(ROOT, 'content', name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    return null;
  }
}
const site = load('site.json');
const experience = load('experience.json');
const projects = load('projects.json');
const research = load('research.json');
const writing = load('writing.json');
const stack = load('stack.json');
if (errors.length) fail();

// ── Inline markup: escape HTML, then **b** / *i* / [t](u) ──────────────────
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

function md(s) {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, href) =>
    href.startsWith('#')
      ? `<a href="${escapeAttr(href)}">${text}</a>`
      : `<a href="${escapeAttr(href)}" target="_blank" rel="noopener">${text}</a>`);
  return out;
}

// ── Validation ──────────────────────────────────────────────────────────────
const FORBIDDEN = ['[METRIC NEEDED]', '[UNKNOWN]', 'MDTGPT', 'UiFilterNode',
  'Dialog Advance', 'Doppler', 'Odin gateway', 'CCR-1356', 'TPO'];

function checkForbidden(name, obj) {
  const text = JSON.stringify(obj);
  for (const f of FORBIDDEN) {
    if (text.includes(f)) errors.push(`${name}: contains forbidden string "${f}" (internal name or unfilled metric)`);
  }
}
function checkHref(name, href) {
  if (!/^(https?:\/\/|mailto:|#)/.test(href || '')) errors.push(`${name}: bad href "${href}"`);
}
function need(name, obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)) {
      errors.push(`${name}: missing required field "${k}"`);
    }
  }
}

checkForbidden('site.json', site);
checkForbidden('experience.json', experience);
checkForbidden('projects.json', projects);
checkForbidden('research.json', research);
checkForbidden('writing.json', writing);
checkForbidden('stack.json', stack);

need('site.meta', site.meta, ['title', 'description', 'ogDescription', 'url']);
need('site.hero', site.hero, ['overline', 'title', 'lede', 'actions']);
site.nav.links.forEach((l, i) => { need(`site.nav.links[${i}]`, l, ['label', 'href']); checkHref(`site.nav.links[${i}]`, l.href); });
site.hero.actions.forEach((a, i) => checkHref(`site.hero.actions[${i}]`, a.href));
site.deployLog.forEach((r, i) => need(`site.deployLog[${i}]`, r, ['time', 'what', 'status', 'tone']));
site.contact.links.forEach((l, i) => checkHref(`site.contact.links[${i}]`, l.href));

need('experience', experience, ['sectionIndex', 'sectionName', 'intro', 'orgs']);
experience.orgs.forEach((org, i) => {
  need(`experience.orgs[${i}]`, org, ['name', 'meta', 'sub', 'cases']);
  org.cases.forEach((c, j) =>
    need(`experience.orgs[${i}].cases[${j}]`, c, ['badge', 'status', 'title', 'subtitle', 'problem', 'shipped', 'proof', 'tags']));
});

projects.rows.forEach((r, i) => {
  need(`projects.rows[${i}]`, r, ['badge', 'year', 'title', 'subtitle', 'desc', 'proof', 'tags']);
  (r.links || []).forEach((l) => checkHref(`projects.rows[${i}].links`, l.href));
});

need('research', research, ['publications', 'note']);
research.publications.forEach((p, i) => {
  need(`research.publications[${i}]`, p, ['year', 'title', 'venue', 'href']);
  checkHref(`research.publications[${i}]`, p.href);
});

need('writing', writing, ['heading', 'feedUrl', 'fallbackPosts', 'chips']);
stack.clusters.forEach((c, i) => need(`stack.clusters[${i}]`, c, ['index', 'name', 'items']));

if (errors.length) fail();

// ── Renderers ───────────────────────────────────────────────────────────────
const secLabel = (idx, name) =>
  `      <div class="sec-label reveal"><span class="idx">${escapeHtml(idx)}</span><span class="name">${md(name)}</span></div>`;

const BADGE_CLASS = { oss: 'badge-oss', prod: 'badge-prod', research: 'badge-research', private: 'badge-private' };
const badge = (label, type) =>
  `<span class="badge ${BADGE_CLASS[type] || 'badge-research'}"><span class="bdot" aria-hidden="true"></span>${escapeHtml(label)}</span>`;

const tags = (list) =>
  `<div class="tags">${list.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;

function renderNav() {
  const links = site.nav.links.map((l) =>
    `        <li><a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a></li>`).join('\n');
  return [
    `      <a href="#top" class="logo">${escapeHtml(site.nav.logo)}<span class="path">${escapeHtml(site.nav.logoPath)}</span></a>`,
    `      <ul class="nav-links">\n${links}\n      </ul>`,
    `      <a href="${escapeAttr(site.nav.statusPill.href)}" class="status-pill"><span class="dot" aria-hidden="true"></span>${escapeHtml(site.nav.statusPill.label)}</a>`,
  ].join('\n');
}

function renderHero() {
  const actions = site.hero.actions.map((a) =>
    `            <a href="${escapeAttr(a.href)}" class="btn btn-${a.style === 'amber' ? 'amber' : 'ghost'}">${escapeHtml(a.label)}</a>`).join('\n');
  return `        <div>
          <p class="overline">${md(site.hero.overline)}</p>
          <h1>${md(site.hero.title)}</h1>
          <p class="lede">${md(site.hero.lede)}</p>
          <div class="hero-actions">
${actions}
          </div>
        </div>`;
}

function renderDeployLog() {
  return site.deployLog.map((r, i) => `            <li style="animation-delay: ${(1.0 + i * 0.15).toFixed(2)}s">
              <time>${escapeHtml(r.time)}</time>
              <span class="what">${escapeHtml(r.what)}</span>
              <span class="leader" aria-hidden="true"></span>
              <span class="st st-${r.tone === 'amber' ? 'amber' : 'ok'}">${escapeHtml(r.status)}</span>
            </li>`).join('\n');
}

function renderProof() {
  return site.proof.map((p) => p.cmd
    ? `        <span class="proof-item"><span class="cmd">${escapeHtml(p.cmd)}</span></span>`
    : `        <span class="proof-item"><b>${escapeHtml(p.big)}</b> ${escapeHtml(p.text)}</span>`).join('\n');
}

function renderCase(c, num) {
  return `      <article class="work-row reveal">
        <div>
          <div class="work-num" aria-hidden="true">${num}</div>
          <div class="work-meta">
            ${badge(c.badge, 'research')}
            <span class="work-year">${escapeHtml(c.status)}</span>
          </div>
        </div>
        <div class="work-body">
          <h3>${md(c.title)} <span class="sub">— ${md(c.subtitle)}</span></h3>
          <div class="case-cols">
            <div class="case-problem">
              <p class="case-label">The problem</p>
              <p>${md(c.problem)}</p>
            </div>
            <div class="case-shipped">
              <p class="case-label">What I shipped</p>
              <p>${md(c.shipped)}</p>
            </div>
          </div>
          <p class="work-proof">${md(c.proof)}</p>
          <div class="work-foot">
            ${tags(c.tags)}
          </div>
        </div>
      </article>`;
}

function renderExperience() {
  let num = 0;
  const orgs = experience.orgs.map((org, i) => {
    const head = `      <div class="org-head${i > 0 ? ' later' : ''} reveal"${org.id ? ` id="${escapeAttr(org.id)}"` : ''}>
        <h3 class="org-name">${escapeHtml(org.name)}</h3>
        <span class="org-meta">${escapeHtml(org.meta)}</span>${org.badge ? `
        ${badge(org.badge, 'prod')}` : ''}
      </div>
      <p class="org-sub reveal">${md(org.sub)}</p>`;
    const cases = org.cases.map((c) => renderCase(c, String(++num).padStart(2, '0'))).join('\n\n');
    const also = org.also ? `\n\n      <p class="case-more reveal">${md(org.also)}</p>` : '';
    return `${head}\n\n${cases}${also}`;
  }).join('\n\n');

  return `  <!-- ═══════════ EXPERIENCE ═══════════ -->
  <section id="experience">
    <div class="container">
${secLabel(experience.sectionIndex, experience.sectionName)}
      <p class="sec-intro reveal">${md(experience.intro)}</p>

${orgs}
    </div>
  </section>`;
}

function renderProjects() {
  const rows = projects.rows.map((r, i) => {
    const links = (r.links || []).map((l) =>
      `            <a class="chip" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`);
    const chips = (r.chips || []).map((c) => `            <span class="chip chip-static">${escapeHtml(c)}</span>`);
    return `      <article class="work-row reveal">
        <div>
          <div class="work-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
          <div class="work-meta">
            ${badge(r.badge.label, r.badge.type)}
            <span class="work-year">${escapeHtml(r.year)}</span>
          </div>
        </div>
        <div class="work-body">
          <h3>${md(r.title)} <span class="sub">— ${md(r.subtitle)}</span></h3>
          <p class="work-desc">${md(r.desc)}</p>
          <p class="work-proof">${md(r.proof)}</p>
          <div class="work-foot">
${[...links, ...chips].join('\n')}
            ${tags(r.tags)}
          </div>
        </div>
      </article>`;
  }).join('\n\n');

  return `  <!-- ═══════════ OPEN SOURCE & INDEPENDENT BUILDS ═══════════ -->
  <section id="work" style="padding-top:0">
    <div class="container">
${secLabel(projects.sectionIndex, projects.sectionName)}
${rows}
    </div>
  </section>`;
}

function renderResearch() {
  const pubs = research.publications.map((p) => `        <a class="pub" href="${escapeAttr(p.href)}" target="_blank" rel="noopener">
          <span class="pub-year">${escapeHtml(p.year)}</span>
          <span>
            <h4>${md(p.title)}</h4>
            <span class="venue">${md(p.venue)}</span>
          </span>
          <span class="pub-arrow">↗</span>
        </a>`).join('\n');
  return `  <!-- ═══════════ RESEARCH ═══════════ -->
  <section id="research" style="padding-top:0">
    <div class="container">
${secLabel(research.sectionIndex, research.sectionName)}
      <div class="pub-list reveal">
${pubs}
      </div>
      <p class="research-note reveal">${md(research.note)}</p>
    </div>
  </section>`;
}

function renderWriting() {
  const posts = writing.fallbackPosts.map((p) =>
    `          <li><a href="${escapeAttr(p.href)}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a></li>`).join('\n');
  const chips = writing.chips.map((c) =>
    `          <a class="chip" href="${escapeAttr(c.href)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('\n');
  return `  <!-- ═══════════ WRITING ═══════════ -->
  <section id="writing" style="padding-top:0">
    <div class="container">
${secLabel(writing.sectionIndex, writing.sectionName)}
      <div class="writing-col reveal">
        <div class="col-head">
          <h3>${escapeHtml(writing.heading)}</h3>
          <a href="${escapeAttr(writing.headingLink.href)}" target="_blank" rel="noopener">${escapeHtml(writing.headingLink.label)}</a>
        </div>
        <p class="col-sub">${md(writing.sub)}</p>
        <ul class="post-list" id="substack-posts">
${posts}
        </ul>
        <div class="work-foot" style="margin-top:22px">
${chips}
        </div>
      </div>
    </div>
  </section>`;
}

function renderStack() {
  const cells = stack.clusters.map((c) => `        <div class="stack-cell">
          <h4><span class="n">${escapeHtml(c.index)}</span>${escapeHtml(c.name)}</h4>
          <div class="stack-items">
            ${c.items.map((i) => `<span>${escapeHtml(i)}</span>`).join('')}
          </div>
        </div>`).join('\n');
  return `  <!-- ═══════════ STACK ═══════════ -->
  <section id="stack" style="padding-top:0">
    <div class="container">
${secLabel(stack.sectionIndex, stack.sectionName)}
      <div class="stack-grid reveal">
${cells}
      </div>
    </div>
  </section>`;
}

function renderContact() {
  const links = site.contact.links.map((l) => `          <li><a href="${escapeAttr(l.href)}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span class="k">${escapeHtml(l.label)}</span><span class="v">${escapeHtml(l.value)}</span></a></li>`).join('\n');
  return `  <!-- ═══════════ CONTACT ═══════════ -->
  <section id="contact" style="padding-top:0">
    <div class="container">
${secLabel(site.contact.sectionIndex, 'Contact')}
      <div class="contact-grid">
        <div class="reveal">
          <h2>${md(site.contact.heading)}</h2>
          <p class="pitch">${md(site.contact.pitch)}</p>
        </div>
        <ul class="contact-list reveal">
${links}
        </ul>
      </div>
    </div>
  </section>`;
}

function renderFooter() {
  const left = md(site.footer.left).replace('{year}', `<span id="yr">${new Date().getFullYear()}</span>`);
  return `      <p>${left}</p>
      <p><span class="ok-txt">●</span> ${md(site.footer.right)}</p>`;
}

function renderJsonld() {
  const j = site.meta.jsonld;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: j.name,
    jobTitle: j.jobTitle,
    worksFor: { '@type': 'Organization', name: j.worksFor },
    url: site.meta.url,
    email: j.email,
    sameAs: j.sameAs,
  }, null, 2);
}

// ── Assemble ────────────────────────────────────────────────────────────────
let html = fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8');
const slots = {
  TITLE: escapeAttr(site.meta.title),
  DESCRIPTION: escapeAttr(site.meta.description),
  OG_DESCRIPTION: escapeAttr(site.meta.ogDescription),
  URL: escapeAttr(site.meta.url),
  JSONLD: renderJsonld(),
  NAV: renderNav(),
  HERO: renderHero(),
  DEPLOY_LOG: renderDeployLog(),
  LOG_PROMPT_DELAY: (1.0 + site.deployLog.length * 0.15 + 0.15).toFixed(2),
  PROOF: renderProof(),
  EXPERIENCE: renderExperience(),
  PROJECTS: renderProjects(),
  RESEARCH: renderResearch(),
  WRITING: renderWriting(),
  STACK: renderStack(),
  CONTACT: renderContact(),
  FOOTER: renderFooter(),
  SUBSTACK_FEED: writing.feedUrl,
};
for (const [k, v] of Object.entries(slots)) html = html.split(`{{${k}}}`).join(v);

const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) errors.push(`template: unfilled slots ${[...new Set(leftover)].join(', ')}`);
if (errors.length) fail();

// ── Write dist/ ─────────────────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const f of fs.readdirSync(path.join(ROOT, 'static'))) {
  fs.copyFileSync(path.join(ROOT, 'static', f), path.join(OUT, f));
}

const caseCount = experience.orgs.reduce((n, o) => n + o.cases.length, 0);
console.log('✔ build ok');
console.log(`  experience: ${experience.orgs.length} orgs, ${caseCount} case files`);
console.log(`  projects: ${projects.rows.length} · publications: ${research.publications.length} · stack clusters: ${stack.clusters.length}`);
console.log(`  dist/index.html — ${(html.length / 1024).toFixed(1)} KB`);

function fail() {
  console.error('✖ build failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
