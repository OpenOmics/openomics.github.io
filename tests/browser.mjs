import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Exercise the deployed files, including prerendered content and legacy routes.
// No development server, React test utilities, or live GitHub requests are used.
const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = join(projectDirectory, 'dist');
const expectedRepositories = [
  'genome-seek', 'methyl-seek', 'modr', 'metavirs', 'nanite', 'RNA-seek',
  'chrom-seek', 'metamorph', 'baseline', 'cfChIP-seek', 'assembly-seek',
  'parabricks-benchmark', 'cell-seek', 'mir-seek', 'mr-seek', 'cyte-seek',
  'istari', 'mpox-seek', 'pbAmp-seek', 'leafworker', 'space-seek', 'ervx',
  'scErvx', 'weave', 'fragmentomics', 'HiIP',
  'CellSight', 'PDtoMSstats', 'microbe-count', 'tcr-seek', 'snakevision',
];
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function startStaticServer() {
  for (const page of ['index.html', 'pipelines/index.html']) {
    await access(join(distDirectory, page)).catch(() => {
      throw new Error(`Missing dist/${page}. Run npm run build before browser tests.`);
    });
  }
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(distDirectory, `.${pathname}`);
      const fromDist = relative(distDirectory, file);
      if (fromDist.startsWith('..')) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      // Browsers can request an optional favicon even when none is declared.
      response.writeHead(request.url === '/favicon.ico' ? 204 : 404).end();
    }
  });
  await new Promise((resolveListening, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListening);
  });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

const sorted = (values) => [...values].sort();
const runtimeErrors = [];
let activePage;
let browser;
let server;

function captureErrors(page, label) {
  page.on('pageerror', (error) => runtimeErrors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`${label}: ${message.text()}`);
  });
}

async function newContext(options = {}) {
  return browser.newContext(options);
}

async function repositoryNames(page) {
  return page.locator('#repoList [data-repo]').evaluateAll((nodes) => (
    nodes.map((node) => node.dataset.repo)
  ));
}

async function waitForRepositoryCount(page, count) {
  await page.waitForFunction((expected) => (
    document.querySelectorAll('#repoList [data-repo]').length === expected
  ), count);
  assert.match(await page.locator('#resultCount').innerText(), new RegExp(`^${count} / ${expectedRepositories.length} projects$`));
}

async function expectRepositoryNames(page, expected) {
  await waitForRepositoryCount(page, expected.length);
  assert.deepEqual(sorted(await repositoryNames(page)), sorted(expected));
}

async function expectNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.content <= dimensions.viewport + 1,
    `${label}: document width ${dimensions.content}px exceeds viewport ${dimensions.viewport}px`,
  );
}

async function waitForPressed(page, id, pressed) {
  await page.waitForFunction(({ id, pressed }) => (
    document.getElementById(id)?.getAttribute('aria-pressed') === String(pressed)
  ), { id, pressed });
}

async function expectStaticCatalog(page, defaultPipeline) {
  const links = await page.locator('#repoList a[data-repo]').evaluateAll((nodes) => (
    nodes.map((node) => ({ name: node.dataset.repo, href: node.getAttribute('href') }))
  ));
  assert.equal(links.length, 31, 'Every workflow must be a real link in the prerendered pipeline page');
  assert.deepEqual(sorted(links.map(({ name }) => name)), sorted(expectedRepositories));
  for (const { name, href } of links) {
    assert.equal(href, `https://github.com/OpenOmics/${name}`, `Static repository link for ${name}`);
  }
  assert.equal(await page.locator('#search').isDisabled(), true, 'Search must not pretend to work without JavaScript');
  await expectRichDetails(page, defaultPipeline);
}

async function expectHomeLinks(page) {
  assert.match(await page.locator('#heroTitle').innerText(), /Start Decoding\s*Complex Biology/, 'The homepage preserves the current decoding headline');
  const artDescription = await page.locator('.art-caption .sr').textContent();
  assert.match(artDescription, /rings?/i, 'An accessible description identifies the sequence-ring artwork');
  assert.match(artDescription, /align/i, 'The accessible description explains the alignment');
  assert.equal(await page.locator('#repoList, #search').count(), 0, 'The explorer belongs on its dedicated page');
  assert.equal(await page.locator('.hero a.btn[href="/pipelines/"]').count(), 1, 'The hero CTA links to the pipeline page');
  assert.equal(await page.locator('#nav a[href="/pipelines/"]').count(), 1, 'Main navigation links to the pipeline page');
}

async function waitForMotionState(page, state) {
  await page.waitForFunction((expected) => (
    document.querySelector('[data-motion-state]')?.getAttribute('data-motion-state') === expected
  ), state, { timeout: 15000 });
}

async function canvasSnapshot(page) {
  return page.locator('#dna').evaluate((canvas) => canvas.toDataURL());
}

async function expectPaintedCanvas(page) {
  const painted = await page.locator('#dna').evaluate((canvas) => {
    if (!canvas.width || !canvas.height) return false;
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 20) return true;
    }
    return false;
  });
  assert.equal(painted, true, 'The canvas draws artwork rather than exposing an empty ready state');
}

async function expectStillCanvas(page, label) {
  // Allow layout/ResizeObserver callbacks to settle before measuring pixels.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
    await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
  });
  const before = await canvasSnapshot(page);
  await page.waitForTimeout(180);
  assert.equal(await canvasSnapshot(page), before, label);
}

const homeCopySelectors = [
  '.hero-copy p', '.intro-copy', '.principle p', '.steps p', '.faq p',
  '.closing-copy', '.hero .btn',
];
const catalogCopySelectors = [
  '#search', '.filter', '.repo-row', '#detail p',
  '.detail-actions .btn', '.detail-actions .text-link',
  '.pipeline-facts h4', '.pipeline-facts li',
  '.pipeline-guidance summary', '.pipeline-guidance li',
  '.pipeline-provenance', '.pipeline-provenance a', '.pipeline-provenance time',
];

async function expectRichDetails(page, pipeline) {
  const { details } = pipeline;
  assert.ok(details, `${pipeline.name} has reviewed detail content in the catalog`);
  assert.equal((await page.locator('.pipeline-overview').textContent()).trim(), details.overview);
  const groups = await page.locator('.pipeline-facts').evaluate((container) => (
    [...container.querySelectorAll('section')].map((section) => ({
      heading: section.querySelector('h4')?.textContent.trim(),
      items: [...section.querySelectorAll('li')].map((item) => item.textContent.trim()),
    }))
  ));
  assert.deepEqual(groups, [
    { heading: 'Input data', items: details.inputs },
    { heading: 'Main outputs', items: details.outputs },
  ], `${pipeline.name} displays its own input and output lists`);
  const guidance = page.locator('details.pipeline-guidance');
  assert.equal(await guidance.count(), 1, 'Run guidance uses a native details disclosure');
  assert.match((await guidance.locator('summary').textContent()).trim(), /^Before you run/);
  assert.deepEqual(
    (await guidance.locator(':scope > ul > li').allTextContents()).map((text) => text.trim()),
    details.notes,
    `${pipeline.name} displays its own preparation notes`,
  );
  const provenanceLinks = await page.locator('.pipeline-provenance a').evaluateAll((links) => (
    links.map((link) => link.getAttribute('href'))
  ));
  const documentationLinks = await guidance.locator('a').evaluateAll((links) => (
    links.map((link) => link.getAttribute('href'))
  ));
  assert.ok(documentationLinks.includes(details.documentationUrl), `${pipeline.name} links to its documentation`);
  assert.ok(provenanceLinks.includes(details.sourceUrl), `${pipeline.name} links to the reviewed source`);
  assert.equal(await page.locator('.pipeline-provenance time').getAttribute('datetime'), details.reviewedOn);
}

async function openRunGuidance(page) {
  const guidance = page.locator('details.pipeline-guidance');
  if (!(await guidance.evaluate((element) => element.open))) {
    await guidance.locator('summary').focus();
    await page.keyboard.press('Enter');
  }
  assert.equal(await guidance.evaluate((element) => element.open), true, 'Keyboard activation opens run guidance');
  assert.equal(await guidance.locator('li').first().isVisible(), true, 'Expanded preparation notes are visible');
}

function uniqueOutputSearch(pipelines) {
  const normalize = (text) => String(text).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const legacyText = (pipeline) => normalize([
    pipeline.name, pipeline.description, ...pipeline.categories, ...pipeline.topics,
  ].join(' '));
  const fullText = (pipeline) => normalize([
    legacyText(pipeline), pipeline.details.overview, ...pipeline.details.inputs,
    ...pipeline.details.outputs, ...pipeline.details.notes,
  ].join(' '));
  // Pick a real output phrase that the old short descriptions/topics could not
  // find. This validates the expanded search index without fixing editorial copy.
  for (const pipeline of pipelines) {
    for (const output of pipeline.details.outputs) {
      const needle = normalize(output);
      if (needle.length < 12 || pipelines.some((item) => legacyText(item).includes(needle))) continue;
      const matches = pipelines.filter((item) => fullText(item).includes(needle));
      if (matches.length === 1 && matches[0].name === pipeline.name) {
        return { query: output, pipeline };
      }
    }
  }
  throw new Error('Catalog needs one uniquely identifying output phrase for the output-search browser check.');
}

async function expectReadableType(page, selectors, label) {
  const measurements = await page.evaluate((queries) => queries.map((selector) => ({
    selector,
    elements: [...document.querySelectorAll(selector)].map((element) => ({
      size: Number.parseFloat(getComputedStyle(element).fontSize),
      text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 70),
    })),
  })), selectors);
  for (const { selector, elements } of measurements) {
    assert.ok(elements.length, `${label}: required typography sample ${selector} exists`);
    for (const { size, text } of elements) {
      assert.ok(size >= 14, `${label}: ${selector} (${text}) uses ${size}px; essential copy and navigation need at least 14px`);
    }
  }
}

async function expectMobileMenu(page, label) {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const menu = page.locator('#menuToggle');
  assert.equal(await menu.isVisible(), true);
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  await menu.click();
  await page.locator('#nav').waitFor({ state: 'visible' });
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await expectReadableType(page, ['#nav a', '#menuToggle'], `${label} mobile navigation`);
  await expectNoHorizontalOverflow(page, `${label}, 320px with navigation open`);
  await page.keyboard.press('Escape');
  await page.locator('#nav').waitFor({ state: 'hidden' });
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(await menu.evaluate((element) => element === document.activeElement), true, 'Escape restores menu-button focus');
  await expectNoHorizontalOverflow(page, `${label}, 320px`);
}

async function expectSeamAtRightEdge(page, viewportWidth) {
  await page.setViewportSize({ width: viewportWidth, height: 1000 });
  const coverage = await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
    const seam = document.querySelector('.seam');
    const svg = seam?.querySelector('svg.seam-pattern');
    if (!seam || !svg) return { missing: true };
    const bounds = svg.getBoundingClientRect();
    const seamBounds = seam.getBoundingClientRect();
    const sourceText = [...svg.querySelectorAll('pattern text')];
    const nucleotideText = sourceText.map((node) => node.textContent).join('');
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(Math.ceil(bounds.width)));
    clone.setAttribute('height', String(Math.ceil(bounds.height)));
    clone.style.width = `${bounds.width}px`;
    clone.style.height = `${bounds.height}px`;
    clone.querySelectorAll('pattern text').forEach((node, index) => {
      const style = getComputedStyle(sourceText[index]);
      node.style.font = style.font;
      node.style.letterSpacing = style.letterSpacing;
      node.style.fill = style.fill;
      node.style.opacity = style.opacity;
    });
    // Rasterize the real SVG pattern, including its computed glyph styles.
    // A full-width empty SVG would pass a bounding-box check but fail this one.
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bounds.width);
    canvas.height = Math.ceil(bounds.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const stripWidth = Math.min(32, canvas.width);
    const pixels = context.getImageData(canvas.width - stripWidth, 0, stripWidth, canvas.height).data;
    let paintedPixels = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 20) paintedPixels += 1;
    }
    return {
      viewport: document.documentElement.clientWidth,
      seamLeft: seamBounds.left,
      seamRight: seamBounds.right,
      svgWidth: bounds.width,
      nucleotideText,
      paintedPixels,
    };
  });
  assert.equal(coverage.missing, undefined, 'The seam uses a repeatable SVG nucleotide pattern');
  assert.ok(Math.abs(coverage.seamLeft) <= 1, `${viewportWidth}px seam starts at the left edge`);
  assert.ok(Math.abs(coverage.seamRight - coverage.viewport) <= 1, `${viewportWidth}px seam reaches the right edge`);
  assert.ok(Math.abs(coverage.svgWidth - coverage.viewport) <= 1, `${viewportWidth}px pattern fills the seam`);
  assert.match(coverage.nucleotideText, /[ACGT]/, 'The repeated pattern contains nucleotide glyphs');
  assert.ok(coverage.paintedPixels > 20, `${viewportWidth}px seam must paint nucleotide glyphs in its rightmost 32px`);
  await expectNoHorizontalOverflow(page, `${viewportWidth}px homepage`);
}

try {
  const { pipelines } = JSON.parse(await readFile(join(projectDirectory, 'src/data/pipelines.json'), 'utf8'));
  const defaultPipeline = pipelines.find((pipeline) => pipeline.name === 'RNA-seek');
  const chromatinPipeline = pipelines.find((pipeline) => pipeline.name === 'chrom-seek');
  assert.ok(defaultPipeline?.details && chromatinPipeline?.details, 'Reviewed RNA-seek and chrom-seek details exist');
  const outputSearch = uniqueOutputSearch(pipelines);
  const local = await startStaticServer();
  server = local.server;
  const { origin } = local;
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });

  const staticContext = await newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const staticPage = await staticContext.newPage();
  activePage = staticPage;
  captureErrors(staticPage, 'JavaScript disabled');
  await staticPage.goto(origin, { waitUntil: 'load' });
  await expectHomeLinks(staticPage);
  assert.equal(await staticPage.locator('.hero-fallback').isVisible(), true, 'The composed SVG artwork remains visible without JavaScript');
  assert.equal(await staticPage.locator('#motion').isVisible(), false, 'A nonfunctional animation control is hidden without JavaScript');
  const stillGlyphs = await staticPage.locator('.hero-fallback').textContent();
  for (const base of 'ACGT') assert.ok(stillGlyphs.includes(base), `The still artwork includes nucleotide ${base}`);
  await staticPage.setViewportSize({ width: 320, height: 900 });
  assert.equal(await staticPage.locator('.hero-fallback').isVisible(), true, 'Mobile visitors also receive a composed still without JavaScript');
  await expectNoHorizontalOverflow(staticPage, '320px homepage without JavaScript');
  await staticPage.setViewportSize({ width: 1280, height: 900 });
  await staticPage.locator('.hero a.btn[href="/pipelines/"]').click();
  await staticPage.waitForURL(`${origin}/pipelines/`);
  await expectStaticCatalog(staticPage, defaultPipeline);
  await openRunGuidance(staticPage);
  // A direct request and a hard refresh must both serve the complete catalog;
  // client-side navigation alone would miss a broken static deployment route.
  await staticPage.goto(`${origin}/pipelines/`, { waitUntil: 'load' });
  await expectStaticCatalog(staticPage, defaultPipeline);
  await staticPage.reload({ waitUntil: 'load' });
  await expectStaticCatalog(staticPage, defaultPipeline);
  for (const [path, destination, selector] of [
    ['/projects/', '/pipelines/', '#repoList'],
    ['/about/', '/#approach', '#approach'],
  ]) {
    await staticPage.goto(`${origin}${path}`, { waitUntil: 'load' });
    await staticPage.waitForURL(`${origin}${destination}`);
    assert.equal(await staticPage.locator(selector).count(), 1, `Legacy ${path} destination exists`);
  }
  await staticContext.close();
  console.log('PASS: dedicated routes, all 31 SSR links, rich default details, and native guidance without JavaScript');

  const context = await newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  activePage = page;
  captureErrors(page, 'Hydrated page');
  page.setDefaultTimeout(10000);
  await page.goto(origin, { waitUntil: 'load' });
  await expectHomeLinks(page);
  await expectReadableType(page, [...homeCopySelectors, '#nav a'], 'Desktop homepage');
  await expectNoHorizontalOverflow(page, 'Desktop homepage');
  for (const width of [2560, 3440]) await expectSeamAtRightEdge(page, width);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.hero a.btn[href="/pipelines/"]').click();
  await page.waitForURL(`${origin}/pipelines/`);
  await page.waitForFunction(() => document.getElementById('search')?.disabled === false);
  await expectRepositoryNames(page, expectedRepositories);
  assert.equal(await page.locator('#repoList button[data-repo]').count(), 31, 'Hydration activates in-page selection');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('search')?.disabled === false);
  await expectRepositoryNames(page, expectedRepositories);
  await expectRichDetails(page, defaultPipeline);
  await expectSeamAtRightEdge(page, 3440);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectReadableType(page, [...catalogCopySelectors, '#nav a'], 'Desktop pipeline page');
  await expectNoHorizontalOverflow(page, 'Desktop pipeline page');
  assert.deepEqual(runtimeErrors, [], 'Hydration must not emit console or runtime errors');
  console.log('PASS: dedicated page navigation/hydration, readable desktop type, and full-width nucleotide seams');

  const search = page.locator('#search');
  await search.fill('RNA-seq');
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('#repoList [data-repo]')];
    return rows.length > 0 && rows.length < 31 && rows.some((row) => row.dataset.repo === 'RNA-seek');
  });
  const hyphenatedMatches = await repositoryNames(page);
  await page.locator('#clearSearch').click();
  await waitForRepositoryCount(page, 31);
  await search.fill('  rna   seq  ');
  await expectRepositoryNames(page, hyphenatedMatches);
  await page.locator('#clearSearch').click();
  await waitForRepositoryCount(page, 31);
  assert.equal(await search.inputValue(), '');

  await search.fill(outputSearch.query);
  await expectRepositoryNames(page, [outputSearch.pipeline.name]);
  await expectRichDetails(page, outputSearch.pipeline);
  await page.locator('#clearSearch').click();
  await waitForRepositoryCount(page, 31);
  console.log(`PASS: output-based search finds ${outputSearch.pipeline.name} from reviewed detail content`);

  await page.locator('[data-category="Genomics"]').click();
  await expectRepositoryNames(page, [
    'genome-seek', 'assembly-seek', 'mr-seek',
    'istari', 'mpox-seek', 'pbAmp-seek', 'fragmentomics',
  ]);
  await page.locator('[data-category="Utilities"]').click();
  await expectRepositoryNames(page, ['baseline', 'parabricks-benchmark', 'istari', 'weave', 'CellSight', 'snakevision']);
  assert.equal(await page.locator('[data-category="Utilities"]').getAttribute('aria-pressed'), 'true');
  await search.fill('no-such-openomics-workflow-xyz');
  await waitForRepositoryCount(page, 0);
  assert.match(await page.locator('#detail').innerText(), /No matching projects/);
  await page.locator('#reset').click();
  await expectRepositoryNames(page, expectedRepositories);
  assert.equal(await search.inputValue(), '');
  assert.equal(await page.locator('[data-category="All"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await search.evaluate((element) => element === document.activeElement), true, 'Reset returns keyboard focus to search');
  console.log('PASS: normalized search, secondary-category filters, and empty-state reset');

  // Find each new software form through its scientific inputs or outputs,
  // then check that selection keeps its own details, sources, and type label.
  for (const [name, category, query, type] of [
    ['CellSight', 'Single cell', 'h5ad', 'R package'],
    ['PDtoMSstats', 'Proteomics', 'Proteome Discoverer', 'Analysis workflow'],
    ['microbe-count', 'Metagenomics', 'host-aligned paired-end BAM', 'Pipeline'],
    ['tcr-seek', 'Transcriptomics', 'AIRR', 'Pipeline'],
    ['snakevision', 'Utilities', 'DOT', 'Command-line tool'],
  ]) {
    await page.locator('#clearSearch').click();
    await page.locator(`[data-category="${category}"]`).click();
    await search.fill(query);
    assert.ok((await repositoryNames(page)).includes(name), `${name} is discoverable by input/output in its category`);
    await page.locator(`[data-repo="${name}"]`).click();
    await expectRichDetails(page, pipelines.find((pipeline) => pipeline.name === name));
    assert.equal((await page.locator('.project-type').textContent()).replace(/ ·\s*$/, ''), type);
    assert.equal(await page.locator('.pipeline-provenance time').getAttribute('datetime'), '2026-11-24');
    assert.equal(await page.locator('#cloneCommand').innerText(), `git clone https://github.com/OpenOmics/${name}.git`);
  }
  await page.locator('#clearSearch').click();
  await page.locator('[data-category="Archived"]').click();
  await expectRepositoryNames(page, ['cfChIP-seek', 'cyte-seek']);
  await page.locator('[data-category="All"]').click();
  await expectRepositoryNames(page, expectedRepositories);
  console.log('PASS: new packages, tools, and pipelines are searchable, categorized, and sourced; Archived remains intact');


  await page.locator('[data-repo="RNA-seek"]').click();
  await expectRichDetails(page, defaultPipeline);
  const previousOverview = await page.locator('.pipeline-overview').textContent();
  await page.locator('[data-repo="chrom-seek"]').click();
  await page.waitForFunction(() => document.querySelector('#detail h3')?.textContent === 'chrom-seek');
  assert.equal(await page.locator('[data-repo="chrom-seek"]').getAttribute('aria-pressed'), 'true');
  await expectRichDetails(page, chromatinPipeline);
  assert.notEqual(await page.locator('.pipeline-overview').textContent(), previousOverview, 'Selection replaces the previous pipeline overview');
  await openRunGuidance(page);
  const repository = 'https://github.com/OpenOmics/chrom-seek';
  for (const suffix of ['', '#readme', '/issues']) {
    assert.equal(await page.locator(`.detail-actions a[href="${repository}${suffix}"]`).count(), 1);
  }
  const cloneCommand = `git clone ${repository}.git`;
  assert.equal(await page.locator('#cloneCommand').innerText(), cloneCommand);
  await page.bringToFront();
  await page.locator('#copyClone').click();
  await page.waitForFunction(() => document.getElementById('copyStatus')?.textContent.includes('copied'));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), cloneCommand);
  console.log('PASS: selection replaces rich details/provenance, native guidance opens, and repository actions work');

  await expectMobileMenu(page, 'Pipeline page');
  await expectRichDetails(page, chromatinPipeline);
  await openRunGuidance(page);
  await expectReadableType(page, catalogCopySelectors, '320px pipeline page');
  await expectNoHorizontalOverflow(page, '320px pipeline page with expanded rich details');
  await search.fill('');
  await waitForRepositoryCount(page, 31);
  await page.locator('[data-repo="parabricks-benchmark"]').click();
  await page.waitForFunction(() => document.querySelector('#detail h3')?.textContent === 'parabricks-benchmark');
  await expectRichDetails(page, pipelines.find((pipeline) => pipeline.name === 'parabricks-benchmark'));
  await openRunGuidance(page);
  await expectNoHorizontalOverflow(page, '320px pipeline page with long repository name');
  await page.goto(origin, { waitUntil: 'load' });
  await expectHomeLinks(page);
  await expectMobileMenu(page, 'Homepage');
  await expectReadableType(page, homeCopySelectors, '320px homepage');
  console.log('PASS: readable mobile type, menu/Escape focus on both pages, and 320px overflow checks');

  // Start a fresh reveal after the responsive layout checks. The animation now
  // completes once rather than looping forever, so earlier checks may outlast it.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin, { waitUntil: 'load' });
  await waitForMotionState(page, 'playing');
  await waitForPressed(page, 'motion', false);
  await expectPaintedCanvas(page);
  await page.locator('#motion').focus();
  await page.keyboard.press('Enter');
  await waitForMotionState(page, 'paused');
  await waitForPressed(page, 'motion', true);
  assert.match(await page.locator('#motion').innerText(), /Resume animation/);
  await expectStillCanvas(page, 'Pausing freezes the current reveal frame');
  const pausedFrame = await canvasSnapshot(page);
  await page.keyboard.press('Space');
  await waitForMotionState(page, 'playing');
  await waitForPressed(page, 'motion', false);
  assert.match(await page.locator('#motion').innerText(), /Pause animation/);
  await page.waitForTimeout(350);
  assert.notEqual(await canvasSnapshot(page), pausedFrame, 'Resuming changes the actual rendered artwork');
  await waitForMotionState(page, 'complete');
  await waitForPressed(page, 'motion', true);
  assert.match(await page.locator('#motion').innerText(), /Replay animation/);
  await expectStillCanvas(page, 'The final sequence holds after the reveal completes');
  const completeFrame = await canvasSnapshot(page);
  await page.locator('#motion').click();
  await waitForMotionState(page, 'playing');
  await page.waitForTimeout(180);
  assert.notEqual(await canvasSnapshot(page), completeFrame, 'Replay restarts the sequence-ring rotation');
  await context.close();

  const reducedContext = await newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  activePage = reducedPage;
  captureErrors(reducedPage, 'Reduced motion');
  await reducedPage.goto(origin, { waitUntil: 'load' });
  await waitForMotionState(reducedPage, 'reduced');
  await waitForPressed(reducedPage, 'motion', true);
  assert.match(await reducedPage.locator('#motion').innerText(), /Play animation/);
  await reducedPage.waitForFunction(() => document.getElementById('dna')?.width > 0);
  await expectPaintedCanvas(reducedPage);
  await expectStillCanvas(reducedPage, 'Reduced-motion preference shows a composed still image');
  assert.equal(await canvasSnapshot(reducedPage), completeFrame, 'Reduced motion and the completed reveal use the identical composition');
  for (const width of [320, 390]) {
    await reducedPage.setViewportSize({ width, height: 900 });
    await expectStillCanvas(reducedPage, `${width}px reduced-motion artwork remains still after resizing`);
    await expectPaintedCanvas(reducedPage);
    assert.equal(await reducedPage.locator('#motion').isVisible(), true, `${width}px motion controls remain available`);
    assert.equal(await reducedPage.locator('.hero .btn').isVisible(), true, `${width}px primary CTA remains available`);
    await expectNoHorizontalOverflow(reducedPage, `${width}px reduced-motion homepage`);
  }
  await reducedPage.setViewportSize({ width: 1280, height: 900 });
  await reducedPage.locator('#motion').click();
  await waitForMotionState(reducedPage, 'playing');
  await waitForPressed(reducedPage, 'motion', false);
  await reducedPage.locator('#motion').click();
  await waitForMotionState(reducedPage, 'paused');
  await waitForPressed(reducedPage, 'motion', true);
  await expectStillCanvas(reducedPage, 'Explicit playback can also be paused with reduced motion enabled');
  await reducedContext.close();
  console.log('PASS: keyboard pause/resume, settled completion, replay, and matching reduced-motion compositions on desktop/mobile');

  assert.deepEqual(runtimeErrors, [], 'No browser console errors or uncaught runtime errors');
  console.log('All browser checks passed.');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    const output = join(projectDirectory, 'test-results');
    await mkdir(output, { recursive: true });
    await activePage.screenshot({ path: join(output, 'browser-failure.png'), fullPage: true }).catch(() => {});
  }
  console.error(error);
  if (runtimeErrors.length) console.error('Browser errors:', runtimeErrors);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolveClosed) => server.close(resolveClosed));
  }
}
