import { useEffect, useMemo, useRef, useState } from 'react';
import catalog from '../data/pipelines.json';
import NucleotideSeam from './NucleotideSeam.jsx';
import {
  CATEGORIES,
  categoryLabel,
  filterPipelines,
  repositoryLinks,
  pipelineStatusLabel,
  selectPipeline,
  sortPipelines,
} from '../lib/catalog.js';

const pipelines = sortPipelines(catalog.pipelines);
const externalLink = { target: '_blank', rel: 'noopener noreferrer' };

function PipelineDetails({ pipeline, enhanced, onReset }) {
  const [copyStatus, setCopyStatus] = useState('');
  const codeRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!pipeline) {
    return (
      <div className="empty">
        <h3 id="pipelineDetailTitle">No matching projects.</h3>
        <p>Try a broader search or select another analysis category.</p>
        <button className="btn" id="reset" type="button" onClick={onReset}>
          Reset filters <span aria-hidden="true">↗</span>
        </button>
      </div>
    );
  }

  const links = repositoryLinks(pipeline);
  const details = pipeline.details;

  async function copyCloneCommand() {
    setCopyStatus('');

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(links.clone);
      if (mountedRef.current) setCopyStatus('Clone command copied.');
    } catch {
      if (!mountedRef.current) return;

      try {
        const code = codeRef.current;
        const ownerDocument = code?.ownerDocument;
        const selection = ownerDocument?.defaultView?.getSelection();
        if (!code || !ownerDocument || !selection) throw new Error('Selection unavailable');
        const range = ownerDocument.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        setCopyStatus('Command selected. Use your device’s Copy action (Ctrl+C / ⌘C on desktop).');
      } catch {
        setCopyStatus('Copy is unavailable. Select and copy the command above.');
      }
    }
  }

  return (
    <>
      <div className="detail-top">
        <span className="file-path">OpenOmics / {pipeline.name}</span>
        <span className="mono muted">README ↗</span>
      </div>
      <div className="detail-kicker">
        {details?.type && <span className="project-type">{details.type} · </span>}
        {pipeline.categories.map(categoryLabel).join(' / ')}
      </div>
      {details?.status && <div className="pipeline-status">{pipelineStatusLabel(details.status)}</div>}
      <h3 id="pipelineDetailTitle">{pipeline.name}</h3>
      <p className="pipeline-overview">{details?.overview || pipeline.description}</p>
      <ul className="topics" aria-label="Project topics">
        {pipeline.topics.slice(0, 6).map((topic) => (
          <li key={topic}>{topic.replaceAll('-', ' ')}</li>
        ))}
      </ul>
      <div className="detail-actions">
        <a className="btn" href={links.readme} {...externalLink}>
          Read the README <span aria-hidden="true">↗</span>
        </a>
        <a className="text-link" href={links.repository} {...externalLink}>Repository ↗</a>
        <a className="text-link" href={links.issues} {...externalLink}>Issues ↗</a>
      </div>
      {details && (
        <>
          <div className="pipeline-facts">
            <section aria-labelledby="pipelineInputsTitle">
              <h4 id="pipelineInputsTitle">Input data</h4>
              <ul>{details.inputs.map((input) => <li key={input}>{input}</li>)}</ul>
            </section>
            <section aria-labelledby="pipelineOutputsTitle">
              <h4 id="pipelineOutputsTitle">Main outputs</h4>
              <ul>{details.outputs.map((output) => <li key={output}>{output}</li>)}</ul>
            </section>
          </div>
          <details className="pipeline-guidance">
            <summary>Before you run</summary>
            <ul>{details.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            {details.sources?.length > 1 && (
              <div className="pipeline-supporting-sources">
                <span>Supporting documentation</span>
                <ul>
                  {details.sources.map((source) => (
                    <li key={source.url}><a href={source.url} {...externalLink}>{source.label} ↗</a></li>
                  ))}
                </ul>
              </div>
            )}
            <a className="text-link" href={details.documentationUrl} {...externalLink}>Project documentation ↗</a>
          </details>
          <p className="pipeline-provenance">
            <a href={details.sourceUrl} {...externalLink}>Description source ↗</a>
            <span>Documentation reviewed <time dateTime={details.reviewedOn}>{details.reviewedOn}</time></span>
          </p>
        </>
      )}
      <div className="clone-box">
        <span className="clone-label">Get the source</span>
        <div className="clone-row">
          <code id="cloneCommand" ref={codeRef}>{links.clone}</code>
          <button
            className="copy"
            id="copyClone"
            type="button"
            disabled={!enhanced}
            onClick={copyCloneCommand}
            aria-label={`Copy clone command for ${pipeline.name}`}
          >Copy</button>
        </div>
        <div className="status" id="copyStatus" role="status" aria-live="polite">{copyStatus}</div>
      </div>
    </>
  );
}

export default function PipelineExplorer({ standalone = false, homeHref = '/' }) {
  const Heading = standalone ? 'h1' : 'h2';
  const [enhanced, setEnhanced] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedName, setSelectedName] = useState('RNA-seek');
  const [announcement, setAnnouncement] = useState('');
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  // The server output contains real links for every repository. Browser-only
  // interactions are activated after hydration, leaving that fallback usable.
  useEffect(() => { setEnhanced(true); }, []);

  const items = useMemo(
    () => filterPipelines(pipelines, { query, category }),
    [query, category],
  );
  const selected = selectPipeline(items, selectedName);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateScrollHint = () => {
      setHasMoreBelow(list.scrollHeight - list.clientHeight - list.scrollTop > 1);
    };
    updateScrollHint();
    list.addEventListener('scroll', updateScrollHint, { passive: true });
    const observer = new ResizeObserver(updateScrollHint);
    observer.observe(list);

    return () => {
      list.removeEventListener('scroll', updateScrollHint);
      observer.disconnect();
    };
  }, [items, enhanced]);

  function changeFilters(nextQuery, nextCategory) {
    const nextItems = filterPipelines(pipelines, { query: nextQuery, category: nextCategory });
    setQuery(nextQuery);
    setCategory(nextCategory);
    setSelectedName(selectPipeline(nextItems, selectedName)?.name ?? '');
    setAnnouncement('');
  }

  function resetFilters() {
    changeFilters('', 'All');
    searchRef.current?.focus();
  }

  function clearSearch() {
    changeFilters('', category);
    searchRef.current?.focus();
  }

  function choosePipeline(pipeline) {
    setSelectedName(pipeline.name);
    setAnnouncement(`${pipeline.name} selected. Details updated.`);
  }

  return (
    <section className={`catalog section${standalone ? ' pipeline-page' : ''}`} id="pipelines" aria-labelledby="pipelinesHeading">
      <div className={standalone ? 'pipeline-intro' : undefined}>
        <div className="wrap">
          {standalone && (
            <nav className="page-breadcrumb" aria-label="Breadcrumb">
              <a href={homeHref}>Home</a>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Pipelines</span>
            </nav>
          )}
          <div className="section-top">
            <div className="catalog-heading">
              <div className="eyebrow muted">{standalone ? 'The OpenOmics catalog' : '002 / The collection'}</div>
              <Heading id="pipelinesHeading">Explore our collection.</Heading>
            </div>
            <p>Explore pipelines, tools, and packages for multi-omics research. Find a starting point and go straight to the source.</p>
          </div>
        </div>
      </div>
      {standalone && <NucleotideSeam />}
      <div className={standalone ? 'wrap pipeline-workspace' : 'wrap'}>
        <div className="toolbar">
          <div className="search-wrap">
            <span aria-hidden="true">⌕</span>
            <label className="sr" htmlFor="search">Search projects by name, analysis, input data, or output</label>
            <input
              id="search"
              ref={searchRef}
              type="search"
              placeholder="Search projects, input data, or outputs…"
              autoComplete="off"
              value={query}
              disabled={!enhanced}
              onChange={(event) => changeFilters(event.target.value, category)}
              aria-controls="repoList"
            />
            <button
              className="clear"
              id="clearSearch"
              type="button"
              aria-label="Clear search"
              disabled={!enhanced}
              onClick={clearSearch}
            >×</button>
          </div>
        </div>
        <div className="filters" id="filters" role="group" aria-label="Filter by analysis">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              className="filter"
              type="button"
              data-category={value}
              disabled={!enhanced}
              aria-pressed={category === value}
              aria-controls="repoList"
              onClick={() => changeFilters(query, value)}
            >{categoryLabel(value)}</button>
          ))}
        </div>
        <div className="browser">
          <div className="browser-bar">
            <span>OpenOmics / pipeline explorer</span>
            <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span id="resultCount" role="status" aria-live="polite" aria-atomic="true">
              {items.length} / {pipelines.length} projects
            </span>
          </div>
          <div className="browser-body">
            <aside className="repo-sidebar" aria-label="Project index">
              <div className="index-label">PROJECTS / SELECT TO EXPLORE</div>
              <div className="repo-list-frame" data-more-below={hasMoreBelow}>
                <div className="repo-list" id="repoList" ref={listRef}>
                  {items.length ? items.map((pipeline) => (
                    enhanced ? (
                      <button
                        key={pipeline.name}
                        type="button"
                        className="repo-row"
                        data-repo={pipeline.name}
                        aria-pressed={selected?.name === pipeline.name}
                        aria-controls="detail"
                        onClick={() => choosePipeline(pipeline)}
                      >
                        {pipeline.name}
                        {selected?.name === pipeline.name && <span className="row-arrow" aria-hidden="true">↗</span>}
                      </button>
                    ) : (
                      <a key={pipeline.name} className="repo-row" data-repo={pipeline.name} href={pipeline.url} {...externalLink}>
                        {pipeline.name}<span className="row-arrow" aria-hidden="true">↗</span>
                      </a>
                    )
                  )) : <div className="empty">No matches in this category.</div>}
                </div>
              </div>
            </aside>
            <div className="detail" id="detail" role="region" aria-labelledby="pipelineDetailTitle">
              <PipelineDetails
                key={selected?.name ?? 'empty'}
                pipeline={selected}
                enhanced={enhanced}
                onReset={resetFilters}
              />
            </div>
          </div>
        </div>
        <p className="catalog-note">
          Catalog updated: <time dateTime={catalog.metadata.updatedDate}>{catalog.metadata.updatedDisplayDate}</time>
          {' · '}{catalog.metadata.count} projects{' · '}
          Documentation review dates are listed per project{' · '}
          <a href="https://github.com/OpenOmics" {...externalLink}>Visit GitHub for current repositories and activity ↗</a>
        </p>
        <div className="sr" id="announcement" role="status" aria-live="polite">{announcement}</div>
        <noscript>
          <p className="catalog-note">The pipeline links above open each repository on GitHub. JavaScript enables search, filters, and in-page details.</p>
        </noscript>
      </div>
    </section>
  );
}
