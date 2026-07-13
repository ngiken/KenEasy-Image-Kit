# CLAUDE.md ??KenEasy-Image-Kit

本地批量压图/改尺寸/转格式，纯前端不上传

## Project layout

```text
(add layout as the project grows)
```

## Hard rules (do not break)

1. **Never commit secrets** ??`*.pem`, `*.p12`, `*.key`, `.env`, credentials
2. **Workspace parent** `../` may hold signing keys / raw recordings ??do not copy them here
3. **Do not `git init` in the parent workspace** ??this folder is the git root
4. Prefer small, layered changes
5. **KenEasy visual series** ??match pink/blue dark glass tokens in `../DESIGN.md`; emerald only as accent

## UI palette (series default)

Copy tokens from `../DESIGN.md` (or from `01-KenEasy-BiliCC-Exporter` / `02-KenEasy-PDF-Converter`).
Primary: pink `#fb7299` + blue `#00aeec` on `#0b0c0f`. Optional emerald accent `#10b981` ??not the main brand color.

## Safe commit checklist

```text
[ ] git status ??no secrets / unexpected binaries
[ ] Only intentional media tracked
[ ] Version bump consistent if releasing
```

## Daily workflow

| Task | Path |
| --- | --- |
| Open project | this folder |
| Workspace status | `..\scripts\status-all.ps1` |
| Workspace backup | `..\scripts\backup-workspace.ps1` |
