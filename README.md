[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/permanaraya26-hash/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/permanaraya26-hash/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Solmar Cover Studio

Turn a photo and a caption into GTA 6-style multi-panel cover art — and export it as a PNG to share. Built for the make.fun bounty **“Make GTA 6 Cover Art”** (`gta6-cover-art-01`).

## What it does

- **Multi-panel cover renderer** on canvas, in four layout presets: Classic Cover (big hero + two stacked panels), Triptych (three vertical panels), Poster (hero + two-panel strip), Solo (single hero panel).
- **Any photo**: upload up to three photos (file inputs or drag-and-drop onto the preview) or use the two bundled samples. Each panel picks a photo slot and gets its own zoom, pan X/Y (sliders, or drag the photo right on the preview) and horizontal flip.
- **Caption editing**: big condensed uppercase title with a thick outline and drop shadow (auto-fits to one line), subtitle, tagline, plus title size and position controls. The invented place badge **SOLMAR BAY** sits in the top corner.
- **Colour grades** drawn as canvas overlays: Vice Sunset (pink/orange), Neon Nights (cyan/magenta), Golden Hour (amber), Mono Noir.
- **Procedural decorations**, all drawn in code: a setting sun disc, palm silhouettes, a lit skyline, halftone dots, diagonal speed lines and a vignette. No Rockstar logo, artwork or fonts anywhere — the lettering uses the system font stack only.
- **One-click PNG export** at 1080 × 1080, 1080 × 1350 and 1920 × 1080, rendered offscreen at the exact size.

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The app is plain static files under `app/` — no build step, no network requests, no external fonts or libraries. Photos are read on your own machine and never uploaded.

## How to use it

1. Pick a layout.
2. Add your photos (or use a sample).
3. Tune each panel — zoom, pan, flip — and edit the title, subtitle and tagline.
4. Pick a colour grade.
5. Hit an export button. The PNG downloads straight away.

## Files

- `app/index.html` — the editor page
- `app/style.css` — dark neon editor theme
- `app/src/cover.js` — the cover renderer (layouts, grades, decorations, lettering)
- `app/src/main.js` — editor wiring, uploads, drag-to-pan, export
- `app/src/shots.js` — deterministic `?shot=` scenes for screenshots
- `app/samples/` — two kit sample photos, free to use
- `main.ts` — the entry program: copies `app/` + `screenshots/` and writes `dossier.json`
- `serve.ts` — tiny static server for local development
- `shots.json` — the four screenshot scenes
