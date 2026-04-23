import type { ExtractedPageData } from '../types/extracted.js';
import type { AnalyzedResponsive, BreakpointEntry } from '../types/analyzed.js';

function extractBreakpoints(mediaQueries: string[]): BreakpointEntry[] {
  const breakpointValues = new Set<number>();

  for (const mq of mediaQueries) {
    const matches = mq.match(/min-width:\s*(\d+)px/g);
    if (matches) {
      for (const m of matches) {
        const val = parseInt(m.match(/(\d+)/)?.[1] ?? '0');
        if (val > 0) breakpointValues.add(val);
      }
    }
  }

  const sorted = Array.from(breakpointValues).sort((a, b) => a - b);

  if (sorted.length === 0) {
    // Default breakpoints
    return [
      { name: 'sm', minWidth: 640, maxWidth: 767, description: 'Small tablets and large phones' },
      { name: 'md', minWidth: 768, maxWidth: 1023, description: 'Tablets' },
      { name: 'lg', minWidth: 1024, maxWidth: 1279, description: 'Small desktops' },
      { name: 'xl', minWidth: 1280, description: 'Large desktops' },
    ];
  }

  const nameMap: Record<number, string> = {
    320: 'xs', 375: 'xs', 425: 'sm', 480: 'sm',
    640: 'sm', 768: 'md', 1024: 'lg', 1280: 'xl', 1440: '2xl', 1536: '2xl',
  };

  return sorted.map((bp, i) => ({
    name: nameMap[bp] ?? (bp < 640 ? 'xs' : bp < 1024 ? 'md' : 'lg'),
    minWidth: bp,
    maxWidth: i < sorted.length - 1 ? sorted[i + 1] - 1 : undefined,
    description: bp < 640 ? 'Mobile' : bp < 768 ? 'Large phones / small tablets' : bp < 1024 ? 'Tablets' : bp < 1280 ? 'Desktops' : 'Large desktops',
  }));
}

export function analyzeResponsive(pageData: ExtractedPageData): AnalyzedResponsive {
  const breakpoints = extractBreakpoints(pageData.mediaQueries);

  return {
    breakpoints,
    touchTargets: {
      minSize: 44,
      recommendedSize: 48,
      minSpacing: 8,
    },
    collapsingStrategy: breakpoints.length > 2
      ? 'Multi-column layouts collapse to single column on mobile. Navigation collapses to hamburger menu. Hero text scales down proportionally.'
      : 'Responsive with basic mobile adaptation. Primary layout shifts at the detected breakpoint(s).',
  };
}
