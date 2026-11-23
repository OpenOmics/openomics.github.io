import RollingText from './RollingText.jsx';

const principles = [
  {
    number: '01',
    title: 'Built to reproduce.',
    description: 'Explicit workflows, environment management, and containerization help make complex analyses easier to understand and repeat.',
  },
  {
    number: '02',
    title: 'Open by design.',
    description: 'Explore the source, inspect the methods, and contribute improvements. Shared knowledge belongs at the center of scientific progress.',
  },
  {
    number: '03',
    title: 'Made to build on.',
    description: 'Use existing pipelines as a starting point. Follow each repository’s documentation to configure the workflow for your data and environment.',
  },
];

const questions = [
  {
    question: 'Where do I find pipeline documentation?',
    answer: 'Every entry in the explorer links to its GitHub repository and README. Follow those links for the project’s current instructions, examples, and configuration requirements.',
  },
  {
    question: 'Can I run these on an HPC cluster?',
    answer: 'Snakemake supports execution on workstations, HPC clusters, and cloud infrastructure. The setup available for a particular pipeline depends on that repository. Review its documented profiles, software versions, and resource requirements.',
  },
  {
    question: 'How can I contribute or report an issue?',
    answer: 'Open the relevant repository and review its contribution instructions, if provided. Use that repository’s issues for bugs and suggestions, or propose a change through a pull request.',
  },
  {
    question: 'Which license applies to a workflow?',
    answer: 'Check the LICENSE file and dependency terms in the specific repository you intend to use. Licensing is determined per project.',
  },
];

export function Approach() {
  const sequenceRows = [
    'ATGCCGTAACTGCTAGTCCGA', 'GCTAGTCGATGCTA—ACGTT',
    'CGTACGTTAGCTCAACGTTA', 'ATGCTAACCGTGCTAGTCAG',
    'TTACCGATGGCATTCATAGC', 'CGTACAGTTACGCTAGCTGA',
  ];
  return (
    <section className="light section approach-section" id="approach">
      <div className="wrap">
        <div className="approach-opening">
          <div>
            <div className="eyebrow">001 / From sequence to insight</div>
            <h2>Every result<br />has a method.</h2>
          </div>
          <div className="alignment-study" aria-hidden="true">
            <svg viewBox="0 0 540 224" focusable="false">
              {sequenceRows.map((row, index) => (
                <g key={row}>
                  <line x1={index % 2 ? 18 : 0} x2="540" y1={28 + index * 32} y2={28 + index * 32} stroke="#8b9b65" strokeWidth="1" opacity=".5" />
                  <rect x="53" y={13 + index * 32} width="364" height="25" fill="#efeee7" />
                  <text x="65" y={32 + index * 32} fontSize="14" letterSpacing="5.5" fill="#363d2a" fontFamily="monospace">{row}</text>
                  <line x1={448 - index * 7} x2={520 - index * 12} y1={28 + index * 32} y2={28 + index * 32} stroke="#8b9b65" strokeWidth="2" />
                </g>
              ))}
            </svg>
            <span>Illustrative sequence study</span>
          </div>
        </div>
        <div className="intro-bottom">
          <div className="eyebrow">Shared tools.<br />Reproducible research.</div>
          <p className="intro-copy">OpenOmics is a community of bioinformaticians, computational biologists, and data scientists building workflows for genomics and multi-omics research. Our mission is to make scientific analysis reproducible, scalable, and well documented.</p>
        </div>
        <div className="principles">
          {principles.map(({ number, title, description }) => (
            <article className="principle" key={number}>
              <span className="number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="stack-line">
          <span>The workflow foundation</span>
          <span><strong>Snakemake</strong> / Conda &amp; Mamba / Singularity &amp; Docker / GitHub</span>
        </div>
      </div>
    </section>
  );
}

export function GettingStarted({ pipelineHref }) {
  return (
    <section className="light section" id="get-started">
      <div className="wrap">
        <div className="start-grid">
          <div>
            <div className="eyebrow">003 / From code to analysis</div>
            <h2>Your data.<br />A clear path<br />forward.</h2>
            <p className="intro-copy">Snakemake brings readable workflow definitions and flexible execution to scientific computing. Specific environments, versions, and execution profiles belong in each pipeline’s documentation.</p>
            <a className="text-link" href="https://snakemake.readthedocs.io/en/stable/getting_started/installation.html" target="_blank" rel="noopener noreferrer">Snakemake installation guide ↗</a>
          </div>
          <ol className="steps">
            <li>
              <span className="step-num">01 /</span>
              <div>
                <h3>Choose your workflow.</h3>
                <p>Use the <a href={pipelineHref}>pipeline explorer</a> to find the analysis that matches your question and sequencing technology.</p>
              </div>
            </li>
            <li>
              <span className="step-num">02 /</span>
              <div>
                <h3>Start with the README.</h3>
                <p>Clone the repository. Review its supported inputs, required references, dependencies, and version-specific instructions.</p>
              </div>
            </li>
            <li>
              <span className="step-num">03 /</span>
              <div>
                <h3>Prepare your environment.</h3>
                <p>Install the required Snakemake version and follow the repository’s environment or container setup. Check the requirements for your workstation, cluster, or cloud environment.</p>
              </div>
            </li>
            <li>
              <span className="step-num">04 /</span>
              <div>
                <h3>Configure. Run. Review.</h3>
                <p>Adapt the configuration for your data, use the documented execution steps, and inspect the outputs and quality-control reports provided by the workflow.</p>
              </div>
            </li>
          </ol>
        </div>
        <div className="faq">
          <div className="faq-title">A few things to know.</div>
          <div>
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Community({ year, pipelineHref }) {
  return (
    <section className="closing" id="community">
      <div className="wrap">
        <div className="eyebrow muted">004 / Built together</div>
        <div className="closing-head">
          <div>
            <h2>Science moves forward<br />when we <span>share.</span></h2>
            <a className="btn" href="https://github.com/OpenOmics" target="_blank" rel="noopener noreferrer">
              <RollingText>Build with OpenOmics</RollingText>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="closing-copy">We share workflows, documentation, and ideas with the research community. Bring your questions, improve a pipeline, or help make someone else’s next analysis a little clearer.</p>
        </div>
        <div className="closing-wordmark" aria-hidden="true">OpenOmics</div>
        <footer className="footer-row">
          <span>© <span id="year">{year}</span> OpenOmics Community<br />Open-source bioinformatics.</span>
          <div className="footer-links">
            <a href={pipelineHref}>Pipelines</a>
            <a href="https://github.com/OpenOmics" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href="#top">Back to top ↑</a>
          </div>
        </footer>
      </div>
    </section>
  );
}
