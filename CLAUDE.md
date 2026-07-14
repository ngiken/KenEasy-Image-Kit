# CLAUDE.md — KenEasy Image Kit

Browser-only image tool: drop images → apply a preset or tune format/quality/size → process locally → download as ZIP or separate files. No backend, upload, install, or account.

## Layered architecture

```text
web/
  index.html       # semantic UI shell
  styles.css       # Apple-inspired adaptive glass design system with semantic tokens
  config.js        # data layer: limits, format rules, presets, defaults, storage keys
  i18n.js          # content layer: bilingual copy + translation service
  image-engine.js  # domain layer: validation, output plans, canvas processing, naming
  app.js           # application layer: state, queue rendering, workflow orchestration
  vendor/          # pinned offline SortableJS + JSZip
scratch/
  fetch-vendor.ps1
  e2e/             # real-browser regression suite
```

Dependency direction is one-way: `config → i18n/engine → app → DOM`. Keep product rules in data and image behavior in the engine; do not hard-code new formats or presets inside UI event handlers.

## Product goals

1. Open a link and it works — static hosting, no install or account.
2. Local only — images never leave the browser tab.
3. Simple batch flow — import, choose a recipe, review queue, process, download.
4. Offline-capable — runtime dependencies are vendored under `web/vendor/`.
5. Stable and extensible — rules are data-driven and layers remain decoupled.

## Hard rules

1. Never commit secrets: `*.pem`, `*.p12`, `*.key`, `.env`, credentials.
2. Never copy signing keys or raw recordings from the parent workspace.
3. Do not initialize or push the parent workspace as this product repository.
4. No backend or file-upload API unless product direction explicitly changes.
5. Put limits/formats/presets/defaults in `config.js`, processing rules in `image-engine.js`, copy in `i18n.js`, and UI orchestration in `app.js`.
6. Vendor pins are intentional; bump through `scratch/fetch-vendor.ps1` and retest.
7. Preserve the Apple-inspired adaptive design system: neutral canvas, blue primary actions, restrained KenEasy pink/cyan accents, and equivalent light/dark experiences.

## Processing rules

| Concern | Rule |
| --- | --- |
| Decode | `Image` + object URL |
| Resize | Longest-edge proportional scale-down; never enlarge |
| Encode | Canvas `toBlob` for WebP/JPEG/PNG |
| JPEG alpha | Paint white before drawing |
| GIF/BMP + source mode | Pass through when max edge is `0`; otherwise encode PNG (GIF still frame) |
| Safety | 40 MB/file, 120 files, 16,384 px edge, 64 MP output canvas |
| Bundle | JSZip `STORE` because images are already compressed |
| Naming | Sanitize, preserve or index, and de-duplicate case-insensitively |
| Offline | No runtime CDN or network request |

## Testing

```powershell
cd scratch/e2e
npm ci
npx playwright install chromium  # only when the browser binary is missing
npm test                         # expect: ALL GREEN
```

The suite verifies real image signatures and dimensions, transparency, quality impact, ZIP and separate downloads, presets, persistence, queue summaries, keyboard ordering, removal races, responsive layout, i18n, and offline behavior.

## Safe commit checklist

```text
[ ] git status contains no secrets or unexpected binaries
[ ] node_modules/ and scratch/e2e/out/ are ignored
[ ] vendor files and NOTICE are present
[ ] index.html versioned script URLs match current release
[ ] node --check passes for every JS file
[ ] npm test reports ALL GREEN
[ ] README badges/changelog match the release version
```

## Out of scope (v0.3)

- HEIC decode
- EXIF preservation
- Animated GIF output/editing
- Watermark, crop, or rotate editor
- Advanced batch rename expressions
- AI background removal
- Server processing, accounts, or cloud storage
