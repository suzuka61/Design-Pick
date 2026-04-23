interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ChatResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class AIClient {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(apiKey?: string, baseURL?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseURL = (baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
    this.defaultModel = process.env.AI_MODEL || 'claude-sonnet-4-6';
  }

  async generateDesignMD(
    systemPrompt: string,
    userPrompt: string,
    images?: Buffer[],
    options?: { model?: string; maxTokens?: number }
  ): Promise<string> {
    const model = options?.model ?? this.defaultModel;
    const maxTokens = options?.maxTokens ?? 8192;

    // Build content parts
    const contentParts: ChatContentPart[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        const base64 = img.toString('base64');
        // Detect format from JPEG magic bytes (FF D8 FF)
        const isJpeg = img[0] === 0xFF && img[1] === 0xD8 && img[2] === 0xFF;
        const mediaType = isJpeg ? 'image/jpeg' : 'image/png';
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${mediaType};base64,${base64}` },
        });
      }
    }

    contentParts.push({ type: 'text', text: userPrompt });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: contentParts.length === 1 && contentParts[0].type === 'text'
          ? (contentParts[0] as { type: 'text'; text: string }).text
          : contentParts,
      },
    ];

    const body = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    };

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as ChatResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    return content;
  }

  async testConnection(model?: string): Promise<{ model: string; responseTime: number }> {
    const testModel = model || this.defaultModel;
    const start = Date.now();

    const body = {
      model: testModel,
      messages: [
        { role: 'user', content: 'Reply with exactly: OK' },
      ],
      max_tokens: 10,
      temperature: 0,
    };

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as ChatResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    return { model: testModel, responseTime: Date.now() - start };
  }
}
