/**
 * Entry: render a preview HTML using the test-pipeline's sample page so the
 * real DesignPick renderPreviewHTML output is visible.
 */
import { analyzePage, fullAnalysis } from '../analyzer/index.ts';
import { generateDesignMD } from '../generator/template.ts';
import { renderPreviewHTML } from '../renderer/html-renderer.ts';
import type { ExtractedPageData } from '../types/extracted.ts';

const samplePageData: ExtractedPageData = {
  url: 'https://www.minimaxi.com/',
  title: 'MiniMax',
  meta: {},
  body: {
    tagName: 'BODY', classes: [],
    computedStyles: {
      color: 'rgb(28, 28, 30)', backgroundColor: 'rgb(255, 255, 255)',
      borderColor: 'rgb(229, 229, 234)', borderTopColor: 'rgb(229, 229, 234)',
      fontFamily: '"Inter", sans-serif', fontSize: '16px', fontWeight: '400',
      lineHeight: '24px', letterSpacing: '0em', textAlign: 'left', textTransform: 'none',
      textDecoration: 'none', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px',
      paddingLeft: '0px', marginTop: '0px', marginRight: '0px', marginBottom: '0px',
      marginLeft: '0px', borderWidth: '0px', borderRadius: '0px', borderStyle: 'none',
      boxShadow: 'none', display: 'block', position: 'static', gap: '0px', overflow: 'visible',
      opacity: '1', cursor: 'auto', transitionDuration: '0s', transitionTimingFunction: 'ease',
      transitionProperty: 'none', outlineStyle: 'none', outlineWidth: '0px', outlineColor: 'rgb(0,0,0)',
      outlineOffset: '0px',
    },
    boundingBox: { x: 0, y: 0, width: 1200, height: 800 },
    children: [],
  },
  htmlComputedStyles: { backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(28, 28, 30)' },
  cssVariables: {}, mediaQueries: [], fontFaces: [],
};

export async function generate(): Promise<string> {
  const analysis = analyzePage(samplePageData);
  const { tokenMap, mapping, constraints } = fullAnalysis(samplePageData);
  const doc = generateDesignMD(analysis, tokenMap, mapping, constraints, 'https://www.minimaxi.com/');
  return renderPreviewHTML(doc, tokenMap, 'zh');
}
