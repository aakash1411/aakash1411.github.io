# aakash1411.github.io — Portfolio

Personal portfolio for Applied AI / Forward-Deployed Engineering roles.
Live at **https://aakash1411.github.io**.

## How it works — content and design are separate

```
content/            ← EDIT THESE (all site text lives here)
  site.json         hero, nav, deploy log, proof strip, contact, footer
  experience.json   MiniMed / Medtronic org blocks + case files
  projects.json     open-source & independent builds
  research.json     publications (published work only)
  writing.json      Substack / Medium / LinkedIn links
  stack.json        working-stack clusters
src/template.html   ← design (CSS/JS) — rarely touched
static/             ← favicon, 404, .nojekyll
build.js            ← renders content into the template → dist/ (no dependencies)
```

**To change site text:** edit the relevant `content/*.json`, commit, push.
GitHub Actions runs `node build.js` and deploys automatically — you can even
edit the JSON directly in the GitHub web UI.

Inline formatting inside content strings: `**bold**`, `*italic*`,
`[link text](https://url)`. Everything else is escaped automatically, so
content can never break the page.

**The build validates before deploying.** It fails (and blocks deploy) on:
missing required fields, malformed links, leftover template slots, and
forbidden strings — `[METRIC NEEDED]` placeholders and internal Medtronic
system names that must never appear publicly.

## Local preview

```bash
node build.js                                    # → dist/
/usr/bin/python3 -m http.server 4173 -d dist     # open http://localhost:4173
```

## Editing rules for the experience section

- Content mirrors `~/Documents/work-evidence-output/MASTER_WORK_EXPERIENCE.md`
  (the source of truth). Keep the two telling the same story.
- Generalized only: no internal project/system names, no confidential details,
  no roadmap dates; metrics must be evidenced (master doc) or self-published.
- `research.json` lists **published** work only — DOIs required.

## Custom domain (optional, later)

1. Add a `CNAME` file to `static/` containing your domain
2. At your registrar: `CNAME` record → `aakash1411.github.io`
3. Repo **Settings → Pages** → set the domain, enforce HTTPS

## License

Personal use. All rights reserved.
