const test = require('node:test');
const assert = require('node:assert');
const { parse, md } = require('./content');

const DOC = `---
title: My Site
sections: one, two
---

Root intro text.

<!-- a comment the parser must ignore -->

# Group One
meta: hello
badge: Current

Group body line one
continued on line two.

Second paragraph.

## Item One
year: 2024
url: https://example.com

Item body.

- list a
- list b

Note: this is body text, not a field

## Item Two

Body only, no fields.
`;

test('frontmatter and root body', () => {
  const d = parse(DOC);
  assert.equal(d.fields.title, 'My Site');
  assert.equal(d.fields.sections, 'one, two');
  assert.deepEqual(d.body, ['Root intro text.']);
  assert.equal(d.items.length, 0);
});

test('groups, items, fields, body, list', () => {
  const d = parse(DOC);
  assert.equal(d.groups.length, 1);
  const g = d.groups[0];
  assert.equal(g.title, 'Group One');
  assert.deepEqual(g.fields, { meta: 'hello', badge: 'Current' });
  assert.deepEqual(g.body, ['Group body line one continued on line two.', 'Second paragraph.']);
  assert.equal(g.items.length, 2);

  const it = g.items[0];
  assert.equal(it.title, 'Item One');
  assert.equal(it.fields.year, '2024');
  assert.equal(it.fields.url, 'https://example.com');
  assert.deepEqual(it.list, ['list a', 'list b']);
  assert.ok(it.body.includes('Item body.'));
  assert.ok(it.body.some((p) => p.startsWith('Note: this is body')));
  assert.equal(it.fields.note, undefined);

  const it2 = g.items[1];
  assert.deepEqual(it2.fields, {});
  assert.deepEqual(it2.body, ['Body only, no fields.']);
});

test('comments are stripped everywhere', () => {
  const d = parse(DOC);
  assert.equal(JSON.stringify(d).includes('ignore'), false);
});

test('## before any # attaches to root items', () => {
  const d = parse('## Solo\nx: 1\n');
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].title, 'Solo');
});

test('md inline markup escapes and formats', () => {
  assert.equal(md('a <b> **c** *d* [x](https://e.f)'), 'a &lt;b&gt; <strong>c</strong> <em>d</em> <a href="https://e.f" target="_blank" rel="noopener">x</a>');
});

test('md link href is escaped exactly once', () => {
  assert.equal(md('[x](https://a.b/?p=1&q=2)'), '<a href="https://a.b/?p=1&amp;q=2" target="_blank" rel="noopener">x</a>');
});

test('md ==highlight== produces ink-mark', () => {
  assert.equal(md('x ==1,100+ hours== y'), 'x <mark class="ink-mark">1,100+ hours</mark> y');
});
