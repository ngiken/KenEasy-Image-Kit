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
<img alt="Version" src="https://img.shields.io/badge/version-0.1.0-27c499?style=for-the-badge">
<img alt="Privacy" src="https://img.shields.io/badge/privacy-local%20only-00aeec?style=for-the-badge">
<img alt="License" src="https://img.shields.io/badge/license-MIT-9aa4b2?style=for-the-badge">

</div>

---

## 30-second start

1. Open: **[the online tool](https://ngiken.github.io/KenEasy-Image-Kit/)**
2. Drop images onto the page (multi-select supported)
3. Pick output format (WebP / JPEG / PNG), quality, max edge (optional)
4. Hold `⠿` to drag and reorder (optional)
5. Click **Process** → download as a zip (or one file at a time)

That's it. No account, no installer, no server upload.

---

## What it is

KenEasy Image Kit is a **frontend-only** image tool:

| What you want | How it helps |
| --- | --- |
| Image too big | Convert to WebP / JPEG, drag the quality slider, size drops |
| Change format | One-click PNG ↔ JPEG ↔ WebP |
| Downsize | Set "max edge", scales down proportionally (never enlarges) |
| Batch a folder | Process all, download as a single zip |
| Sensitive images | Everything runs in your browser, never hits a server |

The UI switches between **中文 / English** (top-right) and remembers your choice; it auto-detects your browser language on first open.

Good for: shrinking images before sharing, batch-converting screenshots, prepping web/form-ready sizes.

---

## Supported

| Input formats | Notes |
| --- | --- |
| PNG / JPG / WEBP / GIF / BMP | Drop or click to choose, multi-select |

| Output options | Notes |
| --- | --- |
| Format | WebP / JPEG / PNG, or "keep original" |
| Quality | 0.4–1.0 slider (WebP / JPEG only; PNG is lossless) |
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
- No HEIC decode, watermark, or crop/rotate editing (may come later)
- The quality slider has no effect on PNG (PNG is lossless)
- Keep files &lt; 40MB each; queue holds ~120 images

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
  app.js
  vendor/            ← offline deps
.github/workflows/   ← auto deploy
scratch/             ← maintenance scripts + e2e tests
```

Third-party licenses: [`web/vendor/NOTICE.txt`](./web/vendor/NOTICE.txt)

---

## Changelog

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

## License

[MIT](LICENSE) © 2026
