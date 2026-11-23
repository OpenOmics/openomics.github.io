import { createSequenceField, REVEAL_DURATION } from './sequence-field.js';

// React state changes only at user actions, preference changes, or completion.
// Time spent paused, offscreen, or in a hidden tab never advances the reveal.
export function attachSequenceAnimation(canvas, onState) {
  const noControls = { toggle() {}, destroy() {} };
  let context;
  try { context = canvas?.getContext('2d'); } catch { /* Keep the SVG fallback. */ }
  if (!context) {
    onState({ mode: 'unavailable', available: false });
    return noControls;
  }
  const view = canvas.ownerDocument.defaultView;
  const document = canvas.ownerDocument;
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  let mode = preference.matches ? 'reduced' : 'playing';
  let elapsed = preference.matches ? REVEAL_DURATION : 0;
  let field = null;
  let frame = null;
  let lastTime = null;
  let lastDraw = -Infinity;
  let inView = true;
  let disposed = false;
  let failed = false;
  let size = '';

  function publish() {
    if (!disposed) onState({ mode, available: Boolean(field) && !failed });
  }
  function cancel() {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    lastDraw = -Infinity;
  }
  function draw() {
    if (disposed || failed || !field) return;
    try { field.draw(elapsed); }
    catch {
      failed = true;
      mode = 'unavailable';
      cancel();
      field.dispose?.();
      field = null;
      publish();
    }
  }
  function animate(time) {
    frame = null;
    if (disposed || failed || mode !== 'playing' || !inView || document.hidden) return;
    if (lastTime !== null) elapsed = Math.min(REVEAL_DURATION, elapsed + Math.min((time - lastTime) / 1000, .1));
    lastTime = time;
    if (time - lastDraw >= 1000 / 30 || elapsed >= REVEAL_DURATION) {
      draw();
      lastDraw = time;
    }
    if (failed) return;
    if (elapsed >= REVEAL_DURATION) {
      mode = 'complete';
      lastTime = null;
      publish();
      return;
    }
    frame = view.requestAnimationFrame(animate);
  }
  function synchronize() {
    cancel();
    if (!disposed && !failed && field && mode === 'playing' && inView && !document.hidden) {
      frame = view.requestAnimationFrame(animate);
    }
  }
  function resize() {
    if (disposed || failed) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    if (!width || !height) return;
    const pixelRatio = Math.min(view.devicePixelRatio || 1, 1.5);
    const nextSize = `${width}/${height}/${pixelRatio}`;
    if (nextSize === size) return;
    size = nextSize;
    cancel();
    field?.dispose?.();
    try {
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      // Preference is represented by elapsed time so users may explicitly play.
      field = createSequenceField(context, { width, height, pixelRatio });
      draw();
      publish();
      synchronize();
    } catch {
      failed = true;
      mode = 'unavailable';
      field?.dispose?.();
      field = null;
      publish();
    }
  }
  function preferenceChanged(event) {
    if (event.matches) { elapsed = REVEAL_DURATION; mode = 'reduced'; }
    else if (mode === 'reduced') mode = 'complete';
    draw();
    publish();
    synchronize();
  }
  const resizeObserver = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : null;
  const intersectionObserver = typeof view.IntersectionObserver === 'function'
    ? new view.IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      synchronize();
    }, { threshold: .01 }) : null;
  preference.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', synchronize);
  view.addEventListener('resize', resize);
  resizeObserver?.observe(canvas);
  intersectionObserver?.observe(canvas);
  resize();
  return {
    toggle() {
      if (disposed || failed) return;
      if (mode === 'playing') mode = 'paused';
      else if (mode === 'paused') mode = 'playing';
      else { elapsed = 0; mode = 'playing'; draw(); }
      publish();
      synchronize();
    },
    destroy() {
      disposed = true;
      cancel();
      preference.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', synchronize);
      view.removeEventListener('resize', resize);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      field?.dispose?.();
      field = null;
    },
  };
}
