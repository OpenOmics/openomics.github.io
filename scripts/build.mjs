import { build } from 'vite';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { escapeHtml, legacyPage, pagePath, renderPageTemplate, resolveSite, sitemap } from './site-config.mjs';
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
  const { render } = await import(pathToFileURL(path.resolve('.ssg/entry-server.mjs')).href);
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
  await writeFile('dist/404.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — OpenOmics</title></head><body style="margin:10vh auto;padding:24px;max-width:640px;background:#141514;color:#efeee7;font:18px/1.7 system-ui"><p>OpenOmics / 404</p><h1>This path hasn't been mapped.</h1><p>Explore our open workflows for genomics and multi-omics research.</p><a style="color:#d5ed9b" href="${escapeHtml(site.base)}">Return to OpenOmics →</a></body></html>`);
  await verifyBuild(site);
} finally {
  await rm('.ssg', { recursive: true, force: true });
}
