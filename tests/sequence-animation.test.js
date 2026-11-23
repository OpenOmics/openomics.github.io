import test from 'node:test';
import assert from 'node:assert/strict';
import { attachSequenceAnimation } from '../src/lib/sequence-animation.js';

function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, event = {}) { for (const callback of [...(listeners.get(type) || [])]) callback(event); },
    listenerCount() { return [...listeners.values()].reduce((count, group) => count + group.size, 0); },
  };
}

// This harness supplies browser scheduling/events and a recording drawing
// context. It exercises the real renderer and lifecycle together without React,
// timers, network access, or a simulated copy of the animation implementation.
function harness({ reducedMotion = false, unavailable = false, getContextThrows = false, atlasUnavailable = false } = {}) {
  let clock = 0;
  let nextFrame = 1;
  let drawingFails = false;
  let bounds = { width: 390, height: 960 };
  const queue = new Map();
  const states = [];
  const observers = { resize: [], intersection: [] };
  const painted = { frames: 0, glyphs: 0, signature: 0 };
  const preference = { ...events(), matches: reducedMotion };
  const document = {
    ...events(),
    hidden: false,
    createElement() {
      return { width: 0, height: 0, getContext: () => atlasUnavailable ? null : ({ fillText() {} }) };
    },
  };
  const observer = (kind) => class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers[kind].push(this);
    }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  const view = {
    ...events(),
    devicePixelRatio: 2,
    matchMedia: () => preference,
    requestAnimationFrame(callback) {
      const id = nextFrame++;
      queue.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { queue.delete(id); },
    ResizeObserver: observer('resize'),
    IntersectionObserver: observer('intersection'),
  };
  document.defaultView = view;
  let transform = { x: 0, y: 0, rotation: 0 };
  const transforms = [];
  const context = {
    globalAlpha: 1,
    setTransform() {},
    clearRect() { painted.frames += 1; painted.signature = 0; },
    drawImage(_image, ...coordinates) {
      if (drawingFails) throw new Error('Rendering is unavailable');
      painted.glyphs += 1;
      // Include transform state: glyph-local draw coordinates stay constant
      // while the ring renderer translates and rotates each character.
      for (const value of [...coordinates, this.globalAlpha, transform.x, transform.y, transform.rotation]) {
        painted.signature = (painted.signature * 31 + Math.round(value * 10000)) % 2147483647;
      }
    },
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    arc() {}, setLineDash() {},
    save() { transforms.push({ ...transform, alpha: this.globalAlpha }); },
    restore() {
      const saved = transforms.pop();
      if (!saved) return;
      transform = { x: saved.x, y: saved.y, rotation: saved.rotation };
      this.globalAlpha = saved.alpha;
    },
    translate(x, y) {
      transform.x += Math.cos(transform.rotation) * x - Math.sin(transform.rotation) * y;
      transform.y += Math.sin(transform.rotation) * x + Math.cos(transform.rotation) * y;
    },
    rotate(angle) { transform.rotation += angle; },
  };
  const canvas = {
    width: 0,
    height: 0,
    ownerDocument: document,
    getBoundingClientRect: () => bounds,
    getContext() {
      if (getContextThrows) throw new Error('Context creation is unavailable');
      return unavailable ? null : context;
    },
  };
  context.canvas = canvas;
  const controller = attachSequenceAnimation(canvas, (state) => states.push(state));
  return {
    canvas, controller, painted, states, observers, preference, view, document,
    latest: () => states.at(-1),
    pending: () => queue.size,
    step(milliseconds = 100) {
      clock += milliseconds;
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback(clock);
    },
    advance(milliseconds) {
      for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) this.step(Math.min(100, milliseconds - elapsed));
    },
    intersect(isIntersecting) {
      observers.intersection[0].callback([{ isIntersecting }]);
    },
    hide(hidden) { document.hidden = hidden; document.emit('visibilitychange'); },
    preferReduced(matches) { preference.matches = matches; preference.emit('change', { matches }); },
    resize(width, height) {
      bounds = { width, height };
      observers.resize[0].callback();
    },
    failDrawing() { drawingFails = true; },
  };
}

test('reveal can pause, resume, complete once, and replay', (t) => {
  const h = harness();
  t.after(() => h.controller.destroy());
  assert.deepEqual(h.latest(), { mode: 'playing', available: true });
  assert.ok(h.painted.glyphs > 0, 'ready state has actually painted artwork');
  assert.equal(h.pending(), 1);
  const initial = h.painted.signature;
  h.advance(600);
  assert.notEqual(h.painted.signature, initial, 'the reveal changes the rendered composition');
  h.controller.toggle();
  assert.equal(h.latest().mode, 'paused');
  assert.equal(h.pending(), 0);
  const paused = { ...h.painted };
  h.advance(30000);
  assert.deepEqual(h.painted, paused, 'paused artwork performs no drawing');
  h.controller.toggle();
  assert.equal(h.latest().mode, 'playing');
  h.step();
  assert.equal(h.painted.signature, paused.signature, 'resuming does not advance through the paused interval');
  h.advance(300);
  assert.notEqual(h.painted.signature, paused.signature);
  h.advance(9000);
  assert.equal(h.latest().mode, 'complete');
  assert.equal(h.pending(), 0, 'completion stops scheduling frames');
  const complete = { ...h.painted };
  h.advance(30000);
  assert.deepEqual(h.painted, complete, 'the complete sequence holds without an idle animation loop');
  h.controller.toggle();
  assert.equal(h.latest().mode, 'playing');
  assert.equal(h.painted.signature, initial, 'replay returns to the original ring positions');
  assert.equal(h.pending(), 1);
});

test('reduced motion paints the complete artwork without autoplay but permits explicit play', (t) => {
  const h = harness({ reducedMotion: true });
  t.after(() => h.controller.destroy());
  assert.deepEqual(h.latest(), { mode: 'reduced', available: true });
  assert.ok(h.painted.glyphs > 0);
  assert.equal(h.pending(), 0);
  const still = { ...h.painted };
  h.advance(10000);
  assert.deepEqual(h.painted, still);
  h.controller.toggle();
  assert.equal(h.latest().mode, 'playing');
  assert.notEqual(h.painted.signature, still.signature);
  assert.equal(h.pending(), 1);
  h.advance(500);
  h.controller.toggle();
  assert.equal(h.latest().mode, 'paused');
  assert.equal(h.pending(), 0);
  h.preferReduced(true);
  assert.equal(h.latest().mode, 'reduced');
  assert.equal(h.painted.signature, still.signature, 'changing preference restores the composed still');
  h.preferReduced(false);
  assert.equal(h.latest().mode, 'complete');
  assert.equal(h.pending(), 0, 'removing reduced motion does not unexpectedly restart a finished reveal');
});

test('offscreen and hidden-tab time does not advance the reveal', (t) => {
  const h = harness();
  t.after(() => h.controller.destroy());
  h.advance(500);
  h.intersect(false);
  assert.equal(h.pending(), 0);
  const outside = { ...h.painted };
  h.advance(30000);
  assert.deepEqual(h.painted, outside);
  h.hide(true);
  h.intersect(true);
  assert.equal(h.pending(), 0, 'an intersecting hero still stays suspended in a hidden tab');
  h.hide(false);
  assert.equal(h.pending(), 1);
  h.step();
  assert.equal(h.painted.signature, outside.signature, 'visibility restoration preserves reveal progress');
  h.advance(300);
  assert.equal(h.latest().mode, 'playing');
  assert.notEqual(h.painted.signature, outside.signature);
  h.hide(true);
  assert.equal(h.pending(), 0);
  const hidden = { ...h.painted };
  h.advance(30000);
  assert.deepEqual(h.painted, hidden);
});

test('resize keeps a paused frame paused and uses bounded display resolution', (t) => {
  const h = harness();
  t.after(() => h.controller.destroy());
  assert.equal(h.canvas.width, 585);
  assert.equal(h.canvas.height, 1440);
  h.advance(500);
  h.controller.toggle();
  h.resize(1440, 900);
  assert.equal(h.latest().mode, 'paused');
  assert.equal(h.canvas.width, 2160, 'high-density displays use the configured pixel-ratio cap');
  assert.equal(h.pending(), 0);
  const afterResize = h.painted.frames;
  h.resize(1440, 900);
  assert.equal(h.painted.frames, afterResize, 'unchanged bounds do not reconstruct or redraw the artwork');
});

test('destroy removes scheduling, observers, listeners, and further control effects', () => {
  const h = harness();
  h.advance(500);
  h.controller.destroy();
  assert.equal(h.pending(), 0);
  assert.equal(h.preference.listenerCount(), 0);
  assert.equal(h.document.listenerCount(), 0);
  assert.equal(h.view.listenerCount(), 0);
  assert.ok([...h.observers.resize, ...h.observers.intersection].every((observer) => observer.disconnected));
  const stopped = { ...h.painted };
  const notifications = h.states.length;
  h.controller.toggle();
  h.advance(30000);
  h.preferReduced(true);
  h.hide(true);
  h.resize(1000, 800);
  h.intersect(true);
  h.controller.destroy();
  assert.deepEqual(h.painted, stopped);
  assert.equal(h.states.length, notifications, 'no state updates escape after cleanup');
  assert.equal(h.pending(), 0);
});

test('unavailable canvas contexts leave the fallback usable without registering work', () => {
  for (const options of [{ unavailable: true }, { getContextThrows: true }]) {
    const h = harness(options);
    assert.deepEqual(h.states, [{ mode: 'unavailable', available: false }]);
    assert.equal(h.pending(), 0);
    assert.equal(h.painted.frames, 0);
    assert.equal(h.preference.listenerCount(), 0);
    assert.equal(h.document.listenerCount(), 0);
    h.controller.toggle();
    h.controller.destroy();
    assert.equal(h.states.length, 1);
  }
  const states = [];
  const controls = attachSequenceAnimation(null, (state) => states.push(state));
  assert.deepEqual(states, [{ mode: 'unavailable', available: false }]);
  assert.doesNotThrow(() => { controls.toggle(); controls.destroy(); });
});

test('a drawing failure switches back to fallback and stops playback', (t) => {
  const h = harness();
  t.after(() => h.controller.destroy());
  h.failDrawing();
  h.step();
  assert.deepEqual(h.latest(), { mode: 'unavailable', available: false });
  assert.equal(h.pending(), 0);
  const frames = h.painted.frames;
  h.controller.toggle();
  h.advance(10000);
  assert.equal(h.painted.frames, frames);
});

test('glyph-cache allocation failure does not mark an empty canvas ready', (t) => {
  const h = harness({ atlasUnavailable: true });
  t.after(() => h.controller.destroy());
  assert.deepEqual(h.latest(), { mode: 'unavailable', available: false });
  assert.equal(h.pending(), 0);
  assert.equal(h.painted.glyphs, 0);
  assert.equal(h.states.some((state) => state.available), false, 'the SVG fallback is never hidden before successful drawing');
});
