import NucleotideSeam from './NucleotideSeam.jsx';

const sequence = 'ATGCTACGATCGTAGCTAGCTGACTGACCTGATCGATCGTAGCTAG';
const rings = [
  { radius: 156, count: 70, opacity: .65 },
  { radius: 189, count: 86, opacity: .42 },
  { radius: 222, count: 102, opacity: .24 },
];

function UnmappedSequence() {
  return (
    <svg className="not-found-art" viewBox="0 0 500 500" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="1 7" opacity=".2">
        {rings.map(({ radius }) => <circle key={radius} cx="250" cy="250" r={radius + 16} />)}
      </g>
      <g fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace" fontSize="12" textAnchor="middle">
        {rings.flatMap(({ radius, count, opacity }, ring) => Array.from({ length: count }, (_, index) => {
          // An open wedge suggests the missing region without moving the artwork.
          const degrees = index / count * 360;
          if (degrees > 45 && degrees < 99) return null;
          const angle = degrees * Math.PI / 180;
          const sequenceIndex = (index + ring * 7) % sequence.length;
          const base = sequence[sequenceIndex];
          return <text key={`${ring}-${index}`} transform={`translate(${250 + Math.cos(angle) * radius} ${250 + Math.sin(angle) * radius}) rotate(${degrees + 90})`}
            fill={sequenceIndex < 3 ? 'var(--acid)' : 'currentColor'} opacity={opacity}>{base}</text>;
        }))}
      </g>
      <text className="not-found-code" x="250" y="273" textAnchor="middle">404</text>
      <path d="M 248 230 H 260 M 254 224 V 236" fill="none" stroke="var(--acid)" strokeWidth="1.2" />
      <text className="not-found-art-label" x="250" y="309" textAnchor="middle">UNMAPPED REGION</text>
      <path d="M 299 369 L 326 433 H 411" fill="none" stroke="var(--acid)" strokeWidth=".8" opacity=".45" />
      <circle cx="299" cy="369" r="2.5" fill="var(--acid)" />
    </svg>
  );
}

// Rendered at build time with the site's stylesheet, without a client bundle.
// Rooted URLs also work when GitHub Pages serves this at a nested missing path.
export default function NotFoundPage({ year, base, stylesheets }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#141514" />
        <meta name="robots" content="noindex" />
        <title>Page not found — OpenOmics</title>
        <link rel="icon" type="image/png" sizes="512x512" href={`${base}openomics-logo.png`} />
        {stylesheets.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body className="not-found-page">
        <a className="skip" href="#main">Skip to content</a>
        <header>
          <div className="wrap header-row">
            <a className="brand" href={base} aria-label="OpenOmics home">
              <img className="brand-mark" src={`${base}openomics-logo.png`} width="36" height="36" alt="" />
              OpenOmics
            </a>
            <a className="text-link" href="https://github.com/OpenOmics" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          </div>
        </header>
        <main id="main" className="not-found-main">
          <div className="wrap not-found-layout">
            <div className="not-found-copy">
              <p className="eyebrow not-found-eyebrow">404 / Page not found</p>
              <h1>This path hasn’t<br />been <em>mapped.</em></h1>
              <p className="not-found-description">The page you’re looking for may have moved, or the address may be incorrect. Let’s find your next starting point.</p>
              <div className="actions">
                <a className="btn" href={base}><span aria-hidden="true">←</span> Back to home</a>
                <a className="text-link" href={`${base}pipelines/`}>Explore the pipelines <span aria-hidden="true">→</span></a>
              </div>
              <p className="not-found-hint">Looking for pipeline documentation?<br />Check the spelling and capitalization of the URL.</p>
            </div>
            <UnmappedSequence />
          </div>
        </main>
        <footer className="not-found-footer light">
          <NucleotideSeam />
          <div className="wrap">
            <div className="footer-row">
              <span>© {year} OpenOmics Community</span>
              <span>Open workflows. Reproducible science.</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
