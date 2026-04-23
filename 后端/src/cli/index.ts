#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { scrapePage } from '../scraper/page-scraper.js';
import { analyzePage } from '../analyzer/index.js';
import { classifyStability } from '../analyzer/stability-classifier.js';
import { DesignMDGenerator } from '../ai/generator.js';
import { renderPreviewHTML } from '../renderer/html-renderer.js';
import { validateDesignMD } from '../types/design-md.js';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('extract-design')
  .description('Extract design system from a webpage into DESIGN.md')
  .version('0.2.0');

program
  .command('url <url>')
  .description('Extract design from a live URL')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--no-headless', 'Show browser window')
  .option('--model <model>', 'AI model to use', 'claude-sonnet-4-20250514')
  .option('--timeout <ms>', 'Page load timeout', '30000')
  .option('--dark-mode', 'Scrape in dark mode')
  .action(async (url: string, options) => {
    console.log(`Extracting design from: ${url}`);

    // Step 1: Scrape
    console.log('  Scraping page...');
    const extracted = await scrapePage(url, {
      headless: options.headless,
      timeout: parseInt(options.timeout),
      darkMode: options.darkMode,
    });
    console.log(`  Found ${extracted.mediaQueries.length} media queries, ${Object.keys(extracted.cssVariables).length} CSS variables`);

    // Step 2: Analyze
    console.log('  Analyzing design system...');
    const analyzed = analyzePage(extracted);
    classifyStability(analyzed);
    console.log(`  Colors: ${analyzed.colors.neutralScale.length} neutral + ${analyzed.colors.surface.length} surface`);
    console.log(`  Typography: ${analyzed.typography.hierarchy.length} hierarchy levels`);
    console.log(`  Components: ${analyzed.components.buttons.length} buttons, ${analyzed.components.cards.length} cards`);

    // Step 3: Generate DESIGN.md
    console.log('  Generating DESIGN.md with AI...');
    const generator = new DesignMDGenerator(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_BASE_URL
    );
    const designDoc = await generator.generateFromAnalysis(analyzed, extracted.screenshots, {
      model: options.model,
    });

    // Step 4: Validate
    const validation = validateDesignMD(designDoc.rawMarkdown);
    if (!validation.valid) {
      console.warn('  Validation issues:', validation.issues);
    } else {
      console.log('  DESIGN.md validated successfully');
    }

    // Step 5: Write output
    const outputDir = path.resolve(options.output);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, 'DESIGN.md'),
      designDoc.rawMarkdown,
      'utf-8'
    );
    console.log(`  Written: ${path.join(outputDir, 'DESIGN.md')}`);

    fs.writeFileSync(
      path.join(outputDir, 'preview.html'),
      renderPreviewHTML(designDoc),
      'utf-8'
    );
    console.log(`  Written: ${path.join(outputDir, 'preview.html')}`);

    console.log('Done!');
  });

program.parse();
