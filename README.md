# DesignPick

[English](README_EN.md)

Chrome 浏览器扩展 — 一键从任意网页提取设计系统，生成 AI agent 可直接使用的 DESIGN.md。

## 为什么需要 DESIGN.md？

| | AGENTS.md | DESIGN.md |
|---|---|---|
| 目的 | 告诉 AI 如何编写代码 | 告诉 AI 应该写成什么样 |
| 内容 | 代码规范、PR 流程、测试要求 | 颜色、字体、间距、组件样式、阴影层级 |
| 价值 | 让 AI 写出正确的行为 | 让 AI 写出正确的视觉 |

**awesome-design-md** 手工为 70+ 网站撰写了 DESIGN.md（86k stars），但只能手动更新、无法自动提取。DesignPick 补上这一步——任意网页 → 自动 DESIGN.md。

| | awesome-design-md | DesignPick |
|---|---|---|
| 方式 | 人工定制 | 浏览器扩展自动提取 |
| 输入 | 人工观察 | 当前页面一键提取 |
| Token 命名 | 无 | `color-primary-500`、`spacing-md`、`radius-lg`… |
| 映射层 | 无 | Token → 使用场景双向映射 |
| 约束层 | 无 | 从页面反推 Do's and Don'ts |
| 稳定性分类 | 无 | L1 永久 → L4 易变 |
| 状态补全 | 无 | 自动推断 7 种交互状态 |
| 无障碍检测 | 无 | WCAG 2.2 AA |
| 动画 Token | 无 | `motion-duration-fast`、`motion-easing-standard`… |
| AI 增强 | 无 | 可选接入 AI API 润色 |
| 速度 | 数小时 | 数秒 |

## 安装

1. `cd extension && npm install && npm run build`
2. Chrome 打开 `chrome://extensions`
3. 右上角开启 **开发者模式**
4. 点击 **加载已解压的扩展程序** → 选择 `extension/dist/` 目录
5. 任意网页点击扩展图标 → Side Panel 打开 → 点击「提取」

## 使用

1. 打开任意网页
2. 点击浏览器工具栏的 DesignPick 图标
3. Side Panel 中点击 **提取当前页面设计系统**
4. 等待进度走完 → 查看 DESIGN.md / 预览
5. 下载 `.md` 或 `.html`
6. 点击 **浏览全部模板** → 打开在线模板库（73 个精选 DESIGN.md）

### 可选：AI 增强

在 Side Panel 的 ⚙ 设置中填入 API Key，提取后可点击 AI 增强。支持任何 OpenAI 兼容 API（OpenAI / DeepSeek / 智谱 / Moonshot 等）。不填 Key 也能正常使用。

## 模板库

在线访问 73 个精选设计系统模板，来自 awesome-design-md 开源社区：

- 按行业分类：AI 与大模型、开发者工具、后端与运维、效率与 SaaS、设计与创意、金融与加密、电商与零售、媒体与消费、汽车
- 每个模板包含：真实渲染预览、色彩体系、排版规范、组件规范、完整 DESIGN.md
- 部署在 Vercel，独立于扩展更新

本地构建模板数据：

```bash
cd gallery && npm install && npm run build
```

## 稳定性分类

每个设计值标注稳定性层级，AI agent 知道哪些值可以放心引用：

- **[L1] Infrastructure** — 永久：主色、强调色、字体家族、基础间距
- **[L2] System** — 重设计周期：中性色阶、组件样式、阴影、圆角
- **[L3] Campaign** — 每次活动：低频强调色、hero 区域色
- **[L4] Content** — 持续变化：图片衍生色（AI 使用时应忽略）

## DESIGN.md 十五段

1. Mission 2. Brand Context 3. Visual Theme 4. Color Palette 5. Typography 6. Component Stylings 7. Layout 8. Depth & Elevation 9. Accessibility 10. Motion 11. Do's and Don'ts 12. Responsive 13. Anti-Patterns 14. QA Checklist 15. Agent Prompt Guide

## 项目结构

```
extension/                    # Chrome 扩展
├── content/extract.ts        # Content Script — DOM 遍历提取
├── background/sw.ts          # Service Worker — 管线编排
├── sidepanel/                # Side Panel UI
├── analyzer/                 # 12 个分析模块
├── generator/                # DESIGN.md 生成 + 可选 AI 增强
└── renderer/                 # preview.html 渲染

gallery/                      # 模板库（静态站，部署 Vercel）
├── public/                   # 前端页面（单页应用）
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── scripts/                  # 数据管道
    ├── slugs.json            # 73 个模板 slug + 分类映射
    ├── sync-templates.mjs    # 从 GitHub 拉取 DESIGN.md + preview.html
    └── generate-index.mjs    # 解析 YAML，生成 JSON 索引
```

## 开源协议

[MIT](LICENSE)
