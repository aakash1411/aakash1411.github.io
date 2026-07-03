# aakash1411.github.io — Portfolio

Personal portfolio for Applied AI / Forward-Deployed Engineering roles.
Live at **https://aakash1411.github.io**.

## Stack

- One static `index.html` — no framework, no build step, no trackers
- Google Fonts (Fraunces, Archivo, IBM Plex Mono)
- Hosted free on **GitHub Pages**

## Editing

Everything lives in `index.html` (inline CSS + JS). The notable dynamic bits:

- **Deploy log** (hero) — hand-edited list of current statuses
- **Substack posts** — fetched from the RSS feed at load time via a CORS
  proxy, with a static fallback link if the fetch fails

The **Medtronic section** is deliberately generalized: no internal project or
system names, no confidential details, and only metrics evidenced in my own
work files. Keep it that way when editing.

## Deploying changes

```bash
git add -A && git commit -m "update site" && git push
```

GitHub Pages redeploys automatically within a minute or two.

## Custom domain (optional, later)

1. Buy a domain, add a `CNAME` file to this repo containing it
2. At your registrar: `A` records → GitHub Pages IPs, or `CNAME` → `aakash1411.github.io`
3. Repo **Settings → Pages** → set the domain, enforce HTTPS

## License

Personal use. All rights reserved.
