/**
 * Lightweight Markdown → HTML renderer
 * Adapted from DesignPick extension renderer (html-renderer.ts markdownToHTML)
 */
function markdownToHTML(md) {
  if (!md) return '';
  let html = md;
  // Remove section number prefixes like "## 1. Mission"
  html = html.replace(/^## \d+\. .+\n?/, '');
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Tables
  html = html.replace(/^\|.+\|$/gm, (line) => {
    const cells = line.split('|').filter(c => c.trim());
    if (cells.every(c => /^[\s-:]+$/.test(c))) return '';
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  html = html.replace(/((?:<tr>.*<\/tr>\s*)+)/g, (match) => {
    const rows = match.match(/<tr>.*?<\/tr>/g) || [];
    if (rows.length <= 1) return '<table>' + rows.join('') + '</table>';
    return '<table><thead>' + rows[0] + '</thead><tbody>' + rows.slice(1).join('') + '</tbody></table>';
  });
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  // Bold, code, links
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" /> $1</li>');
  // Tags
  html = html.replace(/🚫 MUST:?/g, '<span class="must-tag">🚫 MUST</span>');
  html = html.replace(/✅ SHOULD:?/g, '<span class="should-tag">✅ SHOULD</span>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = '<p>' + html + '</p>';
  // Clean up
  html = html.replace(/<p>\s*<(h[234]|ul|ol|table|pre|blockquote|hr)/g, '<$1');
  html = html.replace(/<\/(h[234]|ul|ol|table|pre|blockquote)>\s*<\/p>/g, '</$1>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<table>(.*?)<\/table>/gs, (m) => m.replace(/<\/p><p>/g, ''));
  html = html.replace(/<p>\s*<li>/g, '<ul><li>');
  html = html.replace(/<\/li>\s*<\/p>/g, '</li></ul>');
  return html;
}
