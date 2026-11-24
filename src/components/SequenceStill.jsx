import { memo } from 'react';
import { buildSequenceLayout, sampleRingGlyph, registrationPoints, GLYPHS } from '../lib/sequence-field.js';

const round = (value) => Math.round(value * 100) / 100;
const compositions = [[1440, 750], [390, 360]].map(([width, height]) => {
  const layout = buildSequenceLayout(width, height);
  return {
    ...layout,
    registration: registrationPoints(layout),
    glyphs: layout.rings.flatMap(ring => ring.glyphs
      .filter(glyph => glyph.opacity)
      .map(glyph => sampleRingGlyph(glyph, ring, layout))),
  };
});

export default memo(function SequenceStill() {
  return (
    <div className="hero-fallback" aria-hidden="true">
      {compositions.map(({ width, height, mobile, center, rings, gap, registration, glyphs }) => (
        <svg key={width} className={mobile ? 'sequence-still-mobile' : 'sequence-still-desktop'}
          viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" focusable="false">
          <g fill="none" stroke="#efeee7" strokeWidth=".65" strokeDasharray=".6 7" opacity=".13">
            {rings.map(ring => <circle key={ring.index} cx={center.x} cy={center.y} r={ring.radius + gap * .47} />)}
          </g>
          <path d={`M ${registration[0].x} ${registration[0].y} L ${registration[1].x} ${registration[1].y}`}
            fill="none" stroke="#d5ed9b" strokeWidth=".7" opacity=".29" />
          <g stroke="#d5ed9b" strokeWidth=".7" opacity=".42">
            {[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy], index) => (
              <path key={index} d={`M ${center.x + dx * 8} ${center.y + dy * 8} L ${center.x + dx * 15} ${center.y + dy * 15}`} />
            ))}
            <rect x={center.x - 1.5} y={center.y - 1.5} width="3" height="3" fill="#d5ed9b" stroke="none" />
          </g>
          <g fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace" textAnchor="middle" dominantBaseline="central">
            {glyphs.map(({ x, y, size, opacity, rotation, base, accent }, index) => (
              <text key={index} transform={`translate(${round(x)} ${round(y)}) rotate(${round(rotation * 180 / Math.PI)})`}
                fontSize={round(size)} opacity={round(opacity)} fill={accent ? '#d5ed9b' : '#efeee7'}>{GLYPHS[base]}</text>
            ))}
          </g>
        </svg>
      ))}
    </div>
  );
});
