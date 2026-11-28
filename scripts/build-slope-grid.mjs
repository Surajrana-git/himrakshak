// Builds data/slope-uttarakhand.json: mean hillside slope (degrees) on a 0.01° (~1 km) grid for
// all of Uttarakhand, so the app can read the slope of any road instantly and offline.
// Heights: AWS Terrain Tiles (Mapzen "terrarium" PNGs, public, no key), zoom 10 ≈ 150 m per pixel.
// Run once: node scripts/build-slope-grid.mjs
import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const WEST = 77.5, EAST = 81.1, SOUTH = 28.7, NORTH = 31.5, STEP = 0.01;
const Z = 10;
const rad = Math.PI / 180;

const tileX = (lon) => Math.floor(((lon + 180) / 360) * 2 ** Z);
const tileY = (lat) => Math.floor(((1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2) * 2 ** Z);
const lonOf = (x) => (x / 2 ** Z) * 360 - 180;
const latOf = (y) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) / rad;

// Minimal PNG reader for 8-bit RGB/RGBA, non-interlaced (what terrarium tiles are).
function decodePng(buf) {
  let pos = 8, width = 0, height = 0, channels = 3;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const cur = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const add = [0, a, b, (a + b) >> 1, paeth][filter];
      out[y * stride + x] = (cur + add) & 255;
    }
  }
  const z = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = out[i * channels], g = out[i * channels + 1], bl = out[i * channels + 2];
    z[i] = r * 256 + g + bl / 256 - 32768;
  }
  return { width, height, z };
}

const cols = Math.round((EAST - WEST) / STEP);
const rows = Math.round((NORTH - SOUTH) / STEP);
const sum = new Float64Array(cols * rows);
const count = new Uint32Array(cols * rows);

const [x0, x1, y0, y1] = [tileX(WEST), tileX(EAST), tileY(NORTH), tileY(SOUTH)];
console.log(`${(x1 - x0 + 1) * (y1 - y0 + 1)} tiles`);
for (let tx = x0; tx <= x1; tx++) {
  for (let ty = y0; ty <= y1; ty++) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`);
    if (!res.ok) throw new Error(`tile ${tx}/${ty}: ${res.status}`);
    const { width, height, z } = decodePng(Buffer.from(await res.arrayBuffer()));
    const lonW = lonOf(tx), lonE = lonOf(tx + 1), latN = latOf(ty), latS = latOf(ty + 1);
    for (let py = 1; py < height - 1; py++) {
      const lat = latN + ((latS - latN) * (py + 0.5)) / height;
      const metresY = ((latN - latS) / height) * 111_320;
      const metresX = ((lonE - lonW) / width) * 111_320 * Math.cos(lat * rad);
      for (let px = 1; px < width - 1; px++) {
        const lon = lonW + ((lonE - lonW) * (px + 0.5)) / width;
        const c = Math.floor((lon - WEST) / STEP), r = Math.floor((lat - SOUTH) / STEP);
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const gx = (z[py * width + px + 1] - z[py * width + px - 1]) / (2 * metresX);
        const gy = (z[(py - 1) * width + px] - z[(py + 1) * width + px]) / (2 * metresY);
        sum[r * cols + c] += Math.atan(Math.hypot(gx, gy)) / rad;
        count[r * cols + c]++;
      }
    }
  }
  process.stdout.write(".");
}

// One byte per cell: mean slope in whole degrees (0–89), row 0 = southern edge.
const deg = Buffer.alloc(cols * rows);
for (let i = 0; i < deg.length; i++) deg[i] = count[i] ? Math.round(sum[i] / count[i]) : 0;
writeFileSync(
  "data/slope-uttarakhand.json",
  JSON.stringify({
    source: "AWS Terrain Tiles (Mapzen terrarium, from SRTM/GMTED and others), zoom 10 ≈ 150 m; mean slope per 0.01° cell",
    west: WEST,
    south: SOUTH,
    step: STEP,
    cols,
    rows,
    deg: deg.toString("base64"),
  }),
);
console.log(`\n${cols}×${rows} cells written`);
