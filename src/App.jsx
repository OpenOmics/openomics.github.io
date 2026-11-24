import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import PipelineExplorer from './components/PipelineExplorer.jsx';
import { Approach, GettingStarted, Community } from './components/ContentSections.jsx';
import PipelineTeaser from './components/PipelineTeaser.jsx';
import { pageLinks } from './lib/routes.js';

export default function App({ year, page = 'home', base = '/' }) {
  const links = pageLinks(page, base);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header page={page} links={links} base={base} />
      <main id="main">
        {page === 'pipelines' ? (
          <PipelineExplorer standalone homeHref={base} />
        ) : (
          <>
            <Hero pipelineHref={links.pipelines} />
            <Approach />
            <PipelineTeaser href={links.pipelines} />
            <GettingStarted pipelineHref={links.pipelines} />
            <Community year={year} pipelineHref={links.pipelines} />
          </>
        )}
      </main>
      {page === 'pipelines' && (
        <footer className="site-footer">
          <div className="wrap">
            <div className="footer-row">
              <span>© {year} OpenOmics Community<br />Open-source bioinformatics.</span>
              <div className="footer-links">
                <a href={base}>Home</a>
                <a href={links.gettingStarted}>Get started</a>
                <a href="https://github.com/OpenOmics" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
                <a href="#main">Back to top ↑</a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
