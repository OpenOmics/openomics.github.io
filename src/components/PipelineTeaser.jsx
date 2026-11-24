import RollingText from './RollingText.jsx';

export default function PipelineTeaser({ href }) {
  return (
    <section className="section pipeline-teaser" id="pipelines" aria-labelledby="collectionTitle">
      <div className="wrap">
        <div className="section-top">
          <div className="catalog-heading">
            <div className="eyebrow muted">002 / The collection</div>
            <h2 id="collectionTitle"><strong>Find a workflow</strong><br />for your research.</h2>
          </div>
          <div className="teaser-copy">
            <p>From RNA expression to genome assembly to single-cell analysis to metagenomics.</p>
            <p>Explore our collection of open workflows and tools. Find a pipeline, review its requirements, and run it with your data.</p>
            <a className="btn" href={href}>
              <RollingText>Explore the collection</RollingText>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
