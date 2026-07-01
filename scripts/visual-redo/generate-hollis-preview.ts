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

interface ConceptFamily {
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

function hLine(
  img: ImageData,
  x0: number,
  x1: number,
  y: number,
  rgba: readonly number[],
) {
  for (let x = x0; x <= x1; x++) setPixel(img, x, y, rgba);
}

function vLine(
  img: ImageData,
  x: number,
  y0: number,
  y1: number,
  rgba: readonly number[],
) {
  for (let y = y0; y <= y1; y++) setPixel(img, x, y, rgba);
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

function crop(
  src: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const out = image(width, height);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const sx = x + px;
      const sy = y + py;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const offset = (sy * src.width + sx) * 4;
      setPixel(out, px, py, [
        src.data[offset],
        src.data[offset + 1],
        src.data[offset + 2],
        src.data[offset + 3],
      ]);
    }
  }
  return out;
}

function frame(src: ImageData, frameWidth: number, frameIndex: number) {
  return crop(src, frameWidth * frameIndex, 0, frameWidth, src.height);
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

function cargoShipWide(): ImageData {
  return pixelSprite(7, 7, [
    [3, 0, BAND_LIGHT],
    [2, 1, BAND_MID],
    [3, 1, BAND_LIGHT],
    [4, 1, BAND_MID],
    [1, 2, BAND_DARK],
    [2, 2, BAND_MID],
    [3, 2, BAND_LIGHT],
    [4, 2, BAND_MID],
    [5, 2, BAND_DARK],
    [0, 3, BAND_DARK],
    [1, 3, BAND_MID],
    [2, 3, BAND_LIGHT],
    [3, 3, BAND_LIGHT],
    [4, 3, BAND_LIGHT],
    [5, 3, BAND_MID],
    [6, 3, BAND_DARK],
    [1, 4, BAND_DARK],
    [2, 4, BAND_MID],
    [3, 4, BAND_MID],
    [4, 4, BAND_MID],
    [5, 4, BAND_DARK],
    [2, 5, BAND_DARK],
    [3, 5, BAND_MID],
    [4, 5, BAND_DARK],
    [3, 6, BAND_DARK],
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

function natoToken(kind: "cargo" | "warship" | "port" | "city"): ImageData {
  const img = image(16, 16);
  rect(img, 3, 3, 10, 10, BAND_MID);
  hLine(img, 3, 12, 3, BAND_DARK);
  hLine(img, 3, 12, 12, BAND_DARK);
  vLine(img, 3, 3, 12, BAND_DARK);
  vLine(img, 12, 3, 12, BAND_DARK);
  if (kind === "cargo") {
    rect(img, 5, 8, 6, 2, BAND_LIGHT);
    setPixel(img, 10, 7, BAND_LIGHT);
    setPixel(img, 11, 8, BAND_DARK);
  } else if (kind === "warship") {
    hLine(img, 5, 10, 8, BAND_LIGHT);
    setPixel(img, 11, 8, BAND_DARK);
    hLine(img, 6, 10, 6, BAND_DARK);
    setPixel(img, 8, 5, BAND_LIGHT);
  } else if (kind === "port") {
    rect(img, 5, 9, 7, 1, BAND_DARK);
    vLine(img, 6, 5, 10, BAND_LIGHT);
    hLine(img, 6, 11, 5, BAND_LIGHT);
    vLine(img, 10, 5, 10, BAND_MID);
  } else {
    rect(img, 5, 8, 3, 4, BAND_LIGHT);
    rect(img, 9, 6, 3, 6, BAND_DARK);
  }
  return img;
}

function oneBitShip(width: number, height: number, warship = false): ImageData {
  const img = image(width, height);
  const cx = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    const half = Math.max(
      0,
      Math.floor((height - Math.abs(y - height / 2)) / 4),
    );
    hLine(img, cx - half, cx + half, y, y % 2 === 0 ? BAND_LIGHT : BAND_DARK);
  }
  if (warship) {
    hLine(img, cx - 2, cx + 2, Math.floor(height / 2), BAND_WHITE);
    vLine(img, cx, 2, height - 3, BAND_MID);
  } else {
    rect(img, cx - 1, Math.floor(height / 2) - 1, 3, 3, BAND_MID);
  }
  return img;
}

function radarSweepConcept(): ImageData {
  const img = image(16 * 4, 16);
  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * 16;
    rect(img, ox + 7, 7, 2, 2, BAND_LIGHT);
    hLine(img, ox + 4, ox + 11, 8, BAND_MID);
    vLine(img, ox + 8, 4, 11, BAND_MID);
    if (frame === 0) hLine(img, ox + 8, ox + 13, 5, BAND_WHITE);
    if (frame === 1) hLine(img, ox + 8, ox + 13, 8, BAND_WHITE);
    if (frame === 2) hLine(img, ox + 3, ox + 8, 11, BAND_WHITE);
    if (frame === 3) hLine(img, ox + 3, ox + 8, 8, BAND_WHITE);
  }
  return img;
}

function signalTrailConcept(): ImageData {
  const img = image(16 * 4, 16);
  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * 16;
    hLine(img, ox + 2, ox + 13, 8, BAND_DARK);
    for (let i = 0; i < 4; i++) {
      const x = 3 + ((frame + i * 3) % 10);
      rect(img, ox + x, 7, 2, 1, i === 0 ? BAND_WHITE : BAND_LIGHT);
    }
  }
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

function composeFamily(
  icons: ImageData[],
  labels: string[],
  cell = 56,
): ImageData {
  const img = image(cell * icons.length, cell);
  icons.forEach((icon, index) => {
    const ox = index * cell + Math.floor((cell - icon.width) / 2);
    const oy = Math.floor((cell - icon.height) / 2);
    overlay(img, icon, ox, oy);
    // Tiny baseline marker so transparent whitespace is visible in the HTML.
    hLine(
      img,
      index * cell + 10,
      index * cell + cell - 10,
      cell - 7,
      BAND_DARK,
    );
    if (labels[index].includes("war")) {
      rect(img, index * cell + cell - 15, cell - 10, 3, 3, BAND_LIGHT);
    }
  });
  return img;
}

function buildConceptFamilies(): ConceptFamily[] {
  const cityMax = frame(cityLevels(), 16, 4);
  const portMax = frame(portLevels(), 16, 4);
  const combatMid = frame(combatFxStrip(), 16, 1);
  const radarMid = frame(radarSweepConcept(), 16, 1);
  const roadMid = frame(signalTrailConcept(), 16, 1);
  const tactical = composeFamily(
    [
      natoToken("cargo"),
      natoToken("warship"),
      natoToken("city"),
      natoToken("port"),
      radarMid,
    ],
    ["trade", "warship", "city", "port", "combat"],
  );
  const silhouette = composeFamily(
    [cargoShipWide(), battleship(), cityMax, portMax, roadMid],
    ["trade", "warship", "city", "port", "road"],
  );
  const oneBit = composeFamily(
    [
      oneBitShip(7, 7, false),
      oneBitShip(11, 11, true),
      oneBitShip(16, 16, false),
      oneBitShip(16, 16, true),
      combatMid,
    ],
    ["trade", "warship", "city", "port", "combat"],
  );
  const badge = composeFamily(
    [
      natoToken("cargo"),
      battleship(),
      natoToken("city"),
      natoToken("port"),
      railRoadTile(),
    ],
    ["trade", "warship", "city", "port", "rail"],
  );

  return [
    {
      label: "A. Tactical map symbols",
      file: "concept-a-tactical-symbols.png",
      source: "Custom, inspired by military map-marker language",
      license: "Project-owned",
      note: "Not literal ships; this optimizes hard for readability at distance.",
      image: tactical,
    },
    {
      label: "B. Modern naval silhouettes",
      file: "concept-b-modern-naval-silhouettes.png",
      source: "Kenney Pirate Pack and OpenGameArt Sea Warfare CC0 references",
      license: "CC0 derivative/project-owned redraw",
      note: "More literal ships, wider than the first pass, less tiny-diamond looking.",
      image: silhouette,
    },
    {
      label: "C. One-bit strategy counters",
      file: "concept-c-one-bit-strategy-counters.png",
      source: "Custom, informed by CC0 1-bit/pixel asset direction on itch.io",
      license: "Project-owned",
      note: "Crisp and severe; the least decorative and easiest to scan.",
      image: oneBit,
    },
    {
      label: "D. Badge/token UI icons",
      file: "concept-d-badge-token-icons.png",
      source: "Custom badge treatment with CC0 ship silhouette reference",
      license: "Project-owned with CC0 reference",
      note: "Symbols sit in consistent tokens; more board-game than pixel-art.",
      image: badge,
    },
  ];
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

async function writeConceptFamily(concept: ConceptFamily) {
  await writeFile(
    path.join(candidatesDir, concept.file),
    encodePng(concept.image),
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

async function writeConceptSheet(concepts: ConceptFamily[]) {
  const rows = concepts
    .map((concept) => {
      const src = `candidates/${concept.file}`;
      return `      <tr>
        <td>
          <strong>${htmlEscape(concept.label)}</strong>
          <span>${htmlEscape(concept.note)}</span>
          <small>${htmlEscape(concept.source)} - ${htmlEscape(concept.license)}</small>
        </td>
        <td class="zoom"><img src="${src}" alt="${htmlEscape(concept.label)} concept strip" style="width:560px"></td>
      </tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hollis Visual Redo Concept Directions</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #101820;
        background: #f5f7fa;
      }
      body { margin: 0; padding: 32px; }
      header, table { width: min(1120px, 100%); margin: 0 auto 24px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p, span, small { color: #53606b; }
      table { border-collapse: collapse; background: white; border: 1px solid #d8e0e8; }
      th, td { padding: 16px; border-bottom: 1px solid #e6ecf2; vertical-align: middle; }
      th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #53606b; }
      td:first-child { width: 36%; }
      strong, span, small { display: block; }
      span { margin-top: 5px; }
      small { margin-top: 8px; color: #7b8794; }
      img {
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        max-width: 100%;
        height: auto;
        border: 1px solid #b7c2cc;
        background:
          linear-gradient(45deg, #eef2f6 25%, transparent 25%),
          linear-gradient(-45deg, #eef2f6 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #eef2f6 75%),
          linear-gradient(-45deg, transparent 75%, #eef2f6 75%);
        background-color: #dfe6ee;
        background-position: 0 0, 0 8px, 8px -8px, -8px 0;
        background-size: 16px 16px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Hollis Visual Redo Concept Directions</h1>
      <p>Broader directions after rejecting the first preview. Pick a letter first; detailed sprites come after the vibe is right.</p>
    </header>
    <table>
      <thead>
        <tr><th>Direction</th><th>Concept strip</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </body>
</html>
`;

  await writeFile(path.join(outDir, "concept-directions-v2.html"), html);
}

async function writeProvenance(
  candidates: Candidate[],
  concepts: ConceptFamily[],
) {
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
    "- Kenney Pixel Shmup",
    "  - URL: https://kenney-assets.itch.io/pixel-shmup",
    "  - License: CC0 1.0 Universal",
    "  - Usage: reference for crisp low-resolution strategy/shmup readability.",
    "- itch.io CC0 top-down/sprite asset listings",
    "  - URL: https://itch.io/game-assets/assets-cc0/tag-top-down and https://itch.io/game-assets/assets-cc0/tag-sprites",
    "  - License: varies by asset; only used as direction research here.",
    "  - Usage: reference for one-bit and tiny-pixel concept directions.",
    "",
    "## Generated Candidates",
    "",
    ...candidates.map(
      (candidate) =>
        `- \`${candidate.file}\`: ${candidate.label}. ${candidate.note} Source: ${candidate.source}. License: ${candidate.license}.`,
    ),
    "",
    "## Concept Direction Families",
    "",
    ...concepts.map(
      (concept) =>
        `- \`${concept.file}\`: ${concept.label}. ${concept.note} Source: ${concept.source}. License: ${concept.license}.`,
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
  const concepts = buildConceptFamilies();
  for (const candidate of candidates) await writeCandidate(candidate);
  for (const concept of concepts) await writeConceptFamily(concept);
  await writeContactSheet(candidates);
  await writeConceptSheet(concepts);
  await writeProvenance(candidates, concepts);
  console.log(
    `Wrote ${candidates.length} candidates, ${concepts.length} concept families, and HTML sheets to ${outDir}`,
  );
}

await main();
