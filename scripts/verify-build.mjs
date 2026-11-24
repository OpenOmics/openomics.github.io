import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PAGE_DEFINITIONS } from '../src/lib/routes.js';
import { pageHref, pagePath, pageUrl, escapeHtml, sitemap } from './site-config.mjs';

function decodeHtml(value) {
  return value.replace(/&(?:amp|quot|lt|gt|#39);/g, (entity) => ({
    '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'",
  })[entity]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function metaContent(html, attributeName, value) {
  const matches = [...html.matchAll(/<meta\b[^>]*>/g)]
    .filter(([tag]) => attribute(tag, attributeName) === value);
  assert.equal(matches.length, 1, `Expected one ${value} metadata tag`);
  return decodeHtml(attribute(matches[0][0], 'content') || '');
}

function canonicalUrl(html) {
  const matches = [...html.matchAll(/<link\b[^>]*>/g)]
    .filter(([tag]) => attribute(tag, 'rel') === 'canonical');
  assert.equal(matches.length, 1, 'Expected one canonical URL');
  return decodeHtml(attribute(matches[0][0], 'href') || '');
}

export async function verifyBuild(site, {
  distDirectory = 'dist',
  catalogFile = 'src/data/pipelines.json',
  pages = PAGE_DEFINITIONS,
  quiet = false,
} = {}) {
  const rendered = await Promise.all(pages.map(async (page) => {
    const html = await readFile(path.join(distDirectory, pagePath(page), 'index.html'), 'utf8');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page.id}: HTML IDs must be unique`);
    assert.match(html, /data-prerendered="true"/, `${page.id}: missing prerender flag`);
    assert.match(html, /data-build-year="\d{4}"/, `${page.id}: missing build year`);
    assert.ok(html.includes(`data-page="${page.id}"`), `${page.id}: wrong page identity`);
    assert.ok(html.includes(`data-site-base="${escapeHtml(site.base)}"`), `${page.id}: wrong site base`);
    assert.ok(!/<!--(?:app-html|site-meta)-->|data-(?:page|site-base|build-year)=""/.test(html), `${page.id}: unresolved template marker`);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${page.id}: expected one main heading`);
    assert.equal([...html.matchAll(/<title\b/g)].length, 1, `${page.id}: expected one title`);
    assert.ok(html.includes(`<title>${escapeHtml(page.title)}</title>`), `${page.id}: incorrect title`);
    assert.equal(metaContent(html, 'name', 'description'), page.description, `${page.id}: incorrect description`);
    assert.equal(metaContent(html, 'property', 'og:title'), page.title, `${page.id}: incorrect Open Graph title`);
    assert.equal(metaContent(html, 'property', 'og:description'), page.description, `${page.id}: incorrect Open Graph description`);
    assert.equal(metaContent(html, 'property', 'og:url'), pageUrl(site, page), `${page.id}: incorrect Open Graph URL`);
    assert.equal(canonicalUrl(html), pageUrl(site, page), `${page.id}: incorrect canonical URL`);

    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg|png|ico)(?:\?[^"#]*)?)"/g)]
      .map((match) => decodeHtml(match[1]));
    assert.ok(assets.some((asset) => /\.js(?:\?|$)/.test(asset)), `${page.id}: client bundle missing`);
    assert.ok(assets.some((asset) => /\.css(?:\?|$)/.test(asset)), `${page.id}: styles missing`);
    for (const asset of new Set(assets)) {
      assert.ok(asset.startsWith(site.base), `${page.id}: incorrect asset base: ${asset}`);
      const relative = asset.slice(site.base.length).split('?')[0];
      assert.ok(!relative.split('/').includes('..'), `${page.id}: asset escapes output directory`);
      await access(path.join(distDirectory, relative));
    }
    return { page, html, ids };
  }));

  const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  const pipelines = Array.isArray(catalog) ? catalog : catalog.pipelines;
  // Repository documentation can share the organization site's origin while
  // belonging to a separate GitHub Pages project. Only known catalog links get
  // this exemption; generated page routes and their anchors are still checked.
  const documentationUrls = new Set(pipelines.flatMap(({ details }) => [
    details?.documentationUrl, details?.sourceUrl,
    ...(details?.sources ?? []).map(({ url }) => url),
  ]).filter(Boolean).map((url) => new URL(url).href));
  const pagesByPath = new Map(rendered.flatMap((entry) => [
    [pageHref(site, entry.page), entry],
    [`${pageHref(site, entry.page)}index.html`, entry],
  ]));
  for (const { page, html } of rendered) {
    for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
      const href = attribute(tag, 'href');
      if (!href) continue;
      const url = new URL(decodeHtml(href), pageUrl(site, page));
      if (url.origin !== new URL(site.url).origin) continue;
      const destination = pagesByPath.get(url.pathname);
      if (!destination && documentationUrls.has(url.href)) continue;
      assert.ok(destination, `${page.id}: unknown internal page ${href}`);
      if (url.hash) assert.ok(destination.ids.includes(decodeURIComponent(url.hash.slice(1))), `${page.id}: missing anchor ${href}`);
    }
  }

  const home = rendered.find(({ page }) => page.id === 'home');
  const catalogPage = rendered.find(({ page }) => page.id === 'pipelines');
  assert.ok(home && catalogPage, 'Both home and pipelines pages must be built');
  assert.ok(home.ids.includes('pipelines'), 'Home needs a pipeline introduction section');
  assert.ok(!home.ids.includes('repoList') && !home.ids.includes('search'), 'The full explorer belongs on /pipelines/');
  assert.ok(home.html.includes(`href="${pageHref(site, catalogPage.page)}"`), 'Home must link to the pipelines page');
  assert.ok(catalogPage.ids.includes('repoList'), 'The pipelines page needs the static catalog');
  const repoLinks = new Set([...catalogPage.html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => decodeHtml(attribute(tag, 'href') || '')));
  for (const pipeline of pipelines) {
    const name = pipeline.name || pipeline.n;
    const url = pipeline.url || `https://github.com/OpenOmics/${encodeURIComponent(name)}`;
    assert.ok(repoLinks.has(url), `Missing static repository anchor: ${name}`);
  }

  for (const [filename, suffix] of [
    ['projects/index.html', 'pipelines/'], ['projects.html', 'pipelines/'],
    ['about/index.html', '#approach'], ['about.html', '#approach'],
    ['pipelines.html', 'pipelines/'],
  ]) {
    const alias = await readFile(path.join(distDirectory, filename), 'utf8');
    const target = `${site.base}${suffix}`;
    assert.equal(metaContent(alias, 'http-equiv', 'refresh'), `0;url=${target}`, `${filename}: incorrect redirect`);
    assert.equal(canonicalUrl(alias), suffix.startsWith('#') ? site.url : `${site.url}${suffix}`, `${filename}: incorrect canonical`);
    assert.ok(alias.includes(`<a href="${escapeHtml(target)}">`), `${filename}: fallback link missing`);
    const destinationUrl = new URL(target, site.url);
    const destination = pagesByPath.get(destinationUrl.pathname);
    assert.ok(destination, `${filename}: missing redirect destination`);
    if (destinationUrl.hash) assert.ok(destination.ids.includes(destinationUrl.hash.slice(1)), `${filename}: missing redirect anchor`);
  }
  assert.equal(await readFile(path.join(distDirectory, 'sitemap.xml'), 'utf8'), sitemap(site, pages), 'Sitemap must contain the two canonical pages');
  assert.ok((await readFile(path.join(distDirectory, 'robots.txt'), 'utf8')).includes(`Sitemap: ${site.url}sitemap.xml`), 'robots.txt must point to the sitemap');
  await access(path.join(distDirectory, '.nojekyll'));
  if (!quiet) console.log(`Static output verified: ${pages.length} pages, ${pipelines.length} repository anchors, metadata, cross-page links, assets, and legacy routes.`);
}
