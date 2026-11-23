import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { legacyPage, pageHref, pagePath, pageUrl, renderPageTemplate, resolveSite, sitemap } from '../scripts/site-config.mjs';
import { verifyBuild } from '../scripts/verify-build.mjs';
import { PAGE_DEFINITIONS } from '../src/lib/routes.js';

const template = '<!doctype html><html><head><title>Old title</title><meta name="description" content="Old description"><meta property="og:title" content="Old title"><meta property="og:description" content="Old description"><!--site-meta--><link rel="stylesheet" href="/assets/site.css"></head><body><div id="root" data-prerendered="false" data-build-year="" data-page="" data-site-base=""><!--app-html--></div><script src="/assets/site.js"></script></body></html>';

test('organization site defaults to root and normalizes trailing slash', () => {
  assert.deepEqual(resolveSite({}), { url: 'https://openomics.github.io/', base: '/' });
  assert.deepEqual(resolveSite({ SITE_URL: 'https://example.org/demo' }), { url: 'https://example.org/demo/', base: '/demo/' });
});
test('project deployments keep redirect paths and canonical URL consistent', () => {
  const site = resolveSite({ SITE_URL: 'https://example.org/demo/', SITE_BASE: '/demo/' });
  const projects = legacyPage(site, 'pipelines/', 'The pipelines');
  assert.match(projects, /content="0;url=\/demo\/pipelines\/"/);
  assert.match(projects, /rel="canonical" href="https:\/\/example.org\/demo\/pipelines\/"/);
  assert.match(projects, /<a href="\/demo\/pipelines\/">/);
  const about = legacyPage(site, '#approach', 'Our approach');
  assert.match(about, /content="0;url=\/demo\/#approach"/);
  assert.match(about, /rel="canonical" href="https:\/\/example.org\/demo\/"/);
});
test('invalid or inconsistent deployment URLs fail before building', () => {
  for (const env of [
    { SITE_URL: 'javascript:alert(1)' },
    { SITE_URL: 'https://user:password@example.org/' },
    { SITE_URL: 'https://example.org/?test=true' },
    { SITE_URL: 'https://example.org/', SITE_BASE: '/demo/' },
    { SITE_BASE: '//other-host/' },
  ]) assert.throws(() => resolveSite(env));
});

test('route paths cannot escape the deployment base', () => {
  const site = resolveSite({ SITE_URL: 'https://example.org/demo/' });
  assert.equal(pageHref(site, PAGE_DEFINITIONS[0]), '/demo/');
  assert.equal(pageUrl(site, PAGE_DEFINITIONS[1]), 'https://example.org/demo/pipelines/');
  for (const route of ['../', '/pipelines/', '//example.org/', 'pipelines', 'pipelines/?q=1']) {
    assert.throws(() => pagePath({ path: route }));
    assert.throws(() => legacyPage(site, route, 'Moved'));
  }
});

test('each route gets its metadata, canonical, identity, year, and supplied server markup', () => {
  const site = resolveSite({ SITE_URL: 'https://example.org/demo/' });
  for (const page of PAGE_DEFINITIONS) {
    const markup = `<main><h1>${page.id}</h1><p>© 2031</p></main>`;
    const html = renderPageTemplate({ template, markup, site, page, year: 2031 });
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<meta property="og:title" content="${page.title}">`));
    assert.ok(html.includes(`<meta property="og:description" content="${page.description}">`));
    assert.ok(html.includes(`rel="canonical" href="${site.url}${page.path}"`));
    assert.ok(html.includes(`property="og:url" content="${site.url}${page.path}"`));
    assert.ok(html.includes(`data-page="${page.id}"`));
    assert.ok(html.includes('data-site-base="/demo/"'));
    assert.ok(html.includes('data-build-year="2031"'));
    assert.ok(html.includes('data-prerendered="true"'));
    assert.ok(html.includes(markup));
    assert.ok(!html.includes('<!--app-html-->') && !html.includes('<!--site-meta-->'));
  }
});

test('template replacements escape metadata without changing application markup', () => {
  const page = { id: 'home', path: '', title: 'DNA & "RNA" <workflows>', description: "Researcher's tools & data" };
  const markup = '<main><p>Literal $& text; data-page=""</p></main>';
  const html = renderPageTemplate({ template, markup, site: resolveSite({}), page, year: 2031 });
  assert.ok(html.includes('<title>DNA &amp; &quot;RNA&quot; &lt;workflows&gt;</title>'));
  assert.ok(html.includes('content="Researcher&#39;s tools &amp; data"'));
  assert.ok(html.includes(markup));
});

test('missing or duplicated template contracts fail before emitting partial pages', () => {
  const input = { template, markup: '<main>Content</main>', site: resolveSite({}), page: PAGE_DEFINITIONS[0], year: 2031 };
  for (const marker of ['<!--app-html-->', '<!--site-meta-->', 'data-page=""', 'data-site-base=""', 'data-build-year=""']) {
    assert.throws(() => renderPageTemplate({ ...input, template: template.replace(marker, '') }));
    assert.throws(() => renderPageTemplate({ ...input, template: template + marker }));
  }
  assert.throws(() => renderPageTemplate({ ...input, year: NaN }));
  assert.throws(() => renderPageTemplate({ ...input, markup: '' }));
});

test('sitemap includes both canonical routes and rejects duplicates', () => {
  const site = resolveSite({ SITE_URL: 'https://example.org/demo/' });
  const xml = sitemap(site, PAGE_DEFINITIONS);
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]), [
    'https://example.org/demo/', 'https://example.org/demo/pipelines/',
  ]);
  assert.throws(() => sitemap(site, [PAGE_DEFINITIONS[0], PAGE_DEFINITIONS[0]]));
});

for (const base of ['/', '/demo/']) {
  test(`static output verification checks both pages and all catalog anchors at ${base}`, async (t) => {
    const distDirectory = await mkdtemp(path.join(process.cwd(), '.site-test-'));
    t.after(() => rm(distDirectory, { recursive: true, force: true }));
    const site = resolveSite({ SITE_URL: `https://openomics.github.io${base}` });
    const catalogFile = new URL('../src/data/pipelines.json', import.meta.url);
    const { pipelines } = JSON.parse(await readFile(catalogFile, 'utf8'));
    const pageTemplate = template.replaceAll('"/assets/', `"${base}assets/`);
    const homeMarkup = `<main id="main"><h1>Open workflows.</h1><section id="approach"></section><section id="pipelines"><a href="${base}pipelines/">Explore</a></section></main>`;
    const documentationUrl = pipelines.find(({ name }) => name === 'RNA-seek').details.documentationUrl;
    assert.equal(new URL(documentationUrl).origin, new URL(site.url).origin, 'The fixture exercises separately hosted documentation on the same origin');
    const pipelineMarkup = `<main id="main"><h1>The pipelines</h1><a href="${base}#approach">Our approach</a><div id="repoList">${pipelines.map((pipeline) => `<a href="${pipeline.url}">${pipeline.name}</a>`).join('')}</div><a href="${documentationUrl}" target="_blank" rel="noopener noreferrer">Project documentation</a></main>`;
    const htmlById = new Map();
    for (const page of PAGE_DEFINITIONS) {
      const html = renderPageTemplate({ template: pageTemplate, markup: page.id === 'home' ? homeMarkup : pipelineMarkup, site, page, year: 2031 });
      htmlById.set(page.id, html);
      await mkdir(path.join(distDirectory, page.path), { recursive: true });
      await writeFile(path.join(distDirectory, page.path, 'index.html'), html);
    }
    for (const [filename, suffix] of [['projects/index.html', 'pipelines/'], ['projects.html', 'pipelines/'], ['about/index.html', '#approach'], ['about.html', '#approach'], ['pipelines.html', 'pipelines/']]) {
      await mkdir(path.dirname(path.join(distDirectory, filename)), { recursive: true });
      await writeFile(path.join(distDirectory, filename), legacyPage(site, suffix, 'Moved'));
    }
    await mkdir(path.join(distDirectory, 'assets'));
    await Promise.all([
      writeFile(path.join(distDirectory, 'assets/site.js'), ''),
      writeFile(path.join(distDirectory, 'assets/site.css'), ''),
      writeFile(path.join(distDirectory, '.nojekyll'), ''),
      writeFile(path.join(distDirectory, 'sitemap.xml'), sitemap(site, PAGE_DEFINITIONS)),
      writeFile(path.join(distDirectory, 'robots.txt'), `User-agent: *\nSitemap: ${site.url}sitemap.xml\n`),
    ]);
    const options = { distDirectory, catalogFile, quiet: true };
    await verifyBuild(site, options);
    const catalogPath = path.join(distDirectory, 'pipelines/index.html');
    await writeFile(catalogPath, htmlById.get('pipelines').replace(documentationUrl, `${documentationUrl}missing/`));
    await assert.rejects(verifyBuild(site, options), /unknown internal page/, 'Unlisted same-origin links still fail verification');
    await writeFile(catalogPath, htmlById.get('pipelines').replace(`${base}#approach`, `${base}missing/`));
    await assert.rejects(verifyBuild(site, options), /unknown internal page/, 'Invalid site routes still fail verification');
    await writeFile(catalogPath, htmlById.get('pipelines').replace(`href="${pipelines[0].url}"`, 'data-url="missing"'));
    await assert.rejects(verifyBuild(site, options), /Missing static repository anchor/);
    await writeFile(catalogPath, htmlById.get('pipelines').replace(`${base}#approach`, `${base}#missing`));
    await assert.rejects(verifyBuild(site, options), /missing anchor/);
  });
}
