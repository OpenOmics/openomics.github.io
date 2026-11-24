import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSequenceLayout, createSequenceField, sampleRingGlyph, sampleRingRotation,
  GLYPHS, REVEAL_DURATION,
} from '../src/lib/sequence-field.js';

function recordingContext() {
  const frames = [];
  let cachedCharacters = 0;
  let transform = { x: 0, y: 0, rotation: 0 };
  const stack = [];
  const document = {
    createElement() {
      return { width: 0, height: 0, getContext: () => ({ fillText: () => { cachedCharacters += 1; } }) };
    },
  };
  const context = {
    canvas: { ownerDocument: document },
    globalAlpha: 1,
    clearRect() { frames.length = 0; },
    drawImage(_canvas, ...coordinates) {
      frames.push([...coordinates, this.globalAlpha, transform.x, transform.y, transform.rotation]);
    },
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    arc() {}, setLineDash() {},
    save() { stack.push({ ...transform, alpha: this.globalAlpha }); },
    restore() {
      const saved = stack.pop();
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
  return { context, frames, cachedCharacters: () => cachedCharacters };
}

const approximately = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 1e-8,
  `${message}: expected ${expected}, received ${actual}`,
);

test('sequence rings stay bounded and deterministic across mobile and wide displays', () => {
  assert.equal(GLYPHS, 'ACGT', 'The artwork uses nucleotide sequences');
  for (const width of [320, 390, 768, 1440, 2560, 5120]) {
    const layout = buildSequenceLayout(width, 960);
    assert.deepEqual(layout, buildSequenceLayout(width, 960));
    assert.ok(layout.rings.length > 1, 'The composition contains concentric rings');
    const count = layout.rings.reduce((sum, ring) => sum + ring.glyphs.length, 0);
    assert.ok(count > 0 && count < 5000, 'The character pool is bounded');
    if (layout.mobile) assert.ok(count < 1500, 'Mobile uses a smaller character pool');
    assert.ok(Number.isFinite(layout.center.x) && Number.isFinite(layout.center.y));
    assert.ok(Number.isFinite(layout.targetAngle));
    assert.ok(layout.maxRadius > 0 && layout.maxRadius <= Math.max(width, 960));
    const radii = layout.rings.map(({ radius }) => radius);
    assert.equal(new Set(radii).size, radii.length, 'Each concentric ring has a distinct radius');
    for (const ring of layout.rings) {
      assert.ok(ring.radius > 0 && ring.radius <= layout.maxRadius);
      assert.ok(ring.size > 0 && ring.glyphs.length > 3);
      assert.ok(ring.opacity > 0 && ring.opacity <= 1);
      assert.ok(ring.settleAt > 0 && ring.settleAt <= 1);
      for (const glyph of ring.glyphs) {
        assert.ok(Number.isInteger(glyph.base) && glyph.base >= 0 && glyph.base < GLYPHS.length);
        const sample = sampleRingGlyph(glyph, ring, layout, 1);
        assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.y));
      }
    }
  }
  for (const [width, height] of [[0, 800], [NaN, 800], [390, 0], [390, Infinity]]) {
    const invalid = buildSequenceLayout(width, height);
    assert.deepEqual(invalid.rings, []);
    assert.equal(invalid.center, null);
  }
});

test('glyphs rotate together on fixed concentric rings and finish on one registration axis', () => {
  for (const width of [390, 768, 1440]) {
    const layout = buildSequenceLayout(width, 850);
    for (const ring of layout.rings) {
      assert.ok(Math.abs(ring.startRotation) > 0, 'Every ring has a visible initial offset');
      for (const progress of [0, .25, .5, .75, 1]) {
        const rotation = sampleRingRotation(ring, progress);
        for (const glyph of ring.glyphs) {
          const sample = sampleRingGlyph(glyph, ring, layout, progress);
          const angle = layout.targetAngle + glyph.angle + rotation;
          approximately(sample.x, layout.center.x + Math.cos(angle) * ring.radius, 'Glyphs retain the ring radius and shared rotation');
          approximately(sample.y, layout.center.y + Math.sin(angle) * ring.radius, 'Glyphs retain the ring radius and shared rotation');
          assert.equal(sample.base, glyph.base, 'Sequence identities remain stable while rotating');
        }
      }
      approximately(sampleRingRotation(ring, 0), ring.startRotation, 'The reveal starts at the planned ring offset');
      assert.equal(Math.abs(sampleRingRotation(ring, 1)), 0, 'The final ring offset is zero');
      const marker = sampleRingGlyph(ring.glyphs[0], ring, layout, 1);
      approximately(marker.x, layout.center.x + Math.cos(layout.targetAngle) * ring.radius, 'Each first base shares the registration axis');
      approximately(marker.y, layout.center.y + Math.sin(layout.targetAngle) * ring.radius, 'Each first base shares the registration axis');
    }
  }
});

test('ring rotation slows into alignment without a wrap or reset', () => {
  const { rings } = buildSequenceLayout(1440, 850);
  assert.ok(rings.some(({ startRotation }) => startRotation > 0));
  assert.ok(rings.some(({ startRotation }) => startRotation < 0), 'The composition includes restrained counter-rotation');
  for (const ring of rings) {
    let remaining = Math.abs(ring.startRotation);
    for (let frame = 0; frame <= 80; frame += 1) {
      const rotation = sampleRingRotation(ring, frame / 80);
      assert.ok(Math.abs(rotation) <= remaining + 1e-10, 'Every frame approaches alignment continuously');
      assert.ok(rotation * ring.startRotation >= 0, 'A ring never jumps past alignment');
      remaining = Math.abs(rotation);
    }
    const travel = (from, to) => Math.abs(sampleRingRotation(ring, from * ring.settleAt) - sampleRingRotation(ring, to * ring.settleAt));
    assert.ok(travel(.9, 1) < travel(.45, .55), 'Rotation slows near the final alignment');
    assert.equal(Math.abs(sampleRingRotation(ring, ring.settleAt)), 0, 'Each ring reaches its own settling time');
    assert.equal(Math.abs(sampleRingRotation(ring, 2)), 0, 'The settled offset does not wrap or restart');
  }
});

test('glyphs are cached once and drawing settles without further movement', () => {
  const spy = recordingContext();
  const field = createSequenceField(spy.context, { width: 390, height: 960, pixelRatio: 1.5 });
  assert.equal(spy.cachedCharacters(), 8);
  field.draw(0);
  const start = spy.frames.map(entry => [...entry]);
  field.draw(REVEAL_DURATION / 2);
  const middle = spy.frames.map(entry => [...entry]);
  field.draw(REVEAL_DURATION);
  const end = spy.frames.map(entry => [...entry]);
  assert.notDeepEqual(start, middle, 'The rotation is visible by the midpoint');
  assert.notDeepEqual(middle, end, 'Rings continue into their final alignment');
  field.draw(REVEAL_DURATION + 100);
  assert.deepEqual(spy.frames, end);
  assert.equal(spy.cachedCharacters(), 8, 'Animation never re-rasterizes text');
  field.dispose();
  field.draw(1);
  assert.deepEqual(spy.frames, end, 'Disposed instances do no further drawing');
});

test('reduced-motion artwork immediately uses the same complete composition', () => {
  const normal = recordingContext();
  const reduced = recordingContext();
  createSequenceField(normal.context, { width: 1440, height: 800 }).draw(REVEAL_DURATION);
  createSequenceField(reduced.context, { width: 1440, height: 800, reducedMotion: true }).draw(0);
  assert.deepEqual(reduced.frames, normal.frames);
});
