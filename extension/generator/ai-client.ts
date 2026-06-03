/**
 * Optional AI enhancement client — sends template-generated DESIGN.md to AI for refinement.
 * Users configure their own API key in the Side Panel settings.
 */

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export async function enhanceWithAI(
  templateMarkdown: string,
  config: AIConfig,
): Promise<string> {
  const systemPrompt = `You are a senior design systems engineer. Refine the provided DESIGN.md draft. Keep the 15-section structure exactly. Improve prose quality, add missing details where the template left placeholders, and ensure all quality gates (🚫 MUST / ✅ SHOULD) are properly tagged. Do NOT change token names or values — only improve the presentation and completeness.`;

  const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Refine this DESIGN.md draft:\n\n${templateMarkdown}` },
      ],
      max_tokens: 8192,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? templateMarkdown;
}