# Plates

Tiny barbell calculator. Punch in the weight you want — see exactly what goes
on each side, and (when the bar is already loaded) what to **add or remove**.

- 45 lb bar
- Plates per side: **45 / 25 / 10 / 5 / 2.5 lb**
- Only loadable weights are reachable (5 lb steps); impossible numbers don't exist here
- Remembers what's on the bar between sets and sessions (localStorage)

## Use

1. The big number is the weight you want. Steppers do ±5/±10/±25, or tap it
   and type (snaps to the nearest loadable weight).
2. When that differs from what's on the bar, you get a **swap plan**: red
   chips for plates to pull, green for plates to slide on. Going 185 → 180
   says "−25, +10 +10 +2.5 per side" because a `[45, 25]` bar has no 2.5 to
   remove. The **On the bar → After** pictures show both layouts; plates to
   pull are drawn solid red, and the comparison alone shows what's new.
3. Two ways to plan, toggled with the **Clean / Quick** switch (shown only
   when the two plans differ; you pick the default and it's remembered):
   - **Clean** — land on the tidy big-plate-first layout, the bar as if you
     loaded it fresh. 140 → 145 swaps the 2.5 for a 5.
   - **Quick** — handle the fewest plates. 140 → 145 slides on a second 2.5
     and skips the trip to the rack.
4. The app tracks the bar as an actual plate layout (not just a number), so
   each plan assumes you followed the previous one. **Loaded it ✓** confirms
   it; long-press the **On bar** pill resyncs to the target if someone else
   touched the bar.

## Develop

```sh
npm install
npm start       # dev server with live reload at http://localhost:4321
npm test        # node --test for the plate math (public/plates.js)
npm run build   # static output in dist/ — plain files, any host
```

The page itself is deliberately framework-free: `src/pages/index.astro` is
one document with an `is:inline` module script, and everything else
(`plates.js`, service worker, manifest, icons) is copied verbatim from
`public/`. Astro is the dev server; the deployed site is static.

## Install on your phone

Needs an https URL (or localhost). Open in Safari → Share → **Add to Home
Screen**. It then launches full-screen with its own icon and works offline —
a service worker precaches every file.

## Deploy

`dist/` is plain static files. Any host works:

- GitHub Pages (`astro build`, publish `dist/`; set `site` in
  `astro.config.mjs` so the service worker scopes correctly under a subpath)
- a path on mattfelten.com (e.g. `/plates/`) — copy `dist/*` as-is

If you change any asset, bump `CACHE` in `public/sw.js` so installed copies
update.

## Structure

- `public/plates.js` — **all the math**, pure functions, DOM-free. This is
  the porting contract: reimplement this one file in Swift and a native app
  is a port, not a rewrite.
- `src/pages/index.astro` — the whole UI (inline global CSS + one inline module script)
- `public/sw.js`, `public/manifest.webmanifest`, icons — the PWA wrapper
- `tools/gen_icons.py` — regenerates the icons (pure-Python PNG writer, no deps)
- `test/plates.test.mjs` — node:test suite for the math
