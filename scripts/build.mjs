import { build } from 'vite';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { legacyPage, pagePath, renderPageTemplate, resolveSite, sitemap } from './site-config.mjs';
import { verifyBuild } from './verify-build.mjs';
import { PAGE_DEFINITIONS } from '../src/lib/routes.js';

const site = resolveSite();
const year = new Date().getUTCFullYear();

try {
  await build();
  // This renderer is used only during the build. Hosting needs only dist/.
  await build({
    build: {
      ssr: 'src/entry-server.jsx',
      outDir: '.ssg',
      emptyOutDir: true,
      copyPublicDir: false,
      rollupOptions: { output: { entryFileNames: 'entry-server.mjs' } },
    },
  });
  const { render, renderNotFound } = await import(pathToFileURL(path.resolve('.ssg/entry-server.mjs')).href);
  const template = await readFile('dist/index.html', 'utf8');
  for (const page of PAGE_DEFINITIONS) {
    const markup = render({ year, page: page.id, base: site.base });
    const html = renderPageTemplate({ template, markup, site, page, year });
    const directory = path.join('dist', pagePath(page));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), html);
  }
  for (const [route, suffix, title] of [
    ['projects', 'pipelines/', 'The pipelines'],
    ['about', '#approach', 'Our approach'],
  ]) {
    await mkdir(`dist/${route}`, { recursive: true });
    await writeFile(`dist/${route}/index.html`, legacyPage(site, suffix, title));
    await writeFile(`dist/${route}.html`, legacyPage(site, suffix, title));
  }
  await writeFile('dist/pipelines.html', legacyPage(site, 'pipelines/', 'The pipelines'));
  await writeFile('dist/.nojekyll', '');
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}sitemap.xml\n`);
  await writeFile('dist/sitemap.xml', sitemap(site, PAGE_DEFINITIONS));
  const stylesheets = [...template.matchAll(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"[^>]*>/g)]
    .map((match) => match[1]);
  if (!stylesheets.length) throw new Error('The 404 page requires the built site stylesheet.');
  await writeFile('dist/404.html', renderNotFound({ year, base: site.base, stylesheets }));
  await verifyBuild(site);
} finally {
  await rm('.ssg', { recursive: true, force: true });
}
