# DesignPick 前端重构：组件拆分 + Tailwind 化

## 目标

将单文件 page.tsx（540行）拆分为独立组件，同时将内联 style={{}} 迁移为 Tailwind CSS 类名。不改后端、不加新功能、不引入新依赖。

## 组件拆分结构

```
page.tsx — 瘦壳（状态管理 + API 调用 + 组件组合）

components/
  ├── Navbar.tsx           props: scrolled, showSettings, onToggleSettings, testResult
  ├── ApiSettings.tsx      props: apiKey, baseURL, model, providerPreset, testResult, testing + setters
  ├── HeroSection.tsx      props: url, loading, progress, progressPercent, error, onUrlChange, onSubmit, onCancel
  ├── WorkflowSteps.tsx    props: activeStep, onStepChange
  ├── Capabilities.tsx     无 props（纯展示）
  ├── ResultView.tsx       props: result, onBack
  │   ├── ResultHeader.tsx    props: sourceUrl, onBack
  │   ├── ResultToolbar.tsx   props: resultTab, onTabChange, downloadStatus, onDownloadMd, onDownloadHtml
  │   ├── AnalysisBar.tsx     props: analysis, validation
  │   └── ResultContent.tsx   props: resultTab, designMd, previewHtml
  └── Footer.tsx           props: loading, progress, error, result, apiKey

lib/
  └── constants.ts         PROVIDER_PRESETS, steps, caps

components/ui/
  └── sparkles-text.tsx    保持不动
```

状态管理留在 page.tsx，通过 props 下传。不引入 context（组件层级不深）。

## Tailwind 样式迁移

### 变量映射

@theme 已注册的变量可直接用 Tailwind 类名：
- `var(--color-bg)` → `bg-bg`
- `var(--color-text-primary)` → `text-text-primary`
- `var(--color-accent)` → `bg-accent` / `text-accent`
- `var(--font-mono)` → `font-mono`
- `var(--font-serif)` → `font-serif`

固定值用任意值语法：
- `maxWidth: 1200` → `max-w-[1200px]`
- `letterSpacing: '0.2em'` → `tracking-[0.2em]`
- `fontSize: 11` → `text-[11px]`

### globals.css 处理

保留：动画类（@keyframes spin/pulse/progress-flow）和复合样式类（.spinner、.pulse-dot、.progress-bar、.markdown-body）。

删除：被 Tailwind 类名替代的简单类（.btn-primary、.btn-ghost、.nav-link 等）。

新增 @theme 变量：
```css
--radius-sm: 2px;
--radius-md: 4px;
```

### 迁移方式

每个组件拆出时同时做 Tailwind 化，不产生内联样式的中间态。

## 执行顺序

| 步骤 | 操作 | 验证 |
|---|---|---|
| 1 | 创建 lib/constants.ts | 常量值不变 |
| 2 | 拆出 Footer.tsx + Tailwind 化 | 底栏渲染一致 |
| 3 | 拆出 Navbar.tsx + Tailwind 化 | 导航栏渲染一致，scroll 效果正常 |
| 4 | 拆出 ApiSettings.tsx + Tailwind 化 | 设置面板交互正常 |
| 5 | 拆出 Capabilities.tsx + Tailwind 化 | 九大段落展示一致 |
| 6 | 拆出 WorkflowSteps.tsx + Tailwind 化 | 步骤切换正常 |
| 7 | 拆出 HeroSection.tsx + Tailwind 化 | 输入框、进度条、错误提示一致 |
| 8 | 拆出 ResultView.tsx + 子组件 + Tailwind 化 | Tab切换、下载、分析条正常 |
| 9 | 清理 page.tsx，删除 globals.css 中已替代的类 | 无视觉差异 |
| 10 | npm run build 无报错 | 构建成功 |

## 约束

- 不改后端代码
- 不加新功能（响应式、新动效等是后续任务）
- 不引入新依赖
