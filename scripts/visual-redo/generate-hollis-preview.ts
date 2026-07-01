import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "resources/hollis-visual-redo");
const candidatesDir = path.join(outDir, "candidates");

const BAND_DARK = [70, 70, 70, 255] as const;
const BAND_MID = [130, 130, 130, 255] as const;
const BAND_LIGHT = [180, 180, 180, 255] as const;
const BAND_WHITE = [235, 235, 235, 255] as const;

interface ImageData {
  width: number;
  height: number;
  data: Uint8Array;
}

interface Candidate {
  key: string;
  label: string;
  file: string;
  source: string;
  license: string;
  note: string;
  image: ImageData;
}

function image(width: number, height: number): ImageData {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

function setPixel(
  img: ImageData,
  x: number,
  y: number,
  rgba: readonly number[],
) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const offset = (y * img.width + x) * 4;
  img.data[offset] = rgba[0];
  img.data[offset + 1] = rgba[1];
  img.data[offset + 2] = rgba[2];
  img.data[offset + 3] = rgba[3];
}

function rect(
  img: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
  rgba: readonly number[],
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) setPixel(img, px, py, rgba);
  }
}

function pixelSprite(
  width: number,
  height: number,
  pixels: Array<[number, number, readonly number[]]>,
): ImageData {
  const img = image(width, height);
  for (const [x, y, color] of pixels) setPixel(img, x, y, color);
  return img;
}

function overlay(base: ImageData, top: ImageData, ox: number, oy: number) {
  for (let y = 0; y < top.height; y++) {
    for (let x = 0; x < top.width; x++) {
      const src = (y * top.width + x) * 4;
      if (top.data[src + 3] === 0) continue;
      setPixel(base, ox + x, oy + y, [
        top.data[src],
        top.data[src + 1],
        top.data[src + 2],
        top.data[src + 3],
      ]);
    }
  }
}

function frameStrip(
  width: number,
  height: number,
  frames: number,
  draw: (img: ImageData, frame: number, ox: number) => void,
): ImageData {
  const img = image(width * frames, height);
  for (let frame = 0; frame < frames; frame++) draw(img, frame, frame * width);
  return img;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(img: ImageData): Buffer {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlineLength = img.width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * img.height);
  for (let y = 0; y < img.height; y++) {
    const row = y * scanlineLength;
    raw[row] = 0;
    Buffer.from(
      img.data.buffer,
      img.data.byteOffset + y * img.width * 4,
      img.width * 4,
    ).copy(raw, row + 1);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function transportShip(): ImageData {
  return pixelSprite(5, 5, [
    [2, 0, BAND_LIGHT],
    [1, 1, BAND_MID],
    [2, 1, BAND_MID],
    [3, 1, BAND_MID],
    [0, 2, BAND_DARK],
    [1, 2, BAND_MID],
    [2, 2, BAND_LIGHT],
    [3, 2, BAND_MID],
    [4, 2, BAND_DARK],
    [0, 3, BAND_DARK],
    [1, 3, BAND_DARK],
    [2, 3, BAND_MID],
    [3, 3, BAND_DARK],
    [4, 3, BAND_DARK],
    [2, 4, BAND_DARK],
  ]);
}

function cargoShip(): ImageData {
  return pixelSprite(5, 5, [
    [2, 0, BAND_LIGHT],
    [1, 1, BAND_MID],
    [2, 1, BAND_LIGHT],
    [3, 1, BAND_MID],
    [0, 2, BAND_DARK],
    [1, 2, BAND_MID],
    [2, 2, BAND_LIGHT],
    [3, 2, BAND_MID],
    [4, 2, BAND_DARK],
    [1, 3, BAND_DARK],
    [2, 3, BAND_MID],
    [3, 3, BAND_DARK],
    [2, 4, BAND_DARK],
  ]);
}

function destroyerShip(): ImageData {
  return pixelSprite(11, 11, [
    [5, 0, BAND_LIGHT],
    [4, 1, BAND_MID],
    [5, 1, BAND_LIGHT],
    [6, 1, BAND_MID],
    [3, 2, BAND_DARK],
    [4, 2, BAND_MID],
    [5, 2, BAND_LIGHT],
    [6, 2, BAND_MID],
    [7, 2, BAND_DARK],
    [2, 3, BAND_DARK],
    [3, 3, BAND_MID],
    [4, 3, BAND_DARK],
    [5, 3, BAND_MID],
    [6, 3, BAND_DARK],
    [7, 3, BAND_MID],
    [8, 3, BAND_DARK],
    [2, 4, BAND_DARK],
    [3, 4, BAND_MID],
    [4, 4, BAND_MID],
    [5, 4, BAND_LIGHT],
    [6, 4, BAND_MID],
    [7, 4, BAND_MID],
    [8, 4, BAND_DARK],
    [1, 5, BAND_DARK],
    [2, 5, BAND_MID],
    [3, 5, BAND_MID],
    [4, 5, BAND_DARK],
    [5, 5, BAND_LIGHT],
    [6, 5, BAND_DARK],
    [7, 5, BAND_MID],
    [8, 5, BAND_MID],
    [9, 5, BAND_DARK],
    [2, 6, BAND_DARK],
    [3, 6, BAND_MID],
    [4, 6, BAND_MID],
    [5, 6, BAND_LIGHT],
    [6, 6, BAND_MID],
    [7, 6, BAND_MID],
    [8, 6, BAND_DARK],
    [3, 7, BAND_DARK],
    [4, 7, BAND_MID],
    [5, 7, BAND_MID],
    [6, 7, BAND_MID],
    [7, 7, BAND_DARK],
    [4, 8, BAND_DARK],
    [5, 8, BAND_MID],
    [6, 8, BAND_DARK],
    [5, 9, BAND_DARK],
  ]);
}

function battleship(): ImageData {
  const img = destroyerShip();
  rect(img, 4, 3, 3, 1, BAND_LIGHT);
  rect(img, 3, 5, 5, 1, BAND_MID);
  setPixel(img, 2, 2, BAND_DARK);
  setPixel(img, 8, 2, BAND_DARK);
  setPixel(img, 2, 7, BAND_DARK);
  setPixel(img, 8, 7, BAND_DARK);
  setPixel(img, 5, 2, BAND_WHITE);
  setPixel(img, 5, 6, BAND_WHITE);
  return img;
}

function constructionStrip(): ImageData {
  return frameStrip(16, 16, 4, (img, frame, ox) => {
    rect(img, ox + 4, 11, 8, 1, BAND_DARK);
    rect(img, ox + 5, 7, 1, 5, BAND_DARK);
    rect(img, ox + 10, 6, 1, 6, BAND_DARK);
    rect(img, ox + 5, 8, 6, 1, BAND_MID);
    rect(img, ox + 6, 5, 4, 1, BAND_MID);
    rect(img, ox + 7 + (frame % 2), 3, 1, 4, BAND_LIGHT);
    rect(img, ox + 7, 3, 4, 1, BAND_LIGHT);
    rect(img, ox + 12, 8, 1, 2, frame % 2 === 0 ? BAND_LIGHT : BAND_MID);
  });
}

function combatFxStrip(): ImageData {
  return frameStrip(16, 16, 4, (img, frame, ox) => {
    if (frame === 0) {
      rect(img, ox + 5, 7, 6, 1, BAND_WHITE);
    } else if (frame === 1) {
      rect(img, ox + 7, 6, 5, 1, BAND_LIGHT);
      rect(img, ox + 4, 8, 2, 1, BAND_MID);
    } else if (frame === 2) {
      rect(img, ox + 8, 6, 3, 1, BAND_MID);
      rect(img, ox + 5, 8, 2, 1, BAND_MID);
      setPixel(img, ox + 3, 9, BAND_DARK);
    } else {
      rect(img, ox + 4, 8, 2, 1, BAND_DARK);
      setPixel(img, ox + 9, 6, BAND_DARK);
    }
  });
}

function railRoadTile(): ImageData {
  const img = image(16, 16);
  rect(img, 3, 2, 1, 12, BAND_DARK);
  rect(img, 12, 2, 1, 12, BAND_DARK);
  for (let y = 3; y < 14; y += 3) rect(img, 4, y, 8, 1, BAND_MID);
  setPixel(img, 3, 1, BAND_LIGHT);
  setPixel(img, 12, 1, BAND_LIGHT);
  rect(img, 1, 14, 14, 1, BAND_DARK);
  rect(img, 1, 13, 14, 1, BAND_MID);
  rect(img, 5, 13, 2, 1, BAND_LIGHT);
  rect(img, 10, 13, 2, 1, BAND_LIGHT);
  return img;
}

function cityLevels(): ImageData {
  const strip = image(16 * 5, 16);
  for (let level = 0; level < 5; level++) {
    const ox = level * 16;
    rect(strip, ox + 2, 12, 12, 2, BAND_DARK);
    rect(
      strip,
      ox + 5,
      7 - Math.min(level, 2),
      4,
      7 + Math.min(level, 2),
      BAND_MID,
    );
    rect(strip, ox + 6, 8 - Math.min(level, 2), 2, 1, BAND_LIGHT);
    if (level >= 1) rect(strip, ox + 2, 9, 3, 5, BAND_MID);
    if (level >= 2) rect(strip, ox + 10, 8, 3, 6, BAND_MID);
    if (level >= 3) rect(strip, ox + 7, 4, 2, 3, BAND_LIGHT);
    if (level >= 4) rect(strip, ox + 12, 6, 2, 8, BAND_DARK);
  }
  return strip;
}

function portLevels(): ImageData {
  const strip = image(16 * 5, 16);
  for (let level = 0; level < 5; level++) {
    const ox = level * 16;
    rect(strip, ox + 2, 11, 12, 2, BAND_DARK);
    rect(strip, ox + 3, 8, 2, 4, BAND_MID);
    rect(strip, ox + 8, 7, 2, 5, BAND_MID);
    if (level >= 1) rect(strip, ox + 11, 6, 2, 6, BAND_MID);
    if (level >= 2) rect(strip, ox + 5, 5, 6, 1, BAND_LIGHT);
    if (level >= 3) rect(strip, ox + 6, 3, 1, 4, BAND_DARK);
    if (level >= 4) rect(strip, ox + 7, 3, 5, 1, BAND_LIGHT);
  }
  return strip;
}

function unitAtlasPreview(candidates: Candidate[]): ImageData {
  const atlas = image(13 * 12, 13);
  const transport = candidates.find((c) => c.key === "transport")!.image;
  const trade = candidates.find((c) => c.key === "trade")!.image;
  const war = candidates.find((c) => c.key === "warship-destroyer")!.image;
  overlay(atlas, transport, 13 * 0 + 4, 4);
  overlay(atlas, trade, 13 * 1 + 4, 4);
  overlay(atlas, war, 13 * 2 + 1, 1);
  return atlas;
}

function buildCandidates(): Candidate[] {
  const candidates: Candidate[] = [
    {
      key: "transport",
      label: "Transport ship candidate",
      file: "transport-ship-clean-5.png",
      source: "Kenney Pirate Pack, simplified by hand for OpenFront scale",
      license: "CC0",
      note: "5x5 actual cell; broader landing-craft silhouette.",
      image: transportShip(),
    },
    {
      key: "trade",
      label: "Trade ship cargo candidate",
      file: "trade-ship-cargo-5.png",
      source: "Kenney Pirate Pack hull language, simplified by hand",
      license: "CC0",
      note: "5x5 actual cell; light deck/container pixels carry the cargo read.",
      image: cargoShip(),
    },
    {
      key: "warship-destroyer",
      label: "Warship destroyer candidate",
      file: "warship-destroyer-11.png",
      source: "OpenGameArt Sea Warfare Destroyer silhouette, normalized",
      license: "CC0",
      note: "11x11 actual cell; sharper bow and centerline gun hints.",
      image: destroyerShip(),
    },
    {
      key: "warship-battleship",
      label: "Warship battleship candidate",
      file: "warship-battleship-11.png",
      source: "OpenGameArt Sea Warfare Battleship silhouette, normalized",
      license: "CC0",
      note: "11x11 alternative; heavier silhouette than the destroyer.",
      image: battleship(),
    },
    {
      key: "construction",
      label: "Construction progress marker",
      file: "construction-progress-16x4.png",
      source: "Custom minimal scaffold/crane marker",
      license: "Project-owned",
      note: "Four 16x16 frames; intentionally no people and no noisy movement.",
      image: constructionStrip(),
    },
    {
      key: "city-levels",
      label: "City level growth concept",
      file: "city-level-growth-16x5.png",
      source: "Existing OpenFront building-level idea, redrawn as preview",
      license: "Project-owned",
      note: "Five 16x16 frames; more blocks appear as level increases.",
      image: cityLevels(),
    },
    {
      key: "port-levels",
      label: "Port level growth concept",
      file: "port-level-growth-16x5.png",
      source: "Existing OpenFront port-level idea, redrawn as preview",
      license: "Project-owned",
      note: "Five 16x16 frames; docks/crane elements expand with level.",
      image: portLevels(),
    },
    {
      key: "rail-road",
      label: "Railway and road styling tile",
      file: "rail-road-style-16.png",
      source: "Custom preview using OpenFront banding",
      license: "Project-owned",
      note: "Readable sleepers plus restrained road marker; shader guide only.",
      image: railRoadTile(),
    },
    {
      key: "combat-fx",
      label: "Combat muzzle/smoke micro-FX",
      file: "combat-micro-fx-16x4.png",
      source: "Custom minimal FX strip",
      license: "Project-owned",
      note: "Four frames for subtle tracer/smoke, not constant flashy overlays.",
      image: combatFxStrip(),
    },
  ];
  candidates.push({
    key: "unit-atlas-preview",
    label: "Unit atlas placement preview",
    file: "unit-atlas-placement-preview-13px.png",
    source: "Generated from transport/trade/warship candidates",
    license: "Mixed CC0/project-owned derivative",
    note: "13px cells matching UnitPass atlas columns 0, 1, and 2.",
    image: unitAtlasPreview(candidates),
  });
  return candidates;
}

async function writeCandidate(candidate: Candidate) {
  await writeFile(
    path.join(candidatesDir, candidate.file),
    encodePng(candidate.image),
  );
}

function zoomWidth(candidate: Candidate): number {
  if (candidate.image.width <= 5) return candidate.image.width * 24;
  if (candidate.image.width <= 13) return candidate.image.width * 16;
  return Math.min(candidate.image.width * 8, 640);
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeContactSheet(candidates: Candidate[]) {
  const rows = candidates
    .map((candidate) => {
      const src = `candidates/${candidate.file}`;
      return `      <tr>
        <td>
          <strong>${htmlEscape(candidate.label)}</strong>
          <span>${htmlEscape(candidate.note)}</span>
          <small>${htmlEscape(candidate.source)} - ${htmlEscape(candidate.license)}</small>
        </td>
        <td class="actual"><img src="${src}" alt="${htmlEscape(candidate.label)} actual size"></td>
        <td class="zoom"><img src="${src}" alt="${htmlEscape(candidate.label)} zoomed" style="width:${zoomWidth(candidate)}px"></td>
      </tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hollis Visual Redo Preview</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #101820;
        background: #f5f7fa;
      }
      body {
        margin: 0;
        padding: 32px;
      }
      header {
        max-width: 1120px;
        margin: 0 auto 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      p {
        margin: 6px 0;
        color: #53606b;
      }
      table {
        width: min(1120px, 100%);
        margin: 0 auto;
        border-collapse: collapse;
        background: white;
        border: 1px solid #d8e0e8;
      }
      th, td {
        padding: 14px 16px;
        border-bottom: 1px solid #e6ecf2;
        vertical-align: middle;
      }
      th {
        text-align: left;
        font-size: 12px;
        color: #53606b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      td:first-child {
        width: 42%;
      }
      strong, span, small {
        display: block;
      }
      span {
        margin-top: 4px;
        color: #53606b;
      }
      small {
        margin-top: 7px;
        color: #7b8794;
      }
      img {
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        background:
          linear-gradient(45deg, #eef2f6 25%, transparent 25%),
          linear-gradient(-45deg, #eef2f6 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #eef2f6 75%),
          linear-gradient(-45deg, transparent 75%, #eef2f6 75%);
        background-color: #dfe6ee;
        background-position: 0 0, 0 8px, 8px -8px, -8px 0;
        background-size: 16px 16px;
      }
      .actual img {
        width: auto;
        height: auto;
      }
      .zoom img {
        max-width: 640px;
        height: auto;
        border: 1px solid #b7c2cc;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Hollis Visual Redo Preview</h1>
      <p>Preview-only candidates. Do not integrate until these read well at actual size.</p>
      <p>All unit-sized candidates use OpenFront recolor bands: rgb(70), rgb(130), rgb(180), plus sparse white highlights for review only.</p>
    </header>
    <table>
      <thead>
        <tr><th>Candidate</th><th>Actual size</th><th>Zoomed inspection</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </body>
</html>
`;

  await writeFile(path.join(outDir, "preview-contact-sheet.html"), html);
}

async function writeProvenance(candidates: Candidate[]) {
  const lines = [
    "# Hollis Visual Redo Asset Provenance",
    "",
    "This directory is preview-only. These files are candidate assets for review before gameplay or atlas integration.",
    "",
    "## External Sources",
    "",
    "- Kenney Pirate Pack",
    "  - URL: https://kenney.nl/assets/pirate-pack",
    "  - License: Creative Commons CC0",
    "  - Usage: ship silhouette/style reference for transport and cargo candidates.",
    "- OpenGameArt Sea Warfare set",
    "  - URL: https://opengameart.org/content/sea-warfare-set-ships-and-more",
    "  - Author: Lowder2",
    "  - License: CC0",
    "  - Usage: destroyer and battleship silhouette reference normalized into OpenFront grayscale bands.",
    "",
    "## Generated Candidates",
    "",
    ...candidates.map(
      (candidate) =>
        `- \`${candidate.file}\`: ${candidate.label}. ${candidate.note} Source: ${candidate.source}. License: ${candidate.license}.`,
    ),
    "",
    "## Regeneration",
    "",
    "Run `npx tsx scripts/visual-redo/generate-hollis-preview.ts` from the repo root.",
    "",
  ];
  await writeFile(
    path.join(outDir, "ASSET_PROVENANCE.md"),
    `${lines.join("\n")}\n`,
  );
}

async function main() {
  await mkdir(candidatesDir, { recursive: true });
  const candidates = buildCandidates();
  for (const candidate of candidates) await writeCandidate(candidate);
  await writeContactSheet(candidates);
  await writeProvenance(candidates);
  console.log(
    `Wrote ${candidates.length} candidates and HTML contact sheet to ${outDir}`,
  );
}

await main();
