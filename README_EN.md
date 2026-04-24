# DesignPick

[中文](README.md)

Extract design systems from any webpage into a DESIGN.md that AI agents can use directly.

## Why DESIGN.md?

| | AGENTS.md | DESIGN.md |
|---|---|---|
| Purpose | Tell AI how to write code | Tell AI what it should look like |
| Content | Code conventions, PR process, testing rules | Colors, typography, spacing, component styles, elevation |
| Value | Correct behavior | Correct visuals |

**awesome-design-md** hand-writes DESIGN.md for 60+ sites (63.5k stars), but it's manual and can't auto-update. DesignPick fills the gap — any webpage → auto DESIGN.md.

| | awesome-design-md | DesignPick |
|---|---|---|
| Approach | Hand-crafted | Auto-extracted |
| Input | Human observation | Webpage URL |
| Token naming | None | `color-primary-500`, `spacing-md`, `radius-lg`… |
| Stability classification | None | L1 permanent → L4 volatile |
| State completion | None | Auto-inferred hover/focus/disabled |
| Speed | Hours | Minutes |

## Usage

1. Enter a webpage URL
2. Playwright scrapes → analyzes colors/typography/spacing/components/shadows/responsive
3. Token naming + stability classification + state completion
4. AI generates 9-section DESIGN.md + interactive preview.html

## Stability Classification

Every design value is tagged with a stability tier, so AI agents know which values are safe to reference and which to ignore:

- **[L1] Infrastructure** — Permanent: primary color, accent color, font families, base spacing unit
- **[L2] System** — Redesign cycle: neutral shades, component styles, shadows, radii
- **[L3] Campaign** — Per-campaign: low-frequency accent colors, hero section colors
- **[L4] Content** — Continuously changing: image-derived colors (AI agents should ignore these)

## Token Naming

```css
color-primary-500: #5b76fe    /* AI agent references directly */
spacing-md: 16px               /* No need to memorize raw values */
radius-lg: 12px
shadow-subtle: 0 1px 2px rgba(0,0,0,0.05)
type-body: 16px/400/24px
```

## State Completion

Auto-infers missing interaction states for components, expressed as token shade offsets:

| State | Inference logic |
|-------|----------------|
| Hover | shade +100 (`color-primary-500` → `color-primary-600`) |
| Focus | outline uses primary color token |
| Disabled | shade -300 (`color-primary-500` → `color-primary-200`) |

## DESIGN.md 9 Sections

1. **Visual Theme & Atmosphere** — Design philosophy, emotional tone, key characteristics
2. **Color Palette & Roles** — Hue-grouped shade scales (50-900) + token names + stability
3. **Typography Rules** — Font families, hierarchy table (with token names), type principles
4. **Component Stylings** — Button / Card / Input / Navigation rule token tables + auto-completed states
5. **Layout Principles** — Spacing token table, grid, radius token table
6. **Depth & Elevation** — Shadow token table, shadow philosophy
7. **Do's and Don'ts** — Value-specific design guidelines
8. **Responsive Behavior** — Breakpoint table, touch targets, collapse strategies
9. **Agent Prompt Guide** — Token quick reference, component prompt examples, stability usage guide

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | TypeScript + Express + Playwright + AI API |
| Frontend | Next.js + Tailwind CSS |
| AI | OpenAI-compatible chat completions API |

## Project Structure

```
DesignPick/
├── frontend/          # Next.js frontend
│   └── src/app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
├── backend/           # Express backend
│   └── src/
│       ├── scraper/     # Playwright web scraping
│       ├── analyzer/    # Color/typography/spacing/component/shadow/responsive/stability/token-naming/state-completion
│       ├── ai/          # AI prompts + generation
│       ├── renderer/    # DESIGN.md → preview.html
│       └── server.ts    # API server
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Playwright browser: `npx playwright install chromium`

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Edit API key and base URL
npm run dev            # Start API server on port :3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Start frontend on port :3000
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | AI API key | — |
| `ANTHROPIC_BASE_URL` | AI API endpoint | `https://api.anthropic.com` |
| `AI_MODEL` | AI model identifier | `z-ai/glm-5.1` |
| `PORT` | Backend port | `3001` |

> **Note:** API key, endpoint, and model can also be configured in the frontend UI settings panel. Frontend settings take precedence over environment variables.

## Supported AI Providers

The system uses an OpenAI-compatible chat completions API, supporting any provider that implements this interface:

| Provider | API Endpoint | Models |
|----------|-------------|--------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4o-mini` |
| Anthropic (via proxy) | Your proxy address | `claude-sonnet-4-6`, `claude-opus-4-7` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat`, `deepseek-reasoner` |
| Zhipu (智谱) | `https://open.bigmodel.cn/api/paas/v1` | `glm-4-plus`, `glm-4-flash` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-auto` |
| Volcengine (火山引擎) | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-1-5-pro-32k-250115` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| Custom / Self-hosted | Your server address | Any compatible model |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/extract/url` | URL extraction — body: `{ url, apiKey?, baseURL?, model? }` |
| POST | `/api/test-connection` | Test AI API connection — body: `{ apiKey, baseURL, model? }` |

## CLI Usage

```bash
npx extract-design url https://vercel.com -o ./output

# Options
--model <model>       Specify AI model
--no-headless         Show browser window
--timeout <ms>        Page load timeout
--dark-mode           Scrape in dark mode
```

## Data Flow

```
URL → Playwright scrape → computed styles + viewport screenshot
   → Analyzers (color/typography/spacing/component/shadow/responsive)
   → Stability classifier (L1-L4)
   → Token namer (color-primary-500, spacing-md...)
   → State completer (hover/focus/disabled)
   → AI API (analysis data + token names + stability tags → DESIGN.md)
   → Output DESIGN.md + preview.html
```

## Analysis Algorithms

- **Color clustering**: CIELAB k-means, pixel-area weighted, excludes body-level backgrounds
- **Typography hierarchy**: heuristic role assignment by font size (≥48px Display → ≤12px Caption)
- **Spacing detection**: candidate base-unit scoring (2/4/5/8/10px), auto-generates spacing scale
- **Component detection**: tag + role + class heuristic classification, variant grouping by visual difference
- **Stability classification**: frequency + role + position heuristics, distinguishing permanent/system/campaign/content tiers
- **Token naming**: CIELAB L* maps to shade (50-900), hue-grouped `color-{hue}-{shade}` naming
- **State completion**: infers hover/focus/disabled states from token shade offsets

## Privacy & Security

- **API keys are never stored on the server** — user-provided keys are only passed within the request lifecycle
- **Frontend API config** is saved only in browser `localStorage`, never sent to any third party
- **`.env` files are excluded via `.gitignore`**

## License

[MIT](LICENSE)