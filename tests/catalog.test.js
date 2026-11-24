import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CATEGORIES,
  FEATURED_PIPELINES,
  categoryLabel,
  filterPipelines,
  normalizeSearch,
  repositoryLinks,
  pipelineStatusLabel,
  selectPipeline,
  sortPipelines,
} from '../src/lib/catalog.js';

const catalog = JSON.parse(readFileSync(new URL('../src/data/pipelines.json', import.meta.url), 'utf8'));
const pipelines = catalog.pipelines;
const ordered = sortPipelines(pipelines);

test('the current catalog contains 31 unique projects and valid categories', () => {
  assert.equal(catalog.metadata.count, 31);
  assert.equal(catalog.metadata.generatedDate, '2026-02-03');
  assert.equal(catalog.metadata.updatedDate, '2026-11-24');
  assert.equal(pipelines.length, catalog.metadata.count);
  assert.equal(new Set(pipelines.map(({ name }) => name)).size, 31);
  for (const pipeline of pipelines) {
    assert.equal(pipeline.url, repositoryLinks(pipeline).repository);
    assert.ok(pipeline.description.length > 0);
    assert.ok(pipeline.topics.length > 0);
    assert.ok(pipeline.categories.length > 0);
    assert.ok(pipeline.categories.every((category) => CATEGORIES.includes(category) && category !== 'All'));
  }
});

test('the accepted, edited descriptions remain intact', () => {
  assert.equal(pipelines.find(({ name }) => name === 'genome-seek').description, 'Whole genome and exome sequencing pipeline.');
  assert.equal(pipelines.find(({ name }) => name === 'cell-seek').description, 'Single-cell workflows for RNA, ATAC, CITE, and VDJ analysis.');
  assert.equal(pipelines.find(({ name }) => name === 'istari').description, 'Data preparation and validation for whole-genome regression modeling.');
  assert.equal(pipelines.find(({ name }) => name === 'space-seek').description, 'Spatial sequencing workflow for 10x Visium data.');
});

test('featured ordering is stable and leaves the source array unchanged', () => {
  const before = pipelines.map(({ name }) => name);
  assert.deepEqual(ordered.slice(0, FEATURED_PIPELINES.length).map(({ name }) => name), FEATURED_PIPELINES);
  assert.deepEqual(pipelines.map(({ name }) => name), before);
  assert.notEqual(ordered, pipelines);
  assert.deepEqual(
    ordered.slice(FEATURED_PIPELINES.length).map(({ name }) => name),
    [...ordered.slice(FEATURED_PIPELINES.length).map(({ name }) => name)].sort((a, b) => a.localeCompare(b, 'en')),
  );
});

test('search treats case, repeated whitespace, hyphens, and underscores consistently', () => {
  assert.equal(normalizeSearch('  SINGLE__cell---RNA-seq  '), 'single cell rna seq');
  assert.deepEqual(
    filterPipelines(ordered, { query: '  RNA_SEEK  ' }).map(({ name }) => name),
    ['RNA-seek'],
  );
  assert.deepEqual(
    filterPipelines(ordered, { query: 'single_cell_rna_seq' }).map(({ name }) => name),
    filterPipelines(ordered, { query: 'SINGLE-CELL-RNA-SEQ' }).map(({ name }) => name),
  );
});

test('search reaches descriptions, topics, and categories, including undisplayed topics', () => {
  assert.deepEqual(filterPipelines(ordered, { query: 'gwas preparation' }).map(({ name }) => name), ['istari']);
  assert.ok(filterPipelines(ordered, { query: 'whole genome sequencing' }).some(({ name }) => name === 'genome-seek'));
  assert.ok(filterPipelines(ordered, { query: 'Transcriptomics' }).some(({ name }) => name === 'mir-seek'));
  assert.deepEqual(filterPipelines(ordered, { query: '10x Visium data' }).map(({ name }) => name), ['space-seek']);
});

test('category and text filters intersect rather than returning unrelated matches', () => {
  assert.deepEqual(filterPipelines(ordered, { category: 'Epigenomics', query: 'RNA-seek' }), []);
  assert.deepEqual(filterPipelines(ordered, { category: 'Unknown' }), []);
  assert.equal(filterPipelines(ordered, { query: '   ' }).length, 31);
});

test('repositories assigned to two categories appear in both filters', () => {
  for (const [name, categories] of [['mpox-seek', ['Genomics', 'Metagenomics']], ['CellSight', ['Single cell', 'Utilities']]]) {
    for (const category of categories) {
      assert.ok(filterPipelines(ordered, { category }).some((pipeline) => pipeline.name === name), `${name} must appear in ${category}`);
    }
  }
  assert.equal(categoryLabel('Single cell'), 'Single cell & spatial');
  assert.ok(filterPipelines(ordered, { category: 'Single cell' }).some(({ name }) => name === 'space-seek'));
});

test('selection survives filtering when visible and safely falls back for hidden or empty results', () => {
  const epigenomics = filterPipelines(ordered, { category: 'Epigenomics' });
  assert.equal(selectPipeline(epigenomics, 'methyl-seek').name, 'methyl-seek');
  assert.equal(selectPipeline(epigenomics, 'RNA-seek').name, 'chrom-seek');
  assert.equal(selectPipeline([], 'RNA-seek'), null);
  assert.equal(selectPipeline(ordered, '').name, 'genome-seek');
});

test('README, issues, and clone links preserve case and point to the same repository', () => {
  assert.deepEqual(repositoryLinks({ name: 'RNA-seek' }), {
    repository: 'https://github.com/OpenOmics/RNA-seek',
    readme: 'https://github.com/OpenOmics/RNA-seek#readme',
    issues: 'https://github.com/OpenOmics/RNA-seek/issues',
    clone: 'git clone https://github.com/OpenOmics/RNA-seek.git',
  });
});

test('every pipeline has sourced scientific details and a distinct documentation review date', () => {
  assert.equal(catalog.metadata.generatedDate, '2026-02-03', 'Description edits do not change the repository inventory date');
  assert.equal(catalog.metadata.detailsReviewedDate, '2026-11-18');
  for (const pipeline of pipelines) {
    const details = pipeline.details;
    assert.ok(details, `${pipeline.name}: missing details`);
    assert.ok(details.overview.length > pipeline.description.length, `${pipeline.name}: overview must expand the short description`);
    for (const field of ['inputs', 'outputs', 'notes']) {
      assert.ok(Array.isArray(details[field]) && details[field].length, `${pipeline.name}: missing ${field}`);
      assert.ok(details[field].every((item) => typeof item === 'string' && item.trim()), `${pipeline.name}: empty ${field} item`);
      assert.equal(new Set(details[field]).size, details[field].length, `${pipeline.name}: repeated ${field} item`);
    }
    assert.match(details.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(details.reviewedOn).toISOString().slice(0, 10), details.reviewedOn);
    for (const field of ['documentationUrl', 'sourceUrl']) {
      const url = new URL(details[field]);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.username + url.password, '');
    }
    const source = new URL(details.sourceUrl);
    assert.equal(source.hostname, 'github.com');
    const repositoryPath = `/OpenOmics/${pipeline.name}`;
    assert.ok(source.pathname === repositoryPath || source.pathname.startsWith(`${repositoryPath}/`), `${pipeline.name}: source must belong to this repository`);
    if (details.status) assert.ok(pipelineStatusLabel(details.status), `${pipeline.name}: unknown status`);
    assert.equal(new Set((details.sources ?? []).map(({ url }) => url)).size, (details.sources ?? []).length, `${pipeline.name}: repeated source link`);
    for (const extra of details.sources ?? []) {
      assert.ok(extra.label.trim());
      assert.equal(new URL(extra.url).protocol, 'https:');
    }
  }
});

test('archived projects stay discoverable without appearing in active analysis categories', () => {
  const archivedNames = ['cfChIP-seek', 'cyte-seek', 'parabricks-benchmark'];
  assert.deepEqual(filterPipelines(ordered, { category: 'Archived' }).map(({ name }) => name), archivedNames);
  for (const name of archivedNames) {
    assert.equal(pipelines.find((pipeline) => pipeline.name === name).details.status, 'archived');
    assert.ok(filterPipelines(ordered, { category: 'All', query: name }).some((pipeline) => pipeline.name === name));
    for (const category of CATEGORIES.filter((value) => !['All', 'Archived'].includes(value))) {
      assert.ok(!filterPipelines(ordered, { category }).some((pipeline) => pipeline.name === name), `${name} must not appear in active category ${category}`);
    }
  }
  assert.equal(pipelineStatusLabel('template'), 'Workflow template');
  assert.equal(pipelineStatusLabel('scaffold'), 'Development scaffold');
  assert.equal(pipelineStatusLabel(undefined), '');
});

test('search finds input data, outputs, overviews, and requirements while preserving category filters', () => {
  const fixture = [{
    name: 'example', description: 'A workflow', topics: [], categories: ['Transcriptomics'],
    details: {
      type: 'R package',
      overview: 'Quantify transcript abundance.',
      inputs: ['Aligned BAM files'], outputs: ['Gene count matrix'],
      notes: ['Requires a reference annotation'],
    },
  }];
  for (const query of ['r package', 'transcript abundance', 'aligned_BAM', 'gene-count matrix', 'reference annotation']) {
    assert.equal(filterPipelines(fixture, { query }).length, 1, query);
    assert.equal(filterPipelines(fixture, { query, category: 'Genomics' }).length, 0, query);
  }
  assert.doesNotThrow(() => filterPipelines([{ ...fixture[0], details: undefined }], { query: 'workflow' }));
});
