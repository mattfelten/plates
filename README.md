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
2. Green/red chips = what to add/remove **per side** relative to what the app
   thinks is currently on the bar.
3. **Loaded it ✓** marks the bar as matching the target.
4. If the app's idea of the bar is stale (someone else changed plates),
   long-press the **On bar** pill to resync it to the current target.

## Install on your phone

Needs an https URL (or localhost). Open in Safari → Share → **Add to Home
Screen**. It then launches full-screen with its own icon and works offline —
a service worker precaches every file.

## Run locally

```sh
python3 -m http.server 8080   # then open http://localhost:8080
```

## Test

```sh
node --test
```

## Deploy

No build step; static files only. Any host works:

- GitHub Pages for this repo
- a path on mattfelten.com (e.g. `/plates/`) — copy the files as-is

If you change any asset, bump `CACHE` in `sw.js` so installed copies update.

## Structure

- `plates.js` — **all the math**, pure functions, DOM-free. This is the
  porting contract: reimplement this one file in Swift and a native app is a
  port, not a rewrite.
- `index.html` — the whole UI (inline CSS + one module script)
- `sw.js`, `manifest.webmanifest`, icons — the PWA wrapper
- `tools/gen_icons.py` — generated the icons (pure-Python PNG writer, no deps)
