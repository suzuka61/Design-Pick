import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scrapePage } from './scraper/page-scraper.js';
import { analyzePage } from './analyzer/index.js';
import { classifyStability } from './analyzer/stability-classifier.js';
import { generateTokenNames } from './analyzer/token-namer.js';
import { completeStates } from './analyzer/state-completer.js';
import { DesignMDGenerator } from './ai/generator.js';
import { renderPreviewHTML } from './renderer/html-renderer.js';
import { validateDesignMD } from './types/design-md.js';
import { AIClient } from './ai/client.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API connection test
app.post('/api/test-connection', async (req, res) => {
  const { apiKey, baseURL, model } = req.body;

  if (!apiKey || !baseURL) {
    res.status(400).json({ error: 'apiKey and baseURL are required' });
    return;
  }

  try {
    const client = new AIClient(apiKey, baseURL);
    const result = await client.testConnection(model || 'gpt-4o-mini');
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.json({ success: false, error: message });
  }
});

// Resolve API config: frontend overrides take precedence over env vars
function resolveApiConfig(body: Record<string, string>) {
  return {
    apiKey: body.apiKey || process.env.ANTHROPIC_API_KEY || '',
    baseURL: (body.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
    model: body.model || process.env.AI_MODEL || 'z-ai/glm-5.1',
  };
}

// URL mode: POST /api/extract/url
app.post('/api/extract/url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const config = resolveApiConfig(req.body);

  try {
    // Step 1: Scrape
    const extracted = await scrapePage(url);

    // Step 2: Analyze
    const analyzed = analyzePage(extracted);

    // Step 2.5: Classify stability
    classifyStability(analyzed);

    // Step 2.6: Generate token names & complete states
    const tokenMap = generateTokenNames(analyzed);
    completeStates(analyzed.components, tokenMap);

    // Step 3: Generate DESIGN.md
    const generator = new DesignMDGenerator(config.apiKey, config.baseURL);
    const designDoc = await generator.generateFromAnalysis(analyzed, extracted.screenshots, {
      model: config.model,
      tokenMap,
    });

    // Step 4: Validate
    const validation = validateDesignMD(designDoc.rawMarkdown);

    res.json({
      success: true,
      sourceUrl: url,
      generatedAt: designDoc.generatedAt,
      validation,
      designMd: designDoc.rawMarkdown,
      previewHtml: renderPreviewHTML({ ...designDoc, sourceUrl: url }, tokenMap),
      analysis: {
        colors: {
          primary: analyzed.colors.primary,
          accent: analyzed.colors.accent,
          neutralCount: analyzed.colors.neutralScale.length,
          surfaceCount: analyzed.colors.surface.length,
        },
        typography: {
          levels: analyzed.typography.hierarchy.length,
          fontFamilies: analyzed.typography.fontFamilies.map(f => f.name),
        },
        components: {
          buttons: analyzed.components.buttons.length,
          cards: analyzed.components.cards.length,
          inputs: analyzed.components.inputs.length,
          navigation: analyzed.components.navigation.length,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Extract URL error:', message);
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
