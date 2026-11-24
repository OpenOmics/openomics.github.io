import { useId } from 'react';

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

export default function NucleotideSeam({ id }) {
  const seamPatternId = useId();
  return (
      <div className="seam" id={id} aria-hidden="true">
        <svg className="seam-pattern" width="100%" height="100%" focusable="false">
          <defs>
            <pattern id={seamPatternId} width={SEAM_COLUMNS * SEAM_COLUMN_WIDTH} height={8 * SEAM_ROW_HEIGHT} patternUnits="userSpaceOnUse">
              {SEAM_GLYPHS.map(({ key, x, y, base }) => <text key={key} x={x} y={y}>{base}</text>)}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${seamPatternId})`} />
        </svg>
      </div>
  );
}
