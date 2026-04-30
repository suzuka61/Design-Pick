# DesignPick 前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 page.tsx（540行）拆分为独立组件 + 内联样式迁移为 Tailwind CSS 类名

**Architecture:** 从 page.tsx 按区域逐步拆出组件，状态留在 page.tsx 通过 props 下传。每个组件拆出时同步完成 Tailwind 化，不产生中间态。常量提取到 lib/constants.ts。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion

---

## File Structure

```
前端/src/
  app/
    page.tsx              — 瘦壳（状态+API逻辑+组件组合）
    layout.tsx            — 不变
    globals.css           — 删除被 Tailwind 替代的类，保留动画/复合样式
  components/
    Navbar.tsx            — 导航栏
    ApiSettings.tsx       — API 配置浮层
    HeroSection.tsx       — 首屏（标题+输入框+进度+错误）
    WorkflowSteps.tsx     — 工作流程展示
    Capabilities.tsx      — 九大段落能力展示
    ResultView.tsx        — 结果页容器
    ResultHeader.tsx      — 返回栏+源URL
    ResultToolbar.tsx     — Tab切换+下载按钮
    AnalysisBar.tsx       — 分析摘要条
    ResultContent.tsx     — Markdown/预览内容区
    Footer.tsx            — 底部状态栏
    ui/
      sparkles-text.tsx   — 不变
  lib/
    constants.ts          — PROVIDER_PRESETS, steps, caps
```

---

### Task 1: 创建 lib/constants.ts

**Files:**
- Create: `前端/src/lib/constants.ts`

- [ ] **Step 1: 创建常量文件**

```typescript
export const PROVIDER_PRESETS: Record<string, { baseURL: string; model: string; label: string }> = {
  openai:     { baseURL: 'https://api.openai.com/v1',                    model: 'gpt-4o-mini',       label: 'OpenAI' },
  deepseek:   { baseURL: 'https://api.deepseek.com/v1',                  model: 'deepseek-chat',     label: 'DeepSeek' },
  zhipu:      { baseURL: 'https://open.bigmodel.cn/api/paas/v1',         model: 'glm-4-flash',       label: '智谱 GLM' },
  moonshot:   { baseURL: 'https://api.moonshot.cn/v1',                   model: 'moonshot-v1-auto',  label: 'Moonshot' },
  volcengine: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3',     model: 'doubao-1-5-pro-32k-250115', label: '火山引擎' },
  siliconflow:{ baseURL: 'https://api.siliconflow.cn/v1',                model: 'deepseek-ai/DeepSeek-V3', label: 'SiliconFlow' },
  custom:     { baseURL: '', model: '', label: '自定义' },
};

export const WORKFLOW_STEPS = [
  { num: '01', title: '输入', desc: '输入网页 URL' },
  { num: '02', title: '分析', desc: 'AI 驱动的颜色、字体、间距、组件识别' },
  { num: '03', title: '输出', desc: '生成 DESIGN.md / CSS / Tailwind / JSON' },
];

export const CAPABILITIES = [
  { label: '视觉主题与氛围', desc: '设计哲学、情感调性' },
  { label: '调色板与角色', desc: '语义化颜色命名' },
  { label: '排版规则', desc: '字体家族与层级' },
  { label: '组件样式', desc: '按钮/卡片/输入框变体' },
  { label: '布局原则', desc: '间距、网格、留白' },
  { label: '深度与标高', desc: '阴影层级体系' },
];
```

- [ ] **Step 2: 更新 page.tsx 引用**

在 page.tsx 中删除 `PROVIDER_PRESETS`、`steps`、`caps` 的定义，替换为 import：

```typescript
import { PROVIDER_PRESETS, WORKFLOW_STEPS, CAPABILITIES } from '@/lib/constants';
```

将 `steps` 引用改为 `WORKFLOW_STEPS`，`caps` 改为 `CAPABILITIES`。

- [ ] **Step 3: 验证**

Run: `cd 前端 && npm run build`
Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add 前端/src/lib/constants.ts 前端/src/app/page.tsx
git commit -m "refactor: extract constants to lib/constants.ts"
```

---

### Task 2: 拆出 Footer.tsx

**Files:**
- Create: `前端/src/components/Footer.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 Footer 组件**

```tsx
'use client';

interface FooterProps {
  loading: boolean;
  progress: string;
  error: string;
  result: { generatedAt: string } | null;
  hasApiKey: boolean;
}

export default function Footer({ loading, progress, error, result, hasApiKey }: FooterProps) {
  return (
    <footer className="border-t border-border relative z-10">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="spinner w-2.5 h-2.5" />
              <span className="font-mono text-[9px] tracking-[0.15em] text-text-muted">{progress}</span>
            </div>
          ) : error ? (
            <span className="font-mono text-[9px] tracking-[0.15em] text-error">{error}</span>
          ) : result ? (
            <span className="font-mono text-[9px] tracking-[0.15em] text-success">
              完成 — {new Date(result.generatedAt).toLocaleTimeString('zh-CN')}
            </span>
          ) : (
            <span className="font-mono text-[9px] tracking-[1.5px] text-text-muted">就绪</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="status-dot success" />
          <span className="font-mono text-[9px] tracking-[0.15em] text-text-muted">
            API: {hasApiKey ? '自定义' : 'LOCALHOST:3001'}
          </span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: 更新 page.tsx**

在 page.tsx 中 import Footer，替换原 footer JSX 为：

```tsx
<Footer loading={loading} progress={progress} error={error} result={result} hasApiKey={!!apiKey} />
```

- [ ] **Step 3: 验证**

Run: `cd 前端 && npm run build`
Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/Footer.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract Footer component with Tailwind"
```

---

### Task 3: 拆出 Navbar.tsx

**Files:**
- Create: `前端/src/components/Navbar.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 Navbar 组件**

```tsx
'use client';

interface NavbarProps {
  scrolled: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  testResult: { success: boolean; message: string } | null;
}

export default function Navbar({ scrolled, showSettings, onToggleSettings, testResult }: NavbarProps) {
  return (
    <nav className={`nav-fixed ${scrolled ? 'scrolled' : ''} relative h-20 border-b border-border`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between h-[60px]">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="w-6 h-[1.5px] bg-text-primary" />
            <div className="w-8 h-[1.5px] bg-text-primary" />
          </div>
          <span className="font-serif text-lg font-normal tracking-[-0.02em] text-text-primary">DesignPick</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="https://github.com/suzuka61/Design-Pick" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
          <button onClick={onToggleSettings} className="nav-link bg-transparent border-none cursor-pointer flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
            API 设置
            {testResult?.success && <span className="status-dot success ml-0.5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 更新 page.tsx 引用 Navbar**

- [ ] **Step 3: 验证构建**

Run: `cd 前端 && npm run build`

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/Navbar.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract Navbar component with Tailwind"
```

---

### Task 4: 拆出 ApiSettings.tsx

**Files:**
- Create: `前端/src/components/ApiSettings.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 ApiSettings 组件**

将 page.tsx 中 `{showSettings && (...)}` 整块 JSX 提取为独立组件。Props 包含 apiKey, baseURL, model, providerPreset, testResult, testing 以及对应的 setter 和 handleTestConnection。内部引用 PROVIDER_PRESETS 从 `@/lib/constants` 导入。所有内联 style 替换为 Tailwind 类名。

- [ ] **Step 2: 更新 page.tsx 引用**

- [ ] **Step 3: 验证构建 + 测试连接功能**

Run: `cd 前端 && npm run build`

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/ApiSettings.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract ApiSettings component with Tailwind"
```

---

### Task 5: 拆出 Capabilities.tsx

**Files:**
- Create: `前端/src/components/Capabilities.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 Capabilities 组件**

纯展示组件，无 props。从 `@/lib/constants` 导入 CAPABILITIES。将 `{/* Capabilities */}` 区块的内联样式全部替换为 Tailwind 类名。

- [ ] **Step 2: 更新 page.tsx**

- [ ] **Step 3: 验证构建**

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/Capabilities.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract Capabilities component with Tailwind"
```

---

### Task 6: 拆出 WorkflowSteps.tsx

**Files:**
- Create: `前端/src/components/WorkflowSteps.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 WorkflowSteps 组件**

```tsx
'use client';

import { WORKFLOW_STEPS } from '@/lib/constants';

interface WorkflowStepsProps {
  activeStep: number;
  onStepChange: (index: number) => void;
}

export default function WorkflowSteps({ activeStep, onStepChange }: WorkflowStepsProps) {
  return (
    <section className="border-t border-border py-7 flex flex-col items-center gap-5">
      <div className="font-mono text-[13px] font-normal tracking-[4px] text-accent text-center">工作流程</div>
      <div className="w-[1160px] flex justify-center border border-border">
        {WORKFLOW_STEPS.map((s, i) => (
          <div
            key={i}
            onClick={() => onStepChange(i)}
            className={`w-1/3 py-8 px-9 cursor-pointer transition-opacity duration-700 ${
              i < 2 ? 'border-r border-border' : ''
            } ${activeStep === i ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className="font-mono text-[10px] font-normal tracking-[3px] text-text-muted mb-3">{s.num}</div>
            <div className="font-serif text-[22px] font-normal text-text-primary tracking-[-0.3px] mb-3">{s.title}</div>
            {activeStep === i && (
              <div className="font-sans text-[13px] text-text-secondary leading-[1.7]">{s.desc}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 更新 page.tsx**

- [ ] **Step 3: 验证构建**

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/WorkflowSteps.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract WorkflowSteps component with Tailwind"
```

---

### Task 7: 拆出 HeroSection.tsx

**Files:**
- Create: `前端/src/components/HeroSection.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 HeroSection 组件**

包含 SparklesText 标题、副标题、输入卡片（URL输入、进度条、提交按钮、错误提示）。所有内联样式替换为 Tailwind。Props 包含 url, loading, progress, progressPercent, error, onUrlChange, onSubmit, onCancel。

- [ ] **Step 2: 更新 page.tsx**

- [ ] **Step 3: 验证构建**

- [ ] **Step 4: 提交**

```bash
git add 前端/src/components/HeroSection.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract HeroSection component with Tailwind"
```

---

### Task 8: 拆出 ResultView + 子组件

**Files:**
- Create: `前端/src/components/ResultView.tsx`
- Create: `前端/src/components/ResultHeader.tsx`
- Create: `前端/src/components/ResultToolbar.tsx`
- Create: `前端/src/components/AnalysisBar.tsx`
- Create: `前端/src/components/ResultContent.tsx`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 创建 ResultHeader.tsx**

返回按钮 + 源URL显示，Tailwind 化。

- [ ] **Step 2: 创建 ResultToolbar.tsx**

Tab 切换 + 下载按钮，Tailwind 化。

- [ ] **Step 3: 创建 AnalysisBar.tsx**

分析摘要条（主色、强调色、字体层级、组件数、验证状态），Tailwind 化。

- [ ] **Step 4: 创建 ResultContent.tsx**

Markdown 文本 / iframe 预览切换，Tailwind 化。

- [ ] **Step 5: 创建 ResultView.tsx**

组合以上四个子组件。Props 包含 result, onBack, resultTab, onTabChange, downloadStatus, onDownloadMd, onDownloadHtml。

- [ ] **Step 6: 更新 page.tsx**

- [ ] **Step 7: 验证构建**

Run: `cd 前端 && npm run build`

- [ ] **Step 8: 提交**

```bash
git add 前端/src/components/ResultView.tsx 前端/src/components/ResultHeader.tsx 前端/src/components/ResultToolbar.tsx 前端/src/components/AnalysisBar.tsx 前端/src/components/ResultContent.tsx 前端/src/app/page.tsx
git commit -m "refactor: extract ResultView and sub-components with Tailwind"
```

---

### Task 9: 清理 globals.css + page.tsx

**Files:**
- Modify: `前端/src/app/globals.css`
- Modify: `前端/src/app/page.tsx`

- [ ] **Step 1: 在 @theme inline 中补充缺失变量**

```css
--radius-sm: 2px;
--radius-md: 4px;
```

- [ ] **Step 2: 删除 globals.css 中已被 Tailwind 替代的类**

删除以下类（保留注释说明哪些被保留）：
- `.btn-primary`, `.btn-ghost` → 已用 Tailwind 类名替代
- `.nav-link` → 已用 Tailwind 类名替代
- `.input-field` → 已用 Tailwind 类名替代
- `.select-field` → 已用 Tailwind 类名替代
- `.settings-input` → 已用 Tailwind 类名替代
- `.drop-zone` → 未使用
- `.tab-item` → 未使用
- `.stat-cell` → 未使用
- `.word-reveal` → 未使用
- `.section-divider` → 已用 Tailwind 类名替代
- `.step-number` → 已用 Tailwind 类名替代
- `.feature-pill` → 未使用
- `.download-btn`, `.download-btn--success` → 已用 Tailwind 类名替代
- `.back-btn` → 已用 Tailwind 类名替代
- `.error-alert`, `.error-alert__title`, `.error-alert__message`, `.error-alert__close` → 已用 Tailwind 类名替代

保留的类：
- `.bg-grid` — 复杂 CSS 效果
- `.nav-fixed`, `.nav-fixed.scrolled` — 涉及 backdrop-filter 等复杂属性
- `.spinner` + `@keyframes spin` — 动画
- `.pulse-dot` + `@keyframes pulse` — 动画
- `.loading-progress`, `.progress-bar`, `.progress-bar__fill`, `.progress-bar__label` + `@keyframes progress-flow` — 动画
- `.markdown-body` 及其子选择器 — 复杂嵌套样式
- `.status-dot` — 全局复用
- `.result-tabs`, `.result-tab` — 复杂交互样式

- [ ] **Step 3: 清理 page.tsx**

确保 page.tsx 只包含状态定义、API 调用逻辑和组件组合，无残留内联样式。

- [ ] **Step 4: 验证**

Run: `cd 前端 && npm run build`

- [ ] **Step 5: 提交**

```bash
git add 前端/src/app/globals.css 前端/src/app/page.tsx
git commit -m "refactor: clean up globals.css and finalize page.tsx"
```

---

### Task 10: 最终验证

- [ ] **Step 1: 构建验证**

Run: `cd 前端 && npm run build`
Expected: 构建成功，无警告

- [ ] **Step 2: 视觉对比**

启动 `npm run dev`，逐页检查：
- 首页：导航栏、Hero、工作流程、九大段落
- API 设置面板：打开/关闭/预设切换/测试连接
- 结果页：Tab 切换、下载按钮、分析条
- 底栏：各状态显示

Expected: 与重构前视觉一致

- [ ] **Step 3: 最终提交（如有遗漏修复）**

```bash
git add -A && git commit -m "refactor: final fixes for frontend component split"
```
