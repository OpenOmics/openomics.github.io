import RollingText from './RollingText.jsx';

const principles = [
  {
    number: '01',
    title: 'Built for reproducibility.',
    description: 'Explicit workflows, environment management, and containerization help make complex analyses easier to understand and repeat.',
  },
  {
    number: '02',
    title: 'Open by design.',
    description: 'Explore the source, inspect the methods, and contribute improvements. Shared knowledge belongs at the center of scientific progress.',
  },
  {
    number: '03',
    title: 'Designed for reuse.',
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
    answer: 'Snakemake supports execution on workstations, HPC clusters, and cloud infrastructure. Most of our pipelines have been designed to run in HPC SLURM environments; however, they can often be adapted to other setups. The setup available for a particular pipeline depends on that repository. Review its documented profiles, software versions, and resource requirements.',
  },
  {
    question: 'How can I contribute or report an issue?',
    answer: 'Open the relevant repository and review its contribution instructions, if provided. Use that repository’s issues for bugs and suggestions, or propose a change through a pull request.',
  },
  {
    question: 'Which license applies to a workflow?',
    answer: 'Check the LICENSE file and dependency terms in the specific repository you intend to use. Licensing is determined per project. Most of our pipelines and tools are released under permissive open-source licenses, such as MIT.',
  },
];

export function Approach() {
  // Synthetic related sequences with conserved columns, substitutions, and gaps.
  const sequenceRows = [
    'ATGCCG-AACTG-CTAGTCCGAT',
    'ATGCCGTAACTGACTAGTCCGAT',
    'A-GTCGTAACTG-CTAGTCC-AT',
    'ATG-CGTAGCTGACTAGTCCGAT',
    'ATGCCGTAACTG-CTAGTTCGAT',
    'ATGC-GTAACTGACTAGTCCG-T',
  ];
  return (
    <section className="light section approach-section" id="approach">
      <div className="wrap">
        <div className="approach-opening">
          <div>
            <div className="eyebrow">001 / From sequence to insight</div>
            <h2>Discovery works<br />better together</h2>
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
          </div>
        </div>
        <div className="intro-bottom">
          <div className="eyebrow">Shared tools.<br />Reproducible research.</div>
          <div>
            <p className="intro-copy">OpenOmics is a community of bioinformaticians, computational biologists, and data scientists building workflows and tools for genomics and multi-omics research. Our mission is to make scientific analyses more accessible, transparent, and reproducible. We build tools that help researchers turn complex data into actionable insights.</p>
            <p className="intro-copy">Research moves forward when teams can understand how a result was produced, share lessons learned, and build on each other’s work. We create tools that support that process—from the first analysis to the next discovery—guided by three principles.</p>
          </div>
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
            <h2>From workflow<br /> to first run.</h2>
            <p className="intro-copy">Snakemake brings readable workflow definitions and flexible execution to scientific computing. Specific environments, versions, and execution profiles belong in each pipeline’s documentation.</p>
            <a className="text-link" href="https://snakemake.readthedocs.io/en/stable/getting_started/installation.html" target="_blank" rel="noopener noreferrer">Snakemake installation guide ↗</a>
          </div>
          <ol className="steps">
            <li>
              <span className="step-num">01 /</span>
              <div>
                <h3>Choose your workflow.</h3>
                <p>Use the <a href={pipelineHref}>collection explorer</a> to find a workflow or tool that addresses your research question and sequencing technology.</p>
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
                <p>Install the required Snakemake version and follow the repository’s environment or container setup. Check the requirements for your workstation or cluster environment.</p>
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
        <div className="eyebrow muted">004 / Let's build together</div>
        <div className="closing-head">
          <div>
            <h2><strong>Science moves<br /> forward</strong> <em>when<br /> we <span>share.</span></em></h2>
            <a className="btn" href="https://github.com/OpenOmics" target="_blank" rel="noopener noreferrer">
              <RollingText>Build with OpenOmics</RollingText>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="closing-copy">We believe in the power of community-led efforts. Let's share workflows, tools, documentation, and ideas with the greater research community.<br/><br/>Bring your questions, improve a tool or pipeline, and help advance scientific research.</p>
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
