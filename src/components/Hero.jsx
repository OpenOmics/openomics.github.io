import { useEffect, useRef, useState } from 'react';
import RollingText from './RollingText.jsx';
import NucleotideSeam from './NucleotideSeam.jsx';
import SequenceStill from './SequenceStill.jsx';
import { attachSequenceAnimation } from '../lib/sequence-animation.js';

export default function Hero({ pipelineHref = '/pipelines/' }) {
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
              <span>Start decoding</span>
              <span className="second"><em>Complex biology</em></span>
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
            <div className="hero-legend" aria-hidden="true"></div>
            <div className="art-caption">
              <span className="sr">Concentric rings of A, C, G, and T nucleotide sequences rotate independently, then slow to align their highlighted sequence markers along a common axis.</span>
              <button className="motion-button" id="motion" type="button"
                aria-pressed={motion.mode !== 'playing'} hidden={!motion.available}
                onClick={() => controls.current?.toggle()}>
                <svg className="motion-icon" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true" focusable="false">
                  {motion.mode === 'playing' ? (
                    <path d="M8 5v14M16 5v14" />
                  ) : (
                    <path d="m8 5 11 7-11 7Z" />
                  )}
                </svg>
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
      <NucleotideSeam id="seam" />
    </>
  );
}
