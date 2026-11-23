import RollingText from './RollingText.jsx';

export default function PipelineTeaser({ href }) {
  return (
    <section className="section pipeline-teaser" id="pipelines" aria-labelledby="collectionTitle">
      <div className="wrap">
        <div className="section-top">
          <div className="catalog-heading">
            <div className="eyebrow muted">002 / The collection</div>
            <h2 id="collectionTitle">Find your next<br />starting point.</h2>
          </div>
          <div className="teaser-copy">
            <p>From RNA expression to genome assembly. Explore our collection of open workflows, find your analysis, and go straight to the source.</p>
            <a className="btn" href={href}>
              <RollingText>Explore all pipelines</RollingText>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
