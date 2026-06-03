import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'public', 'templates');
const PREVIEWS_DIR = join(ROOT, 'public', 'previews');
const DATA_DIR = join(ROOT, 'public', 'data');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  const yamlStr = match[1];
  try {
    return {
      frontmatter: yaml.load(yamlStr) || {},
      body: content.slice(match[0].length).trim(),
    };
  } catch {
    // Fallback: extract fields with regex when YAML fails (e.g. description with colons)
    return {
      frontmatter: parseFrontmatterLoose(yamlStr),
      body: content.slice(match[0].length).trim(),
    };
  }
}

function parseFrontmatterLoose(yamlStr) {
  const result = {};
  // Extract version
  const versionMatch = yamlStr.match(/^version:\s*(.+)$/m);
  if (versionMatch) result.version = versionMatch[1].trim();
  // Extract name
  const nameMatch = yamlStr.match(/^name:\s*(.+)$/m);
  if (nameMatch) result.name = nameMatch[1].trim();
  // Extract description (may span multiple lines, until next key:)
  const descMatch = yamlStr.match(/^description:\s*([\s\S]*?)(?=\n\w)/m);
  if (descMatch) result.description = descMatch[1].trim();
  // Extract colors block
  const colorsMatch = yamlStr.match(/^colors:\s*\n((?:  .+\n)*)/m);
  if (colorsMatch) result.colors = parseYamlMap(colorsMatch[1]);
  // Extract typography block
  const typoMatch = yamlStr.match(/^typography:\s*\n((?:  .+\n)*)/m);
  if (typoMatch) result.typography = parseYamlMapDeep(typoMatch[1]);
  // Extract rounded block
  const roundedMatch = yamlStr.match(/^rounded:\s*\n((?:  .+\n)*)/m);
  if (roundedMatch) result.rounded = parseYamlMap(roundedMatch[1]);
  // Extract spacing block
  const spacingMatch = yamlStr.match(/^spacing:\s*\n((?:  .+\n)*)/m);
  if (spacingMatch) result.spacing = parseYamlMap(spacingMatch[1]);
  // Extract components block
  const compMatch = yamlStr.match(/^components:\s*\n((?:  .+\n)*)/m);
  if (compMatch) result.components = parseYamlMapDeep(compMatch[1]);
  return result;
}

function parseYamlMap(str) {
  const map = {};
  for (const line of str.split('\n')) {
    const m = line.match(/^\s+(\S+):\s*"?([^"]*)"?$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function parseYamlMapDeep(str) {
  const map = {};
  let currentKey = '';
  let currentObj = null;
  for (const line of str.split('\n')) {
    // Top-level key (2 spaces indent)
    const topMatch = line.match(/^  (\S+):\s*$/);
    if (topMatch) {
      if (currentKey && currentObj) map[currentKey] = currentObj;
      currentKey = topMatch[1];
      currentObj = {};
      continue;
    }
    // Nested property (4+ spaces indent)
    if (currentObj) {
      const propMatch = line.match(/^\s+(\S+):\s*"?([^"]*)"?$/);
      if (propMatch) currentObj[propMatch[1]] = propMatch[2];
    }
  }
  if (currentKey && currentObj) map[currentKey] = currentObj;
  return map;
}

function extractPrimaryColor(colors) {
  if (!colors) return '#5b76fe';
  if (colors.primary) return colors.primary;
  // Fallback: first color value that looks like a hex
  for (const val of Object.values(colors)) {
    if (typeof val === 'string' && val.startsWith('#')) return val;
  }
  return '#5b76fe';
}

function extractInkColor(colors) {
  if (!colors) return '#1a1a2e';
  if (colors.ink) return colors.ink;
  if (colors['ink-secondary']) return colors['ink-secondary'];
  return '#1a1a2e';
}

function extractFontFamily(typography) {
  if (!typography) return '';
  // Get the first entry's fontFamily
  for (const val of Object.values(typography)) {
    if (val && val.fontFamily) {
      // Clean up: take the first font, remove quotes
      return val.fontFamily.split(',')[0].replace(/'/g, '').trim();
    }
  }
  return '';
}

function countComponents(components) {
  if (!components || typeof components !== 'object') return 0;
  return Object.keys(components).length;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  // Load category mapping
  const slugsData = JSON.parse(await readFile(join(__dirname, 'slugs.json'), 'utf-8'));

  // Build slug → category map
  const slugToCategory = {};
  for (const [catId, slugs] of Object.entries(slugsData.slugs)) {
    for (const slug of slugs) {
      slugToCategory[slug] = catId;
    }
  }

  // Read all .md files
  const files = await readdir(TEMPLATES_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  const templates = [];
  let errors = 0;

  for (const file of mdFiles) {
    const slug = file.replace('.md', '');
    try {
      // Check if preview.html exists
      let hasPreview = false;
      try {
        const s = await stat(join(PREVIEWS_DIR, `${slug}.html`));
        hasPreview = s.size > 500;
      } catch {}

      const content = await readFile(join(TEMPLATES_DIR, file), 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const primaryColor = extractPrimaryColor(frontmatter.colors);
      const inkColor = extractInkColor(frontmatter.colors);
      const fontFamily = extractFontFamily(frontmatter.typography);
      const componentCount = countComponents(frontmatter.components);

      // Extract display name from frontmatter name (e.g., "Apple-design-analysis" → "Apple")
      const name = (frontmatter.name || slug).replace(/-design-analysis$/i, '').replace(/-inspired$/i, '');

      const entry = {
        slug,
        name: formatName(name),
        category: slugToCategory[slug] || 'other',
        description: frontmatter.description || '',
        primaryColor,
        inkColor,
        fontFamily,
        componentCount,
        hasPreview,
        sourceUrl: `https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/${slug}`,
        // Full structured data for detail page
        colors: frontmatter.colors || {},
        typography: frontmatter.typography || {},
        rounded: frontmatter.rounded || {},
        spacing: frontmatter.spacing || {},
        components: frontmatter.components || {},
      };

      // Write per-template JSON
      await writeFile(
        join(DATA_DIR, `${slug}.json`),
        JSON.stringify(entry, null, 2),
        'utf-8'
      );

      // Index entry (lighter version without full component details)
      templates.push({
        slug: entry.slug,
        name: entry.name,
        category: entry.category,
        description: entry.description,
        primaryColor: entry.primaryColor,
        inkColor: entry.inkColor,
        fontFamily: entry.fontFamily,
        componentCount: entry.componentCount,
        hasPreview: entry.hasPreview,
        sourceUrl: entry.sourceUrl,
      });
    } catch (err) {
      console.warn(`  ⚠ ${slug}: ${err.message}`);
      errors++;
    }
  }

  // Write templates.json index
  const index = {
    generatedAt: new Date().toISOString(),
    source: 'VoltAgent/awesome-design-md',
    categories: slugsData.categories,
    templates,
  };

  await writeFile(
    join(DATA_DIR, 'templates.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );

  console.log(`Generated: ${templates.length} templates, ${errors} errors`);
}

function formatName(slug) {
  // Special cases
  const names = {
    'bmw-m': 'BMW M',
    'dell-1996': 'Dell (1996)',
    'linear.app': 'Linear',
    'mistral.ai': 'Mistral AI',
    'opencode.ai': 'OpenCode AI',
    'together.ai': 'Together AI',
    'x.ai': 'xAI',
    'theverge': 'The Verge',
    'runwayml': 'Runway',
    'cal': 'Cal.com',
  };
  if (names[slug]) return names[slug];
  // Default: capitalize first letter
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
