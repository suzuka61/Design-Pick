# DesignPick

[中文](README.md)

Chrome extension — one-click design system extraction from any webpage into an AI-agent-ready DESIGN.md.

## Why DESIGN.md?

| | AGENTS.md | DESIGN.md |
|---|---|---|
| Purpose | Tell AI how to write code | Tell AI what it should look like |
| Content | Code standards, PR flow, testing | Colors, fonts, spacing, component styles, shadow levels |
| Value | Correct behavior | Correct visuals |

**awesome-design-md** manually wrote DESIGN.md for 70+ sites (86k stars), but can only update by hand. DesignPick automates it — any webpage → DESIGN.md in seconds.

| | awesome-design-md | DesignPick |
|---|---|---|
| Method | Manual curation | Browser extension auto-extraction |
| Input | Manual observation | One-click from current page |
| Token Naming | None | `color-primary-500`, `spacing-md`, `radius-lg`… |
| Mapping Layer | None | Token ↔ usage scenario bidirectional mapping |
| Constraint Layer | None | Inferred Do's and Don'ts from page data |
| Stability Classification | None | L1 permanent → L4 volatile |
| State Completion | None | Auto-infer 7 states |
| Accessibility | None | WCAG 2.2 AA |
| Motion Tokens | None | `motion-duration-fast`, `motion-easing-standard`… |
| AI Enhancement | None | Optional AI API polish |
| Speed | Hours | Seconds |

## Install

1. `cd extension && npm install && npm run build`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select `extension/dist/`
5. Click the extension icon on any page → Side Panel opens → click "Extract"

## Usage

1. Open any webpage
2. Click DesignPick icon in the toolbar
3. Click **Extract Design System** in the Side Panel
4. Wait for progress → view DESIGN.md / Preview
5. Download `.md` or `.html`
6. Click **Browse Templates** → open the online template gallery (73 curated DESIGN.md files)

### Optional: AI Enhancement

Fill in an API Key in ⚙ Settings to enable AI polish. Supports any OpenAI-compatible API (OpenAI / DeepSeek / Zhipu / Moonshot etc.). Works without a Key.

## Template Gallery

Access 73 curated design system templates from the awesome-design-md open-source community:

- Categorized by industry: AI & LLM, Developer Tools, Backend & DevOps, Productivity & SaaS, Design & Creative, Fintech, E-commerce, Media & Consumer, Automotive
- Each template includes: rendered preview, color system, typography, components, full DESIGN.md
- Deployed on Vercel, independent of extension updates

Build template data locally:

```bash
cd gallery && npm install && npm run build
```

## Stability Classification

- **[L1] Infrastructure** — permanent: primary/accent colors, font families, base spacing
- **[L2] System** — redesign cycle: neutral scale, component styles, shadows, radii
- **[L3] Campaign** — per-launch: low-frequency accents, hero colors
- **[L4] Content** — constant change: image-derived colors (ignore when used by AI)

## DESIGN.md 15 Sections

1. Mission 2. Brand Context 3. Visual Theme 4. Color Palette 5. Typography 6. Component Stylings 7. Layout 8. Depth & Elevation 9. Accessibility 10. Motion 11. Do's and Don'ts 12. Responsive 13. Anti-Patterns 14. QA Checklist 15. Agent Prompt Guide

## Project Structure

```
extension/                    # Chrome extension
├── content/extract.ts        # Content Script — DOM traversal
├── background/sw.ts          # Service Worker — pipeline orchestration
├── sidepanel/                # Side Panel UI
├── analyzer/                 # 12 analysis modules
├── generator/                # DESIGN.md generation + optional AI enhancement
└── renderer/                 # preview.html rendering

gallery/                      # Template gallery (static site, Vercel)
├── public/                   # Frontend (SPA)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── scripts/                  # Data pipeline
    ├── slugs.json            # 73 template slugs + category mapping
    ├── sync-templates.mjs    # Fetch DESIGN.md + preview.html from GitHub
    └── generate-index.mjs    # Parse YAML, generate JSON index
```

## License

[MIT](LICENSE)
