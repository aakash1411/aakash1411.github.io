# aakash1411.github.io · Portfolio

Personal portfolio for Applied AI / Forward-Deployed Engineering roles.
Live at **https://aakash1411.github.io**.

## How it works: content and design are separate

```
content/            <- EDIT THESE (all site text lives here)
  site.md           meta, hero, deploy log, proof strip, footer, section order
  sections/         one file per section; filename = section id + URL anchor
    experience.md   orgs and case studies (type: cases)
    projects.md     open-source builds + a `# Publications` papers group (type: projects)
    writing.md      posts from RSS feeds + LinkedIn embeds (type: feed)
    stack.md        working-stack clusters (type: stack)
    contact.md      pitch + links (type: contact)
src/template.html   <- page skeleton (slots), rarely touched
src/content.js      <- the Markdown parser + inline markup
static/             <- site.css, app.js, boot.js, ascii.js, carousel.js, favicon, 404
build.js            <- validates content, fetches feeds, renders dist/ (no dependencies)
```

**To change site text:** edit the relevant `content/*.md`, commit, push.
GitHub Actions runs `node build.js` and deploys automatically.

## The Markdown format

- `---` lines at the top hold frontmatter `key: value` pairs.
- `# Name` starts a group, `## Name` starts an item (inside the latest group,
  or at top level if no group yet).
- `key: value` lines immediately under a heading are its fields. After the
  first blank line, plain lines are paragraphs and `- ` lines are list items.
- In `experience.md`, `- ` lines under a `# Org` group render an
  "Also in this era" bullet list at the end of that org's cases.
- `<!-- comments -->` are ignored: leave notes and examples in the files.
- Inline markup: `**bold**`, `*italic*`, `==highlight==` (draw-in mark),
  `[link](https://url)`. Comma-separated fields (`tags`, `chips`, `sameAs`,
  `sections`) split on commas. Link fields use Markdown link syntax:
  `links: [Code ↗](https://github.com/x)`.

## Fields worth knowing

- `site.md`: `rail` feeds the vertical left rail; `colophon` is the footer
  line (`{year}` is replaced at build).
- `site.md`: `boot: on|off` arms the BIOS-style startup overlay (requires
  `bootTitle`). It runs on the first visit in a session and on every reload;
  append `?noboot` to skip it or
  `?boot` to force it again. It never runs under reduced motion.
- `site.md`: the `# Easter egg` list holds the build bot's speech lines.
  Triggers: the Konami code, typing `hello`, or triple-clicking the masthead
  name. ESC or the `x` dismisses it.
- Per-section frontmatter: `title` (mono label), `display` (optional big serif
  heading under the label), `nav` (optional masthead link label), `type`.
- In `experience.md`, `short:` on a `# Org` group names its filter chip.
- Experience cases (one carousel per `# Org`), the `# Publications` group
  in `projects.md` and the `- ` items of `type: text` sections all render
  as scroll-driven carousels, like projects.
- In `projects.md`, `cover:` sets the oversized italic glyph on each carousel
  frame (defaults to the title's first two letters); other carousels number
  their frames.
- The theme button (top right, in the masthead) cycles midnight, graphite,
  paper and blueprint; the choice persists in localStorage.

## Adding, reordering, hiding sections

The `sections:` list in `content/site.md` controls which sections render and
in what order. Index labels (§ I, § II...) and nav links are derived from it:
a section appears in the nav only if it has a `nav:` label. To add a plain
text section, create e.g. `sections/about.md` with `type: text`, a `title:`,
body paragraphs and/or `- ` bullet lines, and add `about` to the list.
`sections/leadership.md` and `sections/education.md` work exactly this way.

## Feeds and embeds (writing section)

- `substack:` and `medium:` hold RSS feed URLs, fetched at **build time**;
  `limit:` caps the merged list. A dead or empty feed only warns: posts from
  the `# Pinned` group render instead.
- `# LinkedIn` list lines are LinkedIn embeds: paste either the post URL or
  LinkedIn's "Embed this post" iframe code. Only the post URN (and optional
  height) is extracted; the pasted HTML is never injected. An example lives
  in a comment inside `writing.md`.
- The deploy workflow also runs on a daily cron so new posts appear without
  a commit. Note: GitHub pauses scheduled workflows after 60 days with no
  repo activity; re-enable in the Actions tab or push any commit.

## Validation

The build fails (and blocks deploy) on: missing required fields, malformed
links, leftover template slots, forbidden strings (`[METRIC NEEDED]` /
`[UNKNOWN]` placeholders plus a private blocklist), unknown section types,
missing section files, invalid LinkedIn lines, and any em/en dash anywhere
in the rendered HTML.

The private blocklist is never committed: locally it lives in a gitignored
`.forbidden` file, in CI in the `FORBIDDEN` repo secret (comma- or
newline-separated). CI fails if the secret is missing.

## Local preview

```bash
node --test src/                                 # parser self-check
node build.js                                    # -> dist/
/usr/bin/python3 -m http.server 4173 -d dist     # open http://localhost:4173
```

## Editing rules for the experience section

- Content mirrors a private source-of-truth document. Keep the two telling
  the same story.
- Generalized only: no internal project/system names, no confidential details,
  no roadmap dates; metrics must be evidenced (source doc) or self-published.
- The `# Publications` group in `projects.md` lists **published** work only:
  DOIs required.
- No em/en dashes anywhere. Use periods, commas, colons, or "to" for ranges.

## License

Personal use. All rights reserved.
