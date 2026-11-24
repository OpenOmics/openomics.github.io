export function resolveSite(env = process.env) {
  const url = new URL(env.SITE_URL || 'https://openomics.github.io/');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('SITE_URL must be a public HTTP(S) URL.');
  }
  if (url.search || url.hash) throw new Error('SITE_URL cannot contain a query or fragment.');
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  const base = env.SITE_BASE || url.pathname;
  if (!/^\/(?:[a-zA-Z0-9._~-]+\/)*$/.test(base)) {
    throw new Error('SITE_BASE must be an absolute directory path such as / or /openomics/.');
  }
  if (url.pathname !== base) throw new Error('SITE_URL pathname and SITE_BASE must match.');
  return { url: url.href, base };
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function pagePath(page) {
  const route = page.path;
  if (typeof route !== 'string' || !/^(?:[a-zA-Z0-9_-]+\/)*$/.test(route)) {
    throw new Error('Page paths must be relative directories, such as pipelines/.');
  }
  return route;
}

export function pageUrl(site, page) {
  return `${site.url}${pagePath(page)}`;
}

export function pageHref(site, page) {
  return `${site.base}${pagePath(page)}`;
}

function replaceExactlyOnce(template, pattern, replacement, name) {
  const matches = [...template.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Expected one ${name}; found ${matches.length}.`);
  return template.replace(pattern, () => replacement);
}

// Kept independent of React/Vite so the page contract can be checked in Node.
export function renderPageTemplate({ template, markup, site, page, year }) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('The build year must be a four-digit integer.');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(page.id) || !page.title || !page.description) {
    throw new Error('Each page needs an id, title, and description.');
  }
  if (typeof markup !== 'string' || !markup.trim()) throw new Error('Page markup must not be empty.');
  const canonical = escapeHtml(pageUrl(site, page));
  const replacements = [
    [/<title\b[^>]*>[\s\S]*?<\/title>/g, `<title>${escapeHtml(page.title)}</title>`, 'title'],
    [/<meta\b(?=[^>]*\bname="description")[^>]*>/g, `<meta name="description" content="${escapeHtml(page.description)}">`, 'description'],
    [/<meta\b(?=[^>]*\bproperty="og:title")[^>]*>/g, `<meta property="og:title" content="${escapeHtml(page.title)}">`, 'Open Graph title'],
    [/<meta\b(?=[^>]*\bproperty="og:description")[^>]*>/g, `<meta property="og:description" content="${escapeHtml(page.description)}">`, 'Open Graph description'],
    [/<!--site-meta-->/g, `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}">`, 'site metadata placeholder'],
    [/data-prerendered="false"/g, 'data-prerendered="true"', 'prerender attribute'],
    [/data-build-year=""/g, `data-build-year="${year}"`, 'year attribute'],
    [/data-page=""/g, `data-page="${escapeHtml(page.id)}"`, 'page attribute'],
    [/data-site-base=""/g, `data-site-base="${escapeHtml(site.base)}"`, 'site base attribute'],
  ];
  let html = template;
  for (const [pattern, replacement, name] of replacements) {
    html = replaceExactlyOnce(html, pattern, replacement, name);
  }
  // Insert last so application text resembling a template marker is untouched.
  return replaceExactlyOnce(html, /<!--app-html-->/g, markup, 'app HTML placeholder');
}

export function sitemap(site, pages) {
  const urls = pages.map((page) => pageUrl(site, page));
  if (new Set(urls).size !== urls.length) throw new Error('Sitemap page paths must be unique.');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>\n`;
}

export function legacyPage(site, suffix, title) {
  const fragment = /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(suffix);
  if (!fragment) pagePath({ path: suffix });
  const target = `${site.base}${suffix}`;
  const canonical = fragment ? site.url : `${site.url}${suffix}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"><link rel="canonical" href="${escapeHtml(canonical)}"><title>${escapeHtml(title)} — OpenOmics</title></head><body><p>This OpenOmics page has moved.</p><a href="${escapeHtml(target)}">Continue to ${escapeHtml(title)}</a></body></html>`;
}
