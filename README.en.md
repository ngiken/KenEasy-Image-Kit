<div align="center">

# KenEasy Image Kit

**An image tool that just works** — drop images, compress, resize, convert to WebP / JPEG / PNG, and download as a zip.
Files are processed entirely in your browser: **no upload, no install, no signup.**

<br/>

### 👉 Click here to use it

# [🚀 Open Image Kit (online)](https://ngiken.github.io/KenEasy-Image-Kit/)

**https://ngiken.github.io/KenEasy-Image-Kit/**

> The link above is the **actual tool**.
> This GitHub page is just the **source code** — you can't use it as the tool here.

<br/>

[中文](README.md) · [English](README.en.md)

<br/>

<img alt="Use online" src="https://img.shields.io/badge/use%20online-ngiken.github.io-fb7299?style=for-the-badge">
<img alt="Version" src="https://img.shields.io/badge/version-0.3.1-0071e3?style=for-the-badge">
<img alt="Privacy" src="https://img.shields.io/badge/privacy-local%20only-00aeec?style=for-the-badge">
<img alt="License" src="https://img.shields.io/badge/license-MIT-9aa4b2?style=for-the-badge">

<br/><br/>

<img src="https://raw.githubusercontent.com/ngiken/KenEasy-Image-Kit/main/docs/screenshots/hero-light.png" alt="KenEasy Image Kit v0.3.1 light hero" width="1200">

<sub>Apple-inspired adaptive interface · live tool linked above</sub>

</div>

---

## 30-second start

1. Open: **[the online tool](https://ngiken.github.io/KenEasy-Image-Kit/)**
2. Drop images onto the page (multi-select supported)
3. Choose Balanced / Smaller / High quality / Social, or fine-tune format, quality, and max edge
4. Drag `⠿` to reorder; keyboard users can focus the handle and press ↑ / ↓
5. Click **Process images** → see before/after size, then download as a zip (or separately)

That's it. No account, no installer, no server upload.

### See the flow

<p align="center">
  <img src="https://raw.githubusercontent.com/ngiken/KenEasy-Image-Kit/main/docs/screenshots/quick-tour.gif" alt="Three-step demo: import images, choose a preset, process and download" width="960">
</p>

<p align="center"><strong>① Import images　→　② Choose a recipe　→　③ Process locally and download</strong></p>

---

## What it is

KenEasy Image Kit is a **frontend-only** image tool:

| What you want | How it helps |
| --- | --- |
| Image too big | Pick a preset, or convert to WebP / JPEG and adjust quality |
| Unsure about settings | Start with Balanced, Smaller, High quality, or Social |
| Change format | One-click PNG ↔ JPEG ↔ WebP |
| Downsize | Set "max edge", scales down proportionally (never enlarges) |
| Batch a folder | Process all, download as a single zip |
| Sensitive images | Everything runs in your browser, never hits a server |

The UI switches between **中文 / English** (top-right) and remembers your choice; it auto-detects your browser language on first open.

Good for: shrinking images before sharing, batch-converting screenshots, prepping web/form-ready sizes.

---

## Interface preview

| Light workspace | Dark workspace |
| --- | --- |
| <img src="https://raw.githubusercontent.com/ngiken/KenEasy-Image-Kit/main/docs/screenshots/workspace-light.png" alt="Light output settings and image queue"> | <img src="https://raw.githubusercontent.com/ngiken/KenEasy-Image-Kit/main/docs/screenshots/workspace-dark.png" alt="Dark output settings and image queue"> |

<p align="center">
  <img src="https://raw.githubusercontent.com/ngiken/KenEasy-Image-Kit/main/docs/screenshots/mobile-light.png" alt="KenEasy Image Kit mobile interface" width="360">
</p>

<p align="center"><sub>Two-column desktop, single-column mobile, with persisted light and dark appearances.</sub></p>

---

## Supported

| Input formats | Notes |
| --- | --- |
| PNG / JPG / WEBP / GIF / BMP | Drop or click to choose, multi-select |

| Output options | Notes |
| --- | --- |
| Format | WebP / JPEG / PNG, or "keep source when possible" |
| Quick presets | Balanced / Smaller / High quality / Social, driven by configuration data |
| Quality | 40%–100% for WebP/JPEG; automatically disabled for lossless PNG |
| Max edge | Pixels; `0` = no resize. Scales down only |
| Bundling | One zip (default) / download each separately |
| Filename | Zip name, or keep each original name (swap extension only) |

---

## Privacy

- Images are **never uploaded** to any server (this project has no backend)
- Processing happens only in the current browser tab's memory
- File references are released when you close the page

---

## Local use (optional)

If you'd rather not use the online link, run the same page locally (deps are bundled under `web/vendor/`, works offline):

```powershell
# from the repo root
python -m http.server 5173 --directory web
```

Then open <http://localhost:5173/>.

> Double-clicking `index.html` (`file://`) is not recommended — some browsers restrict scripts there; the local server above is most reliable.

Re-fetch offline deps (optional):

```powershell
.\scratch\fetch-vendor.ps1
```

---

## Known limits

- Re-encoding **strips EXIF** (capture info and orientation); rotated-EXIF images are drawn by orientation first, then output
- GIF/BMP pass through when keeping source without resize; resizing falls back to PNG, and GIF becomes a still frame
- No HEIC decode, watermark, or crop/rotate editing (may come later)
- The quality slider has no effect on PNG (PNG is lossless)
- Files are limited to 40 MB each and 120 per queue; output canvas safety limits are 16,384 px / 64 MP

---

## Tech & layout

Pure static site; pushing to `main` auto-publishes Pages via GitHub Actions.

| Library | Use |
| --- | --- |
| SortableJS | Queue drag-reorder |
| JSZip | Bundle into a zip download |
| Browser Canvas | Decode / resize / re-encode (zero extra deps) |

```text
web/                 ← the site itself (also the Pages artifact)
  index.html
  styles.css
  config.js           ← formats, limits, presets, defaults
  i18n.js             ← bilingual copy and translation service
  image-engine.js     ← decode, resize, encode, naming domain layer
  app.js              ← queue state, UI, and workflow orchestration
  vendor/            ← offline deps
docs/screenshots/    ← README screenshots and animated tour
.github/workflows/   ← auto deploy
scratch/             ← maintenance scripts + e2e tests + capture tooling
```

Third-party licenses: [`web/vendor/NOTICE.txt`](./web/vendor/NOTICE.txt)

Regenerate README visuals (optional for maintainers):

```powershell
cd scratch/e2e
npm run capture:readme
```

---

## Changelog

### v0.3.1
- New users now default to Keep source format, preserving JPEG, PNG, and WebP output types
- Changed the Smaller preset to original-dimension WebP compression and expanded quality to 10%–100% without hidden resizing
- Made ZIP downloads opt-in instead of enabled by default
- Persist output settings immediately so conversion, changing images, or an instant reload never restores initial values
- Expanded regression coverage to 55 checks, including decoded pixel differences, dimensions, source formats, and defaults

### v0.3.0
- Reimagined the product with an Apple-inspired adaptive glass interface, calm spacing, and restrained KenEasy pink/cyan accents
- Added a persisted light/dark appearance toggle that follows the system preference on first use
- Rebuilt the brand bar, hero, three-step workflow, import surface, settings card, queue, and progress feedback
- Improved touch targets, keyboard focus, reduced motion, semantic labels, and mobile overflow safety
- Kept appearance data-driven through semantic tokens and decoupled from processing behavior
- Added real light/dark desktop, mobile, and animated three-step visuals so the README is not text-only
- Expanded E2E coverage to 48 checks

### v0.2.0
- Rebuilt the desktop two-column workspace and mobile layout in the KenEasy dark pink/blue style
- Added four data-driven presets, persisted settings, queue totals, and before/after output summaries
- Split configuration, i18n, image engine, and UI orchestration into decoupled layers
- Defined GIF/BMP source-preservation behavior and added canvas/output validation
- Added keyboard reordering, reduced-motion/high-contrast support, and fixed rapid-removal races
- Expanded E2E coverage to 42 checks and removed the artificial 30-second wait per run

### v0.1.0
- First release: drag-drop queue, reorder, batch processing
- WebP / JPEG / PNG output, quality slider, max-edge proportional resize
- Zip bundle or per-file download, optional keep-original-name
- Bilingual UI, offline-capable

---

## Links

| Purpose | Link |
| --- | --- |
| **Use now (recommended)** | https://ngiken.github.io/KenEasy-Image-Kit/ |
| Source code | https://github.com/ngiken/KenEasy-Image-Kit |

---


## Friends / 友情链接

- [LINUX DO](https://linux.do)

## License

[MIT](LICENSE) © 2026
