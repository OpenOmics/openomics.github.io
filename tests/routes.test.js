import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_DEFINITIONS, pageLinks, resolvePage } from '../src/lib/routes.js';

test('homepage and pipeline URLs resolve consistently in development', () => {
  for (const path of ['/', '/index.html']) assert.equal(resolvePage(path), 'home');
  for (const path of ['/pipelines', '/pipelines/', '/pipelines/index.html', '/pipelines.html', '/projects/']) {
    assert.equal(resolvePage(path), 'pipelines');
  }
  assert.equal(resolvePage('/pipelines-other/'), 'home');
});

test('project subdirectories preserve the page identity', () => {
  assert.equal(resolvePage('/openomics/', '/openomics/'), 'home');
  assert.equal(resolvePage('/openomics/pipelines/', '/openomics/'), 'pipelines');
  assert.equal(resolvePage('/other/pipelines/', '/openomics/'), 'home');
});

test('navigation links cross pages and retain homepage anchors', () => {
  const home = pageLinks('home', '/openomics/');
  const pipelines = pageLinks('pipelines', '/openomics/');
  assert.equal(home.pipelines, '/openomics/pipelines/');
  assert.equal(home.approach, '#approach');
  assert.equal(pipelines.home, '/openomics/');
  assert.equal(pipelines.approach, '/openomics/#approach');
  assert.equal(pipelines.gettingStarted, '/openomics/#get-started');
  assert.equal(pipelines.community, '/openomics/#community');
  assert.equal(PAGE_DEFINITIONS.filter(({ id }) => id === 'pipelines').length, 1);
});
