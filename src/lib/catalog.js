export const CATEGORIES = Object.freeze([
  'All',
  'Genomics',
  'Transcriptomics',
  'Epigenomics',
  'Single cell',
  'Metagenomics',
  'Utilities',
]);

export const FEATURED_PIPELINES = Object.freeze([
  'RNA-seek',
  'chrom-seek',
  'cell-seek',
  'genome-seek',
]);

export function categoryLabel(category) {
  return category === 'Single cell' ? 'Single cell & spatial' : category;
}

export function pipelineStatusLabel(status) {
  return {
    archived: 'Archived',
    scaffold: 'Development scaffold',
    template: 'Workflow template',
  }[status] || '';
}

export function normalizeSearch(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Return a new collection; never reorder the source snapshot. */
export function sortPipelines(pipelines) {
  const rank = (name) => {
    const index = FEATURED_PIPELINES.indexOf(name);
    return index === -1 ? FEATURED_PIPELINES.length : index;
  };

  return [...pipelines].sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'en'),
  );
}

/** Search the scientific overview and practical details as well as catalog tags. */
export function filterPipelines(pipelines, { query = '', category = 'All' } = {}) {
  const needle = normalizeSearch(query);

  return pipelines.filter((pipeline) => {
    const categoryMatches = category === 'All' || pipeline.categories.includes(category);
    const haystack = normalizeSearch([
      pipeline.name,
      pipeline.description,
      pipeline.details?.overview ?? '',
      pipelineStatusLabel(pipeline.details?.status),
      ...(pipeline.details?.inputs ?? []),
      ...(pipeline.details?.outputs ?? []),
      ...(pipeline.details?.notes ?? []),
      ...pipeline.topics,
      ...pipeline.categories,
    ].join(' '));

    return categoryMatches && haystack.includes(needle);
  });
}

/** Keep a valid selection, otherwise use the first visible result. */
export function selectPipeline(pipelines, selectedName) {
  return pipelines.find((pipeline) => pipeline.name === selectedName) ?? pipelines[0] ?? null;
}

export function repositoryLinks(pipeline) {
  const repository = `https://github.com/OpenOmics/${encodeURIComponent(pipeline.name)}`;
  return {
    repository,
    readme: `${repository}#readme`,
    issues: `${repository}/issues`,
    clone: `git clone ${repository}.git`,
  };
}
