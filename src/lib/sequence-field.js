/**
 * Concentric nucleotide tracks rotate independently, then register on one axis.
 * Canvas and the server-rendered still share this deterministic geometry.
 * This is an illustrative sequence study, not an analysis of biological data.
 */
export const REVEAL_DURATION = 8;
export const GLYPHS = 'ACGT';
const TAU = Math.PI * 2;
const SEQUENCES = ['ATGCTAGCCGTAACGT', 'ATGCAACGTTGCCGAT', 'ATGCTTCGAGACGTCA', 'ATGCGATCCGTAAGCT'];
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const random = (index, salt = 0) => {
  const n = Math.sin(index * 127.1 + salt * 311.7 + 19.23) * 43758.5453;
  return n - Math.floor(n);
};

export function buildSequenceLayout(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { rings: [], center: null, mobile: false };
  }
  const mobile = width <= 720;
  const center = { x: width * (mobile ? .5 : .80), y: height * (mobile ? .50 : .52) };
  const targetAngle = Math.PI * .87;
  const maxRadius = mobile ? Math.min(width * .72, 340) : Math.min(width * .68, 920);
  const ringCount = mobile ? 9 : 21;
  const innerRadius = mobile ? 30 : 48;
  const gap = (maxRadius - innerRadius) / (ringCount - 1);
  const rings = Array.from({ length: ringCount }, (_, index) => {
    const depth = index / (ringCount - 1);
    const radius = innerRadius + gap * index;
    const size = mobile ? 8.5 + depth * 3.5 : 10 + depth * 7;
    const count = Math.min(mobile ? 146 : 290, Math.round(TAU * radius / (size * 1.05)));
    const sequence = SEQUENCES[index % SEQUENCES.length];
    // A little open space between sequence fragments echoes the reference's
    // typeset rings. Gaps belong to their track; they never flicker or reset.
    const glyphs = Array.from({ length: count }, (_, column) => {
      const motif = column < 3;
      const gap = column >= 4 && (column % 19 > 15 || (random(index * 400 + column, 7) > .94));
      return {
        index: column,
        base: GLYPHS.indexOf(sequence[column % sequence.length]),
        angle: column / count * TAU,
        accent: motif,
        opacity: gap ? 0 : .68 + random(index * 400 + column, 11) * .32,
      };
    });
    return {
      index, radius, size, glyphs,
      opacity: .50 + depth * .26,
      startRotation: (index % 2 ? -1 : 1) * (.8 + random(index, 3) * 1.15),
      settleAt: .78 + depth * .22,
    };
  });
  return { rings, center, targetAngle, maxRadius, gap, width, height, mobile };
}

export function sampleRingRotation(ring, progress = 1) {
  const p = clamp(progress / ring.settleAt);
  // Quintic easing starts and ends at rest, with no loop or angle wrap.
  const ease = p * p * p * (p * (p * 6 - 15) + 10);
  return ring.startRotation * (1 - ease);
}

export function sampleRingGlyph(glyph, ring, layout, progress = 1) {
  const angle = layout.targetAngle + glyph.angle + sampleRingRotation(ring, progress);
  const x = layout.center.x + Math.cos(angle) * ring.radius;
  const y = layout.center.y + Math.sin(angle) * ring.radius;
  // Keep a generous quiet area for the HTML headline and actions. This mask
  // is spatial, so it stays still while the type rotates through it.
  const quiet = layout.mobile ? 1 : 1 - (1 - smooth((x / layout.width - .61) / .14)) * (1 - smooth((y / layout.height - .61) / .17));
  const captionStart = layout.width <= 1080 ? .40 : .62;
  const caption = layout.mobile ? 1 : 1 - smooth((x / layout.width - captionStart) / .15) * smooth((y / layout.height - .83) / .10);
  const edge = smooth((y - (layout.mobile ? 0 : 58)) / (layout.mobile ? 28 : 68)) * smooth((layout.height - y) / 45);
  return {
    x, y, angle,
    rotation: angle + Math.PI / 2,
    size: ring.size,
    opacity: (glyph.accent ? .92 : ring.opacity) * glyph.opacity * quiet * caption * edge,
    accent: glyph.accent,
    base: glyph.base,
  };
}

// These fixed geometry helpers also draw the aligned SSR composition.
export function registrationPoints(layout) {
  return [layout.rings[0].radius - 13, layout.maxRadius + 16].map(radius => ({
    x: layout.center.x + Math.cos(layout.targetAngle) * radius,
    y: layout.center.y + Math.sin(layout.targetAngle) * radius,
  }));
}

function makeAtlas(context, pixelRatio) {
  const document = context.canvas?.ownerDocument;
  if (!document?.createElement) return null;
  const canvas = document.createElement('canvas');
  const ratio = clamp(pixelRatio, 1, 1.5);
  const cell = Math.ceil(32 * ratio);
  canvas.width = cell * GLYPHS.length;
  canvas.height = cell * 2;
  const painter = canvas.getContext('2d');
  if (!painter) return null;
  painter.textAlign = 'center';
  painter.textBaseline = 'middle';
  painter.font = `${24 * ratio}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ['#efeee7', '#d5ed9b'].forEach((color, palette) => {
    painter.fillStyle = color;
    for (let character = 0; character < GLYPHS.length; character += 1) {
      painter.fillText(GLYPHS[character], character * cell + cell / 2, palette * cell + cell / 2);
    }
  });
  return { canvas, cell };
}

export function createSequenceField(context, { width, height, pixelRatio = 1, reducedMotion = false }) {
  const layout = buildSequenceLayout(width, height);
  const atlas = layout.rings.length ? makeAtlas(context, pixelRatio) : null;
  if (layout.rings.length && !atlas) throw new Error('Sequence glyph canvas is unavailable');
  let disposed = false;
  function glyph(base, accent, x, y, size, alpha, rotation = 0) {
    if (alpha <= .005) return;
    const cellSize = size * (32 / 24);
    context.globalAlpha = alpha;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.drawImage(atlas.canvas, base * atlas.cell, (accent ? 1 : 0) * atlas.cell,
      atlas.cell, atlas.cell, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
    context.restore();
  }
  function drawRegistration(progress) {
    const [start, end] = registrationPoints(layout);
    context.strokeStyle = '#d5ed9b';
    context.lineWidth = .7;
    context.globalAlpha = .10 + smooth((progress - .55) / .45) * .19;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    // A small central crosshair stays stationary while the rings turn.
    const { x, y } = layout.center;
    context.globalAlpha = .42;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      context.beginPath();
      context.moveTo(x + dx * 8, y + dy * 8);
      context.lineTo(x + dx * 15, y + dy * 15);
      context.stroke();
    }
    context.fillStyle = '#d5ed9b';
    context.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  function drawTracks() {
    context.strokeStyle = '#efeee7';
    context.lineWidth = .65;
    context.globalAlpha = .13;
    context.setLineDash([.6, 7]);
    for (const ring of layout.rings) {
      context.beginPath();
      context.arc(layout.center.x, layout.center.y, ring.radius + layout.gap * .47, 0, TAU);
      context.stroke();
    }
    context.setLineDash([]);
  }
  return {
    draw(elapsedSeconds = 0) {
      if (disposed || !atlas) return;
      const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
      const progress = reducedMotion ? 1 : clamp(elapsed / REVEAL_DURATION);
      context.clearRect(0, 0, width, height);
      drawTracks();
      drawRegistration(progress);
      for (const ring of layout.rings) {
        for (const character of ring.glyphs) {
          if (!character.opacity) continue;
          const state = sampleRingGlyph(character, ring, layout, progress);
          if (state.x < -24 || state.x > width + 24 || state.y < -24 || state.y > height + 24) continue;
          glyph(state.base, state.accent, state.x, state.y, state.size, state.opacity, state.rotation);
        }
      }
      context.globalAlpha = 1;
    },
    dispose() {
      disposed = true;
      if (atlas) { atlas.canvas.width = 0; atlas.canvas.height = 0; }
    },
  };
}
