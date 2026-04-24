# DesignPick

从任意网页中提取设计系统，生成带 Token 命名和稳定性分类的结构化 DESIGN.md 文件。

## 功能

输入网页 URL → 输出 9 段式 DESIGN.md 设计规范 + 可交互 preview.html 预览页面。

**Token 命名系统**：每个设计值自动生成系统性 Token 名（如 `color-primary-500`、`spacing-md`、`radius-lg`），AI agent 可直接引用。

**4 层稳定性分类**：
- **[L1] Infrastructure** — 永久：主色、强调色、字体家族、基础间距单位
- **[L2] System** — 重设计周期：中性色阶、组件样式、阴影、圆角
- **[L3] Campaign** — 每次活动：低频强调色、hero 区域色
- **[L4] Content** — 持续变化：图片衍生色（AI 使用时应忽略）

**组件状态补全**：自动推断组件缺失的 hover/focus/disabled 状态，用 Token 引用表达。

## DESIGN.md 九大段落

1. **Visual Theme & Atmosphere** — 设计哲学、情感调性、关键特征
2. **Color Palette & Roles** — 按 hue 分组色阶表（shade 50-900）+ Token 名 + 稳定性
3. **Typography Rules** — 字体家族、层级表（含 Token 名）、排版原则
4. **Component Stylings** — Button / Card / Input / Navigation 的 Rule Token 表 + 自动补全状态
5. **Layout Principles** — Spacing Token 表、网格、圆角 Token 表
6. **Depth & Elevation** — Shadow Token 表、阴影哲学
7. **Do's and Don'ts** — 具体数值的设计指南
8. **Responsive Behavior** — 断点表、触控目标、折叠策略
9. **Agent Prompt Guide** — Token 速查、组件 prompt 示例、稳定性使用指南

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | TypeScript + Express + Playwright + AI API |
| 前端 | Next.js + Tailwind CSS |
| AI | OpenAI 兼容 chat completions API |

## 项目结构

```
提取design项目/
├── 前端/          # Next.js 前端
│   └── src/app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
├── 后端/          # Express 后端
│   └── src/
│       ├── scraper/     # Playwright 网页抓取
│       ├── analyzer/    # 颜色/字体/间距/组件/阴影/响应式/稳定性/Token命名/状态补全
│       ├── ai/          # AI 提示词 + 生成
│       ├── renderer/    # DESIGN.md → preview.html
│       └── server.ts    # API 服务器
└── README.md
```

## 快速开始

### 前置条件

- Node.js 18+
- Playwright 浏览器：`npx playwright install chromium`

### 后端

```bash
cd 后端
npm install
cp .env.example .env   # 编辑 API key 和 base URL
npm run dev            # 启动 API 服务器，端口 :3001
```

### 前端

```bash
cd 前端
npm install
npm run dev            # 启动前端，端口 :3000
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|--------|--------|
| `ANTHROPIC_API_KEY` | AI API 密钥 | — |
| `ANTHROPIC_BASE_URL` | AI API 地址 | `https://api.anthropic.com` |
| `AI_MODEL` | AI 模型标识 | `z-ai/glm-5.1` |
| `PORT` | 后端端口 | `3001` |

> **注意：** API 密钥、地址和模型也可以在前端 UI 的设置面板中配置，前端设置优先于环境变量。

## 支持的 AI 服务商

系统使用 OpenAI 兼容的 chat completions API，支持任何实现了该接口的服务商：

| 服务商 | API 地址 | 模型 |
|--------|----------|------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4o-mini` |
| Anthropic（通过代理） | 你的代理地址 | `claude-sonnet-4-6`, `claude-opus-4-7` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat`, `deepseek-reasoner` |
| 智谱 (Zhipu) | `https://open.bigmodel.cn/api/paas/v1` | `glm-4-plus`, `glm-4-flash` |
| Moonshot（月之暗面） | `https://api.moonshot.cn/v1` | `moonshot-v1-auto` |
| 火山引擎 (Volcengine) | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-1-5-pro-32k-250115` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| 自定义 / 自托管 | 你的服务器地址 | 任何兼容模型 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/extract/url` | URL 提取 — body: `{ url, model? }` |

## CLI 使用

```bash
npx extract-design url https://vercel.com -o ./output

# 选项
--model <model>       指定 AI 模型
--no-headless         显示浏览器窗口
--timeout <ms>        页面加载超时
--dark-mode           暗色模式抓取
```

## 数据流

```
URL → Playwright 抓取 → computed styles + viewport 截图
   → 分析器（颜色/字体/间距/组件/阴影/响应式）
   → 稳定性分类器（L1-L4）
   → Token 命名器（color-primary-500, spacing-md...）
   → 状态补全器（hover/focus/disabled）
   → AI API（分析数据 + Token 名 + 稳定性标注 → DESIGN.md）
   → 输出 DESIGN.md + preview.html
```

## 隐私与安全

- **API 密钥不会存储在服务器上** — 用户提供的密钥仅在请求生命周期内传递
- **前端 API 配置**仅保存在浏览器 `localStorage`，不会发送到任何第三方
- **`.env` 文件已通过 `.gitignore` 排除**

## 开源协议

[MIT](LICENSE)

## 分析算法

- **颜色聚类**：CIELAB k-means，像素面积加权，排除 body 级背景
- **字体层级**：按字号启发式分配角色（≥48px Display → ≤12px Caption）
- **间距检测**：候选基础单位打分（2/4/5/8/10px），自动生成间距尺度
- **组件检测**：基于 tag + role + class 启发式分类，按视觉差异分组变体
- **稳定性分类**：基于频率+角色+位置启发式，区分永久/系统/活动/内容层级
- **Token 命名**：CIELAB L* 映射 shade（50-900），按色相分组生成 `color-{hue}-{shade}` 命名
- **状态补全**：基于 Token shade 偏移推断 hover/focus/disabled 状态值