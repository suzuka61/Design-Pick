let allTemplates = [];
let categories = [];
let activeCategory = 'all';
let currentDetailSlug = null;

const heroSection = document.getElementById('heroSection');
const categoryTabs = document.getElementById('categoryTabs');
const heroStats = document.getElementById('heroStats');
const gridView = document.getElementById('gridView');
const templateGrid = document.getElementById('templateGrid');
const detailView = document.getElementById('detailView');
const backLink = document.getElementById('backLink');

async function init() {
  try {
    const res = await fetch('data/templates.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allTemplates = data.templates;
    categories = data.categories;
  } catch (err) {
    console.error('Failed to load templates:', err);
    templateGrid.innerHTML = '<p style="padding:48px;text-align:center;color:var(--ink-muted)">加载失败: ' + err.message + '</p>';
    return;
  }

  renderStats(allTemplates.length, categories.length);
  renderCategoryTabs(categories);
  renderGrid(allTemplates);

  backLink.addEventListener('click', function(e) {
    e.preventDefault();
    hideDetail();
  });

  window.addEventListener('popstate', function() {
    if (currentDetailSlug) hideDetail(false);
  });
}

function renderStats(count, catCount) {
  var previewCount = allTemplates.filter(function(t) { return t.hasPreview; }).length;
  heroStats.innerHTML =
    '<div class="hero-stat"><span class="hero-stat-num">' + count + '</span><span class="hero-stat-label">设计模板</span></div>' +
    '<div class="hero-stat"><span class="hero-stat-num">' + previewCount + '</span><span class="hero-stat-label">带预览</span></div>' +
    '<div class="hero-stat"><span class="hero-stat-num">' + catCount + '</span><span class="hero-stat-label">行业分类</span></div>';
}

function renderCategoryTabs(cats) {
  var html = '<button class="category-tab active" data-category="all">全部</button>';
  for (var i = 0; i < cats.length; i++) {
    html += '<button class="category-tab" data-category="' + cats[i].id + '">' + cats[i].nameZh + '</button>';
  }
  categoryTabs.innerHTML = html;

  categoryTabs.addEventListener('click', function(e) {
    if (!e.target.classList.contains('category-tab')) return;
    var tabs = categoryTabs.querySelectorAll('.category-tab');
    for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
    e.target.classList.add('active');
    activeCategory = e.target.dataset.category;
    renderGrid(getFilteredTemplates());
  });
}

function getFilteredTemplates() {
  if (activeCategory === 'all') return allTemplates;
  return allTemplates.filter(function(t) { return t.category === activeCategory; });
}

function renderGrid(templates) {
  var html = '';
  for (var i = 0; i < templates.length; i++) {
    var t = templates[i];
    html += '<div class="template-card" data-slug="' + t.slug + '">';
    if (t.hasPreview) {
      html += '<div class="card-preview" data-preview-slug="' + t.slug + '"><div class="card-preview-placeholder" style="background:linear-gradient(135deg,' + t.primaryColor + '18,' + t.inkColor + '08)"></div></div>';
    } else {
      html += '<div class="card-monogram" style="background:linear-gradient(135deg,' + t.primaryColor + '10,' + t.inkColor + '05)">' + monogram(t.name) + '</div>';
    }
    html += '<div class="card-body">';
    html += '<div class="card-name">' + esc(t.name) + '</div>';
    html += '<span class="card-category">' + getCategoryName(t.category) + '</span>';
    html += '<p class="card-desc">' + esc(t.description) + '</p>';
    html += '<div class="card-meta">';
    html += '<span class="color-dot" style="background:' + t.primaryColor + '"></span>';
    html += '<span class="color-hex">' + t.primaryColor + '</span>';
    if (t.fontFamily) html += '<span class="font-label">' + esc(t.fontFamily) + '</span>';
    html += '</div></div></div>';
  }
  templateGrid.innerHTML = html;

  // Lazy load iframes
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          var el = entries[k].target;
          var slug = el.dataset.previewSlug;
          if (slug && !el.querySelector('iframe')) {
            el.innerHTML = '<iframe src="previews/' + slug + '" loading="lazy" tabindex="-1"></iframe>';
          }
          observer.unobserve(el);
        }
      }
    }, { rootMargin: '300px' });

    var previewEls = templateGrid.querySelectorAll('[data-preview-slug]');
    for (var m = 0; m < previewEls.length; m++) observer.observe(previewEls[m]);
  }

  // Click handlers
  var cards = templateGrid.querySelectorAll('.template-card');
  for (var n = 0; n < cards.length; n++) {
    cards[n].addEventListener('click', function() {
      showDetail(this.dataset.slug);
    });
  }
}

function monogram(name) {
  var words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

async function showDetail(slug) {
  currentDetailSlug = slug;
  history.pushState({ slug: slug }, '', '?slug=' + slug);

  var res = await fetch('data/' + slug + '.json');
  if (!res.ok) { currentDetailSlug = null; return; }
  var d = await res.json();

  var rawMd = '';
  try {
    var mdRes = await fetch('templates/' + slug + '.md');
    if (mdRes.ok) rawMd = await mdRes.text();
  } catch (e) {}

  document.title = d.name + ' — DesignPick';

  var previewEl = document.getElementById('detailPreview');
  if (d.hasPreview) {
    previewEl.innerHTML = '<iframe src="previews/' + slug + '" title="' + esc(d.name) + ' preview"></iframe>';
  } else {
    previewEl.innerHTML = '<div class="detail-preview-monogram">' + monogram(d.name) + '</div>';
  }

  document.getElementById('detailSlug').textContent = '/' + slug;
  document.getElementById('detailName').textContent = d.name;
  document.getElementById('detailCategory').textContent = getCategoryName(d.category);
  document.getElementById('detailDesc').textContent = d.description;
  document.getElementById('detailSource').href = d.sourceUrl;

  var content = document.getElementById('detailContent');
  var html = '';

  if (d.colors && Object.keys(d.colors).length) {
    html += '<div class="detail-section"><h2>色彩体系</h2><div class="color-grid">';
    var colorEntries = Object.entries(d.colors);
    for (var i = 0; i < colorEntries.length; i++) {
      var name = colorEntries[i][0], value = colorEntries[i][1];
      if (typeof value === 'string' && value.startsWith('#')) {
        html += '<div class="color-swatch"><div class="color-swatch-fill" style="background:' + value + '"></div><div class="color-swatch-info"><div class="color-swatch-name">' + esc(name) + '</div><div class="color-swatch-hex">' + value + '</div></div></div>';
      }
    }
    html += '</div></div>';
  }

  if (d.typography && Object.keys(d.typography).length) {
    html += '<div class="detail-section"><h2>排版规范</h2><table class="type-scale-table"><thead><tr><th>名称</th><th>字体</th><th>字号</th><th>字重</th></tr></thead><tbody>';
    var typoEntries = Object.entries(d.typography);
    for (var j = 0; j < typoEntries.length; j++) {
      var tName = typoEntries[j][0], props = typoEntries[j][1];
      if (props && props.fontFamily) {
        html += '<tr><td>' + esc(tName) + '</td><td>' + esc(props.fontFamily.split(',')[0].replace(/'/g, '')) + '</td><td>' + (props.fontSize || '') + '</td><td>' + (props.fontWeight || '') + '</td></tr>';
      }
    }
    html += '</tbody></table></div>';
  }

  if (d.components && Object.keys(d.components).length) {
    html += '<div class="detail-section"><h2>组件规范</h2><div class="component-grid">';
    var compEntries = Object.entries(d.components);
    for (var k = 0; k < compEntries.length; k++) {
      var cName = compEntries[k][0], cProps = compEntries[k][1];
      if (typeof cProps !== 'object') continue;
      html += '<div class="component-card"><div class="component-card-name">' + esc(cName) + '</div><div class="component-card-props">';
      var propEntries = Object.entries(cProps);
      for (var l = 0; l < propEntries.length; l++) {
        html += '<div><dt>' + esc(propEntries[l][0]) + ':</dt><dd>' + esc(String(propEntries[l][1])) + '</dd></div>';
      }
      html += '</div></div>';
    }
    html += '</div></div>';
  }

  if (rawMd) {
    var body = extractMarkdownBody(rawMd);
    if (body.trim()) {
      html += '<div class="detail-section"><h2>详细规范</h2><div class="md-body">' + markdownToHTML(body) + '</div></div>';
    }
  }

  content.innerHTML = html;

  document.getElementById('downloadMd').onclick = function() {
    var blob = new Blob([rawMd], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = slug + '-DESIGN.md'; a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById('copyMd').onclick = function() {
    navigator.clipboard.writeText(rawMd).then(function() {
      var btn = document.getElementById('copyMd');
      var orig = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    });
  };

  heroSection.style.display = 'none';
  categoryTabs.style.display = 'none';
  gridView.style.display = 'none';
  detailView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideDetail(updateHistory) {
  currentDetailSlug = null;
  if (updateHistory !== false) history.pushState({}, '', window.location.pathname);
  document.title = 'DesignPick — DESIGN.md 模板库';
  heroSection.style.display = '';
  categoryTabs.style.display = '';
  gridView.style.display = '';
  detailView.style.display = 'none';
}

function extractMarkdownBody(content) {
  var match = content.match(/^---\n[\s\S]*?\n---\n?/);
  if (match) return content.slice(match[0].length).trim();
  return content;
}

function getCategoryName(catId) {
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].id === catId) return categories[i].nameZh;
  }
  return catId;
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Check URL slug on load
(function() {
  var slug = new URLSearchParams(window.location.search).get('slug');
  init().then(function() {
    if (slug) showDetail(slug);
  }).catch(function(err) { console.error('Init failed:', err); });
})();
