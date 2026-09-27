/**
 * Markdown-module parser + inline markup for the portfolio build. No dependencies.
 * Format documented in README.md.
 *
 * parse(text) -> root node:
 *   { title: null, fields, body: [paragraphs], list: [], items: [], groups: [] }
 * Every group/item node has the same shape (title set, no groups except on root):
 *   { title, fields, body: [paragraphs], list: [], items: [] }
 */
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

// Inline markup: escape HTML, then **b** / *i* / [t](u).
function md(s) {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/==([^=]+)==/g, '<mark class="ink-mark">$1</mark>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, href) =>
    href.startsWith('#')
      ? `<a href="${href.replace(/"/g, '&quot;')}">${text}</a>`
      : `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${text}</a>`);
  return out;
}

const KEY = /^([a-z][a-zA-Z]*):\s*(.*)$/;
const newNode = (title) => ({ title, fields: {}, body: [], list: [], items: [] });

function parse(text) {
  // Owner notes/examples live in HTML comments; strip them before anything else.
  const lines = String(text).replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const root = newNode(null);
  root.groups = [];

  // Optional frontmatter: --- ... --- at the top of the file -> root fields.
  let i = 0;
  if (lines[0] && lines[0].trim() === '---') {
    for (i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
      const kv = lines[i].trim().match(KEY);
      if (kv) root.fields[kv[1]] = kv[2].trim();
    }
    i++;
  }

  let cur = root;          // node currently collecting fields/body/list
  let fieldsOpen = true;   // contiguous key: value lines right after a heading
  let para = [];
  const flush = () => { if (para.length) { cur.body.push(para.join(' ')); para = []; } };

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    const h = line.match(/^(#{1,2})\s+(.+)$/);
    if (h) {
      flush();
      cur = newNode(h[2]);
      if (h[1] === '#') root.groups.push(cur);
      else (root.groups.length ? root.groups[root.groups.length - 1].items : root.items).push(cur);
      fieldsOpen = true;
      continue;
    }
    if (fieldsOpen) {
      const kv = line.match(KEY);
      if (kv) { cur.fields[kv[1]] = kv[2].trim(); continue; }
      fieldsOpen = false;
      if (!line) continue;
    }
    if (!line) { flush(); continue; }
    if (line.startsWith('- ')) { flush(); cur.list.push(line.slice(2)); continue; }
    para.push(line);
  }
  flush();
  return root;
}

module.exports = { parse, md, escapeHtml, escapeAttr };
