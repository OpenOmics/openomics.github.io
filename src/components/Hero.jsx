import { useEffect, useId, useRef, useState } from 'react';
import RollingText from './RollingText.jsx';
import SequenceStill from './SequenceStill.jsx';
import { attachSequenceAnimation } from '../lib/sequence-animation.js';

const BASES = 'ACGT';
const SEAM_COLUMNS = 48;
const SEAM_COLUMN_WIDTH = 12;
const SEAM_ROW_HEIGHT = 16;
const SEAM_GLYPHS = Array.from({ length: 8 * SEAM_COLUMNS }, (_, index) => {
  const row = Math.floor(index / SEAM_COLUMNS);
  const column = index % SEAM_COLUMNS;
  const noise = Math.abs((Math.sin(column * 78.233 + row * 12.9898) * 43758.5453) % 1);
  return noise > row * .115 ? {
    key: index, x: column * SEAM_COLUMN_WIDTH, y: row * SEAM_ROW_HEIGHT + 13,
    base: BASES[(column * 7 + row * 3) % 4],
  } : null;
}).filter(Boolean);

export default function Hero({ pipelineHref = '/pipelines/' }) {
  const seamPatternId = useId();
  const canvasRef = useRef(null);
  const controls = useRef(null);
  const [motion, setMotion] = useState({ mode: 'ready', available: false });
  useEffect(() => {
    controls.current = attachSequenceAnimation(canvasRef.current, setMotion);
    return () => { controls.current?.destroy(); controls.current = null; };
  }, []);
  const motionLabels = {
    playing: 'Pause animation', paused: 'Resume animation',
    complete: 'Replay animation', reduced: 'Play animation', ready: 'Play animation',
  };
  return (
    <>
      <section className="hero" id="top" aria-labelledby="heroTitle" data-ready={motion.available} data-motion-state={motion.mode}>
        <SequenceStill />
        <canvas ref={canvasRef} id="dna" className="hero-canvas" aria-hidden="true" />
        <div className="wrap hero-layout">
          <div className="hero-intro">
            <div className="hero-meta eyebrow">
              <span className="live">Open-source bioinformatics</span>
              <span className="meta-right">Genomics · Multi-omics</span>
            </div>
            <h1 id="heroTitle">
              <span>Complex biology.</span>
              <span className="second">Made <em>legible.</em></span>
            </h1>
            <div className="hero-copy">
              <p>Open workflows for genomics<br className="hero-copy-break" /> and multi-omics research.</p>
              <div className="actions">
                <a className="btn" href={pipelineHref}>
                  <RollingText>Explore the pipelines</RollingText><span aria-hidden="true">↗</span>
                </a>
                <a className="text-link" href="#approach">Discover the approach <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <div className="hero-legend" aria-hidden="true">
              <span>01 / Sequences</span><span className="legend-rule" /><span>02 / Alignment</span>
            </div>
            <div className="art-caption">
              <span>Sequence alignment · illustrative</span>
              <span className="sr">Concentric rings of A, C, G, and T nucleotide sequences rotate independently, then slow to align their highlighted sequence markers along a common axis.</span>
              <button className="motion-button" id="motion" type="button"
                aria-pressed={motion.mode !== 'playing'} hidden={!motion.available}
                onClick={() => controls.current?.toggle()}>
                <span aria-hidden="true">{motion.mode === 'playing' ? 'Ⅱ' : motion.mode === 'complete' ? '↻' : '▷'}</span>
                {motionLabels[motion.mode] || 'Play animation'}
              </button>
            </div>
          </div>
          <div className="hero-floor">
            <span>Built by researchers. Developed in the open.</span>
            <a href="#approach">From sequence to insight <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>
      <div className="seam" id="seam" aria-hidden="true">
        <svg className="seam-pattern" width="100%" height="100%" focusable="false">
          <defs>
            <pattern id={seamPatternId} width={SEAM_COLUMNS * SEAM_COLUMN_WIDTH} height={8 * SEAM_ROW_HEIGHT} patternUnits="userSpaceOnUse">
              {SEAM_GLYPHS.map(({ key, x, y, base }) => <text key={key} x={x} y={y}>{base}</text>)}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${seamPatternId})`} />
        </svg>
      </div>
    </>
  );
}
