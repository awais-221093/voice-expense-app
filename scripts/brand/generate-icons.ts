// Generates every app icon / splash / logo PNG from one SVG mark ("the talking coin":
// a microphone whose head is a gold coin, with sound waves). Run: npm run icons
// Optional: npm run icons -- --preview <dir>  writes preview.png (masks, sizes, mono) for review.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(__dirname, '..', '..', 'assets', 'images');
const TEAL = '#0F766E';
const TEAL_LIGHT = '#16A394';
const GOLD = '#FBBF24';
const GOLD_DARK = '#B45309';
const WHITE = '#FFFFFF';

// All geometry is on a 1024 canvas. The adaptive-icon safe zone is a circle of radius ~313 around
// the centre (66/108 of the canvas); everything below stays within ~290 of (512, 512).
const HEAD = { x: 512, y: 410, r: 150 };

/** An arc around the coin centre, from angle a to b (degrees, 0 = right, clockwise). */
function arc(r: number, a: number, b: number): string {
  const p = (deg: number) => {
    const t = (deg * Math.PI) / 180;
    return `${(HEAD.x + r * Math.cos(t)).toFixed(1)} ${(HEAD.y + r * Math.sin(t)).toFixed(1)}`;
  };
  return `M ${p(a)} A ${r} ${r} 0 0 1 ${p(b)}`;
}

const stroke = (d: string, color: string, width: number) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

/** Sound waves, mic holder, stem and base: everything white. */
function body(color: string): string {
  const waves = [
    [220, 30],
    [282, 24],
  ]
    .flatMap(([r, half]) => [arc(r, 180 - half, 180 + half), arc(r, -half, half)])
    .map((d) => stroke(d, color, 30))
    .join('');
  const holder = stroke(`M 342 440 A 170 170 0 0 0 682 440`, color, 34);
  const stem = stroke(`M 512 610 L 512 690`, color, 34);
  const base = stroke(`M 430 700 L 594 700`, color, 34);
  return waves + holder + stem + base;
}

/** The coin head: gold disc, thin inner rim, three grille lines. */
function coin(): string {
  const { x, y, r } = HEAD;
  const grille = [-42, 0, 42]
    .map((dy, i) => {
      const half = i === 1 ? 62 : 48;
      return stroke(`M ${x - half} ${y + dy} L ${x + half} ${y + dy}`, GOLD_DARK, 16);
    })
    .join('');
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r - 22}" fill="none" stroke="${GOLD_DARK}" stroke-opacity="0.45" stroke-width="8"/>` +
    grille
  );
}

/** One flat silhouette for Android 13+ themed icons: the coin details become cut-outs. */
function monochrome(): string {
  const { x, y, r } = HEAD;
  const cuts = [-42, 0, 42]
    .map((dy, i) => {
      const half = i === 1 ? 62 : 48;
      return stroke(`M ${x - half} ${y + dy} L ${x + half} ${y + dy}`, 'black', 16);
    })
    .join('');
  return (
    `<mask id="m"><rect width="1024" height="1024" fill="white"/>` +
    `<circle cx="${x}" cy="${y}" r="${r - 22}" fill="none" stroke="black" stroke-width="8"/>${cuts}</mask>` +
    `<g mask="url(#m)"><circle cx="${x}" cy="${y}" r="${r}" fill="${WHITE}"/></g>` +
    body(WHITE)
  );
}

const mark = () => body(WHITE) + coin();

/** Teal with a slight radial lift in the centre. */
const background = (shape = `<rect width="1024" height="1024" fill="url(#bg)"/>`) =>
  `<defs><radialGradient id="bg" cx="50%" cy="42%" r="70%">` +
  `<stop offset="0" stop-color="${TEAL_LIGHT}"/><stop offset="1" stop-color="${TEAL}"/>` +
  `</radialGradient></defs>${shape}`;

const svg = (inner: string, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;

function png(svgText: string, width: number): Buffer {
  return new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

const OUTPUTS: { file: string; size: number; svg: string }[] = [
  { file: 'icon.png', size: 1024, svg: svg(background() + mark()) },
  { file: 'android-icon-foreground.png', size: 1024, svg: svg(mark()) },
  { file: 'android-icon-background.png', size: 1024, svg: svg(background()) },
  { file: 'android-icon-monochrome.png', size: 1024, svg: svg(monochrome()) },
  { file: 'splash-icon.png', size: 1024, svg: svg(mark()) },
  // In-app logo (sign-in): the white mark needs the teal behind it on a light background.
  {
    file: 'logo.png',
    size: 512,
    svg: svg(background(`<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>`) + mark()),
  },
];

for (const o of OUTPUTS) {
  writeFileSync(join(OUT, o.file), png(o.svg, o.size));
  console.log(`assets/images/${o.file}  ${o.size}px`);
}

// Review sheet: circle + squircle masks at 192 and 48 px, themed mono, splash on teal.
const previewDir = process.argv.indexOf('--preview');
if (previewDir > -1) {
  const dir = process.argv[previewDir + 1];
  mkdirSync(dir, { recursive: true });
  const icon = (clip: string, x: number, y: number, size: number, inner: string) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1024 1024">` +
    `<defs><clipPath id="c${x}${y}">${clip}</clipPath></defs><g clip-path="url(#c${x}${y})">${inner}</g></svg>`;
  const circle = `<circle cx="512" cy="512" r="512"/>`;
  const squircle = `<rect width="1024" height="1024" rx="300"/>`;
  const full = background() + mark();
  const mono = `<rect width="1024" height="1024" fill="#1F2937"/>` + monochrome();
  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="420"><rect width="1000" height="420" fill="#E5E7EB"/>` +
    icon(circle, 20, 20, 192, full) +
    icon(squircle, 232, 20, 192, full) +
    icon(circle, 444, 20, 192, mono) +
    icon(circle, 656, 20, 48, full) +
    icon(squircle, 720, 20, 48, full) +
    icon(circle, 784, 20, 48, mono) +
    `<svg x="20" y="232" width="960" height="170" viewBox="0 0 1024 181"><rect width="1024" height="181" fill="${TEAL}"/></svg>` +
    icon(`<rect width="1024" height="1024"/>`, 435, 232, 170, mark()) +
    `</svg>`;
  writeFileSync(join(dir, 'preview.png'), png(sheet, 1000));
  console.log(`preview: ${join(dir, 'preview.png')}`);
}
