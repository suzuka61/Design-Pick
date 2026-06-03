/**
 * Unit test: Verify the full analysis pipeline works with sample data.
 * This doesn't need Chrome — just tests the analyzer + generator pipeline.
 */
import { analyzePage, fullAnalysis } from '../analyzer/index.ts';
import { generateDesignMD } from '../generator/template.ts';
import { renderPreviewHTML } from '../renderer/html-renderer.ts';
import type { ExtractedPageData } from '../types/extracted.ts';
import type { DesignMDDocument } from '../types/design-md.ts';

// Sample page data — mimics what content/extract.ts would produce
const samplePageData: ExtractedPageData = {
  url: 'https://example.com',
  title: 'Example Site',
  meta: { description: 'Test site' },
  body: {
    tagName: 'BODY',
    classes: [],
    computedStyles: {
      color: 'rgb(28, 28, 30)',
      backgroundColor: 'rgb(255, 255, 255)',
      borderColor: 'rgb(229, 229, 234)',
      borderTopColor: 'rgb(229, 229, 234)',
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '24px',
      letterSpacing: '0em',
      textAlign: 'left',
      textTransform: 'none',
      textDecoration: 'none',
      paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
      marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px',
      borderWidth: '0px', borderRadius: '0px', borderStyle: 'none',
      boxShadow: 'none', display: 'block', position: 'static',
      gap: '0px', overflow: 'visible', opacity: '1', cursor: 'auto',
      transitionDuration: '0s', transitionTimingFunction: 'ease',
      transitionProperty: 'none', outlineStyle: 'none', outlineWidth: '0px',
      outlineColor: 'rgb(0, 0, 0)', outlineOffset: '0px',
    },
    boundingBox: { x: 0, y: 0, width: 1280, height: 800 },
    children: [
      // Nav
      {
        tagName: 'NAV',
        classes: ['main-nav'],
        attributes: { role: 'navigation' },
        computedStyles: {
          color: 'rgb(28, 28, 30)', backgroundColor: 'rgb(255, 255, 255)',
          borderColor: 'rgb(229, 229, 234)', borderTopColor: 'rgb(229, 229, 234)',
          fontFamily: '"Inter", sans-serif', fontSize: '14px', fontWeight: '600',
          lineHeight: '20px', letterSpacing: '0.01em',
          textAlign: 'left', textTransform: 'none', textDecoration: 'none',
          paddingTop: '16px', paddingRight: '24px', paddingBottom: '16px', paddingLeft: '24px',
          marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px',
          borderWidth: '0px', borderRadius: '0px', borderStyle: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', position: 'sticky',
          gap: '16px', overflow: 'visible', opacity: '1', cursor: 'auto',
          transitionDuration: '0s', transitionTimingFunction: 'ease',
          transitionProperty: 'none', outlineStyle: 'none', outlineWidth: '0px',
          outlineColor: 'rgb(0,0,0)', outlineOffset: '0px',
        },
        boundingBox: { x: 0, y: 0, width: 1280, height: 56 },
        children: [],
      },
      // Primary button
      {
        tagName: 'BUTTON',
        classes: ['btn-primary'],
        text: 'Get Started',
        computedStyles: {
          color: 'rgb(255, 255, 255)', backgroundColor: 'rgb(91, 118, 254)',
          borderColor: 'rgba(0, 0, 0, 0)', borderTopColor: 'rgba(0, 0, 0, 0)',
          fontFamily: '"Inter", sans-serif', fontSize: '16px', fontWeight: '600',
          lineHeight: '24px', letterSpacing: '0em',
          textAlign: 'center', textTransform: 'none', textDecoration: 'none',
          paddingTop: '10px', paddingRight: '20px', paddingBottom: '10px', paddingLeft: '20px',
          marginTop: '8px', marginRight: '0px', marginBottom: '8px', marginLeft: '0px',
          borderWidth: '0px', borderRadius: '8px', borderStyle: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'inline-flex', position: 'relative',
          gap: '8px', overflow: 'visible', opacity: '1', cursor: 'pointer',
          transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          transitionProperty: 'background-color, box-shadow', outlineStyle: 'none',
          outlineWidth: '0px', outlineColor: 'rgb(0,0,0)', outlineOffset: '0px',
        },
        boundingBox: { x: 100, y: 200, width: 160, height: 44 },
        children: [],
      },
      // Card
      {
        tagName: 'DIV',
        classes: ['card'],
        computedStyles: {
          color: 'rgb(28, 28, 30)', backgroundColor: 'rgb(255, 255, 255)',
          borderColor: 'rgb(229, 229, 234)', borderTopColor: 'rgb(229, 229, 234)',
          fontFamily: '"Inter", sans-serif', fontSize: '16px', fontWeight: '400',
          lineHeight: '24px', letterSpacing: '0em',
          textAlign: 'left', textTransform: 'none', textDecoration: 'none',
          paddingTop: '24px', paddingRight: '24px', paddingBottom: '24px', paddingLeft: '24px',
          marginTop: '16px', marginRight: '0px', marginBottom: '16px', marginLeft: '0px',
          borderWidth: '1px', borderRadius: '12px', borderStyle: 'solid',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'block', position: 'relative',
          gap: '0px', overflow: 'visible', opacity: '1', cursor: 'auto',
          transitionDuration: '0s', transitionTimingFunction: 'ease',
          transitionProperty: 'none', outlineStyle: 'none', outlineWidth: '0px',
          outlineColor: 'rgb(0,0,0)', outlineOffset: '0px',
        },
        boundingBox: { x: 100, y: 300, width: 400, height: 200 },
        children: [],
      },
    ],
  },
  cssVariables: {
    '--color-primary': '#5b76fe',
    '--color-bg': '#ffffff',
    '--spacing-md': '16px',
  },
  mediaQueries: ['(min-width: 768px)', '(min-width: 1024px)'],
  fontFaces: [{
    fontFamily: 'Inter',
    src: 'url(https://fonts.googleapis.com/inter.woff2)',
    fontWeight: '400 600 700',
    fontStyle: 'normal',
  }],
};

async function test() {
  console.log('=== Pipeline Integration Test ===\n');

  // Step 1: Analyze
  console.log('[1] Running full analysis...');
  const { analysis, tokenMap, mapping, constraints } = fullAnalysis(samplePageData);

  // Verify analysis results
  console.log('  Colors: primary=' + analysis.colors.primary.hex + ', accent=' + analysis.colors.accent.hex);
  console.log('  Typography: ' + analysis.typography.fontFamilies.length + ' font families, ' + analysis.typography.hierarchy.length + ' hierarchy levels');
  console.log('  Spacing: baseUnit=' + analysis.spacing.baseUnit + 'px, ' + analysis.spacing.scale.length + ' scale entries');
  console.log('  Components: ' + analysis.components.buttons.length + ' buttons, ' + analysis.components.cards.length + ' cards');
  console.log('  Shadows: ' + analysis.shadows.levels.length + ' levels');

  // Step 2: Check mapping
  console.log('\n[2] Token Mapping:');
  console.log('  tokenToUsage entries: ' + mapping.tokenToUsage.size);
  console.log('  usageToToken entries: ' + mapping.usageToToken.size);
  // Show some sample mappings
  let count = 0;
  for (const [token, usages] of mapping.tokenToUsage) {
    if (count++ >= 5) break;
    console.log('  ' + token + ' → ' + usages.map(u => u.scenario).join(', '));
  }

  // Step 3: Check constraints
  console.log('\n[3] Extracted Constraints:');
  console.log('  Do\'s: ' + constraints.dos.length);
  for (const c of constraints.dos) {
    console.log('    [' + c.confidence.toFixed(2) + '] ' + c.rule);
  }
  console.log('  Don\'ts: ' + constraints.donts.length);
  for (const c of constraints.donts) {
    console.log('    [' + c.confidence.toFixed(2) + '] ' + c.rule);
  }

  // Step 4: Generate DESIGN.md
  console.log('\n[4] Generating DESIGN.md...');
  const doc = generateDesignMD(analysis, tokenMap, mapping, constraints, 'https://example.com');

  const sectionCount = Object.values(doc.sections).filter(s => s.length > 0).length;
  console.log('  Sections with content: ' + sectionCount + '/15');
  console.log('  Total markdown length: ' + doc.rawMarkdown.length + ' chars');

  // Verify each section exists
  const requiredSections = [
    '## 1. Mission', '## 2. Brand Context', '## 3. Visual Theme',
    '## 4. Color Palette', '## 5. Typography', '## 6. Component',
    '## 7. Layout', '## 8. Depth', '## 9. Accessibility',
    '## 10. Motion', '## 11. Do', '## 12. Responsive',
    '## 13. Anti', '## 14. QA', '## 15. Agent',
  ];
  let missingSections = 0;
  for (const s of requiredSections) {
    if (!doc.rawMarkdown.includes(s)) {
      console.log('  MISSING: ' + s);
      missingSections++;
    }
  }
  if (missingSections === 0) {
    console.log('  ✅ All 15 sections present');
  } else {
    console.log('  ❌ ' + missingSections + ' sections missing');
  }

  // Step 5: Generate preview HTML
  console.log('\n[5] Generating preview HTML...');
  const previewHtml = renderPreviewHTML(doc, tokenMap);
  console.log('  HTML length: ' + previewHtml.length + ' chars');
  console.log('  Has <html>: ' + previewHtml.includes('<html'));
  console.log('  Has nav: ' + previewHtml.includes('<nav'));

  // Step 6: Validate
  console.log('\n[6] Validating DESIGN.md...');
  const { validateDesignMD } = await import('../types/design-md.ts');
  const validation = validateDesignMD(doc.rawMarkdown);
  console.log('  Valid: ' + validation.valid);
  if (validation.issues.length > 0) {
    console.log('  Issues: ' + validation.issues.join('; '));
  }
  if (validation.warnings.length > 0) {
    console.log('  Warnings: ' + validation.warnings.join('; '));
  }

  // Summary
  console.log('\n=== Test Result ===');
  const passed = missingSections === 0 && sectionCount >= 12;
  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  process.exit(passed ? 0 : 1);
}

test().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});