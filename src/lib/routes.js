export const PAGE_DEFINITIONS = [
  {
    id: 'home',
    path: '',
    title: 'OpenOmics — Open workflows. Reproducible science.',
    description: 'Community-built Snakemake pipelines for reproducible genomics and multi-omics research. Explore OpenOmics workflows and contribute.',
  },
  {
    id: 'pipelines',
    path: 'pipelines/',
    title: 'Pipelines — OpenOmics',
    description: 'Explore OpenOmics workflows for genomics and multi-omics research. Search by analysis, browse the catalog, and find each project’s documentation and source.',
  },
];

// Production pages carry their identity in the prerendered HTML. This resolver
// gives the Vite development server the same routes without a routing dependency.
export function resolvePage(pathname, base = '/') {
  const relative = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  return /^(pipelines|projects)(\/|\/index\.html|\.html)?$/.test(relative)
    ? 'pipelines'
    : 'home';
}

export function pageLinks(page, base = '/') {
  const homeSection = (id) => `${page === 'home' ? '' : base}#${id}`;
  return {
    home: page === 'home' ? '#top' : base,
    pipelines: `${base}pipelines/`,
    approach: homeSection('approach'),
    gettingStarted: homeSection('get-started'),
    community: homeSection('community'),
  };
}
