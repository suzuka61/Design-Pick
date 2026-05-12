// Provider presets for AI API configuration
export const PROVIDER_PRESETS: Record<string, { baseURL: string; model: string; label: string }> = {
  openai:      { baseURL: 'https://api.openai.com/v1',                    model: 'gpt-4o-mini',       label: 'OpenAI' },
  deepseek:    { baseURL: 'https://api.deepseek.com/v1',                  model: 'deepseek-chat',     label: 'DeepSeek' },
  zhipu:       { baseURL: 'https://open.bigmodel.cn/api/paas/v1',         model: 'glm-4-flash',       label: '智谱 GLM' },
  moonshot:    { baseURL: 'https://api.moonshot.cn/v1',                   model: 'moonshot-v1-auto',  label: 'Moonshot' },
  volcengine:  { baseURL: 'https://ark.cn-beijing.volces.com/api/v3',     model: 'doubao-1-5-pro-32k-250115', label: '火山引擎' },
  siliconflow: { baseURL: 'https://api.siliconflow.cn/v1',                model: 'deepseek-ai/DeepSeek-V3', label: 'SiliconFlow' },
  custom:      { baseURL: '', model: '', label: '自定义' },
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