# CLAUDE.md — KenEasy Image Kit

Browser-only image tool: drop images → compress / resize / convert (WebP / JPEG / PNG) → download as zip or per file. No server upload. Offline vendor bundle.

## Project layout

```text
web/
  index.html      # UI entry (static)
  styles.css      # KenEasy pink/blue dark-glass design system
  app.js          # i18n, queue, canvas resize/encode, zip, download
  vendor/         # offline JS libs + NOTICE.txt (Sortable + JSZip)
scratch/
  fetch-vendor.ps1  # re-fetch pinned vendor libs
  e2e/              # Playwright end-to-end tests (node_modules/out gitignored)
README.md          # CN product page
README.en.md
CLAUDE.md
LICENSE            # MIT 2026
```

Ship / host only the `web/` folder (includes `vendor/`).

## Product goals

1. **Open a link → works** — static hosting, no install, no account
2. **Local only** — images never leave the browser tab
3. **Simple UX** — drop → set format/quality/size → one zip (or separate)
4. **Offline-capable** — vendored deps under `web/vendor/`
5. **Zero heavy deps** — resize/encode via browser Canvas `toBlob`

## Hard rules (do not break)

1. **Never commit secrets** — `*.pem`, `*.p12`, `*.key`, `.env`, credentials
2. **Workspace parent** `../` may hold signing keys / raw recordings — do not copy them here
3. **Do not `git init` in the parent workspace** — this folder is the git root
4. **No backend / no file upload API** unless product direction explicitly changes
5. Prefer small, layered changes; keep processing logic in `web/app.js`
6. Vendor pins are intentional — bump via `scratch/fetch-vendor.ps1` + retest
7. **KenEasy visual series** — pink/blue dark glass from `../DESIGN.md`; emerald only as accent, never the main CTA

## Tech notes

| Concern | Approach |
| --- | --- |
| Decode | `new Image()` + object URL |
| Resize | Canvas draw with max-edge scale-down (never enlarge) |
| Encode | `canvas.toBlob(type, quality)` — WebP / JPEG / PNG |
| JPEG alpha | Paint white background first (JPEG has no alpha) |
| Bundle | JSZip `STORE` (images already compressed) |
| Reorder UI | SortableJS |
| Offline | local `web/vendor/*` only (no CDN at runtime) |

## Testing

End-to-end tests drive the real UI in headless Chromium and verify real output (format signatures, resize dimensions, zip contents, i18n, offline):

```powershell
cd scratch/e2e
npm install          # playwright + jszip (dev only, gitignored)
npx playwright install chromium
node run.mjs         # expect: ALL GREEN
```

## Safe commit checklist

```text
[ ] git status — no secrets / unexpected binaries
[ ] scratch/e2e/node_modules + out are ignored (not staged)
[ ] vendor/ complete (Sortable + JSZip + NOTICE)
[ ] index.html script tags match vendor filenames
[ ] node run.mjs → ALL GREEN
[ ] Version badges if releasing
```

## Daily workflow

| Task | Path / command |
| --- | --- |
| Open project | this folder |
| Local preview | `python -m http.server 5173 --directory web` |
| Refresh vendors | `.\scratch\fetch-vendor.ps1` |
| Run e2e tests | `cd scratch/e2e; node run.mjs` |
| Deploy unit | `web/` directory only |
| Workspace status | `..\scripts\status-all.ps1` |

## Out of scope (v0.1)

- HEIC decode
- EXIF preservation (canvas re-encode strips it — documented)
- Watermark, crop, rotate editing
- Batch rename rules beyond keep-name / index
- AI background removal
- Server-side processing / accounts / cloud storage
