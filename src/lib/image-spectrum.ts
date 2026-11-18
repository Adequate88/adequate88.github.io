/**
 * Build-time only: a project's spectrum, read from its cover image.
 *
 * The image's dominant hues become lines at the matching wavelengths, with
 * stronger colours drawn thicker. Images with too little colour to read
 * (greyscale renders), or in a format we don't decode, fall back to the URL
 * fingerprint. Decoding is done here rather than with sharp so the build has
 * no native dependency: PNG (8-bit, non-interlaced) and the first GIF frame
 * are all the covers need, and a colour histogram doesn't care about pixel order.
 */
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { encode, type Line } from './spectrum';

// Astro builds from the project root; import.meta.url would point into the bundle.
const PUBLIC = join(process.cwd(), 'public');

// Hue (degrees) → dominant wavelength (nm). Purples and magentas have no
// single wavelength; they're folded onto the nearest end of the spectrum.
const HUE_NM: [number, number][] = [
  [0, 640], [30, 595], [60, 577], [90, 555], [120, 530], [150, 510],
  [180, 490], [210, 475], [240, 455], [270, 420], [300, 400], [315, 395], [316, 700], [360, 640],
];
function hueToNm(h: number) {
  const i = HUE_NM.findIndex(([d]) => d >= h);
  if (i <= 0) return HUE_NM[0][1];
  const [h0, n0] = HUE_NM[i - 1], [h1, n1] = HUE_NM[i];
  return n0 + (n1 - n0) * ((h - h0) / (h1 - h0));
}

const BINS = 36;
const cache = new Map<string, Promise<Line[] | null>>();

interface Pixels { rgb: Uint8Array; w: number; h: number }

/** RGB triplets for a PNG (8-bit, non-interlaced). */
function decodePng(buf: Buffer): Pixels | null {
  let pos = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('latin1', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === 'PLTE') palette = body;
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (depth !== 8 || interlace || !channels || (type === 3 && !palette)) return null;

  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[row + x - channels] : 0, b = y ? px[row - stride + x] : 0, c = x >= channels && y ? px[row - stride + x - channels] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
      px[row + x] = (raw[src + x] + pred) & 255;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    if (type === 3) palette!.copy(rgb as unknown as Buffer, i * 3, px[o] * 3, px[o] * 3 + 3);
    else if (type === 2 || type === 6) rgb.set(px.subarray(o, o + 3), i * 3);
    else rgb.fill(px[o], i * 3, i * 3 + 3);
  }
  return { rgb, w: width, h: height };
}

/** RGB triplets for the first frame of a GIF. */
function decodeGif(buf: Buffer): Pixels | null {
  let pos = 13, table: Buffer | null = null;
  const flags = buf[10];
  if (flags & 0x80) { const n = 3 << ((flags & 7) + 1); table = buf.subarray(pos, pos + n); pos += n; }
  while (pos < buf.length) {
    const block = buf[pos];
    if (block === 0x21) {                       // extension: skip its sub-blocks
      pos += 2;
      while (buf[pos]) pos += buf[pos] + 1;
      pos++;
    } else if (block === 0x2c) {                // image descriptor
      const w = buf.readUInt16LE(pos + 5), h = buf.readUInt16LE(pos + 7), f = buf[pos + 9];
      pos += 10;
      if (f & 0x80) { const n = 3 << ((f & 7) + 1); table = buf.subarray(pos, pos + n); pos += n; }
      if (!table) return null;
      const minCode = buf[pos++], parts: Buffer[] = [];
      while (buf[pos]) { parts.push(buf.subarray(pos + 1, pos + 1 + buf[pos])); pos += buf[pos] + 1; }
      const data = Buffer.concat(parts), out = new Uint8Array(w * h);

      // LZW
      const clear = 1 << minCode, end = clear + 1;
      const prefix = new Int32Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097);
      let size = minCode + 1, next = end + 1, prev = -1, first = 0, bits = 0, acc = 0, n = 0;
      for (let i = 0; i < data.length && n < out.length; i++) {
        acc |= data[i] << bits; bits += 8;
        while (bits >= size && n < out.length) {
          const code = acc & ((1 << size) - 1);
          acc >>>= size; bits -= size;
          if (code === clear) { size = minCode + 1; next = end + 1; prev = -1; continue; }
          if (code === end) { i = data.length; break; }
          let c = code, sp = 0;
          if (prev === -1) { out[n++] = code; prev = code; first = code; continue; }
          if (c >= next) { stack[sp++] = first; c = prev; }
          while (c > end) { stack[sp++] = suffix[c]; c = prefix[c]; }
          first = c; stack[sp++] = c;
          while (sp && n < out.length) out[n++] = stack[--sp];
          if (next < 4096) { prefix[next] = prev; suffix[next] = first; next++; if (next === 1 << size && size < 12) size++; }
          prev = code;
        }
      }
      const rgb = new Uint8Array(w * h * 3);
      for (let i = 0; i < out.length; i++) table.copy(rgb as unknown as Buffer, i * 3, out[i] * 3, out[i] * 3 + 3);
      return { rgb, w, h };
    } else return null;
  }
  return null;
}

/** Box-average down to ~96px, so dithered renders read as the colour you see, not the noise. */
function shrink({ rgb, w, h }: Pixels): Uint8Array {
  const k = Math.max(1, Math.ceil(Math.max(w, h) / 96)), sw = Math.floor(w / k), sh = Math.floor(h / k);
  const out = new Uint8Array(sw * sh * 3);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const o = ((y * k + dy) * w + x * k + dx) * 3;
      r += rgb[o]; g += rgb[o + 1]; b += rgb[o + 2];
    }
    const o = (y * sw + x) * 3, n = k * k;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
  }
  return out;
}

async function read(publicPath: string): Promise<Line[] | null> {
  const buf = await readFile(join(PUBLIC, publicPath));
  const img = buf.toString('latin1', 1, 4) === 'PNG' ? decodePng(buf) : buf.toString('latin1', 0, 3) === 'GIF' ? decodeGif(buf) : null;
  if (!img) return null;
  const data = shrink(img);

  const hist = new Float64Array(BINS);
  let chroma = 0;
  const count = data.length / 3;
  for (let p = 0; p < data.length; p += 3) {
    const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    if (max < .12 || c / max < .15) continue;   // too dark or too grey to have a hue
    let h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    h = (h * 60 + 360) % 360;
    hist[Math.floor(h / (360 / BINS)) % BINS] += c;
    chroma += c;
  }
  if (chroma / count < .03) return null;

  // Smooth around the hue circle, then keep the clear peaks.
  const s = hist.map((_, i) => .25 * hist[(i + BINS - 1) % BINS] + .5 * hist[i] + .25 * hist[(i + 1) % BINS]);
  const top = Math.max(...s);
  const peaks = [...s.keys()]
    .filter(i => s[i] >= top * .08 && s[i] >= s[(i + BINS - 1) % BINS] && s[i] > s[(i + 1) % BINS])
    .sort((a, b) => s[b] - s[a])
    .slice(0, 7);

  return peaks
    .map((i): Line => [
      Math.round(hueToNm((i + .5) * (360 / BINS)) * 10) / 10,
      s[i] > top * .6 ? 3 : s[i] > top * .25 ? 2 : 1,
    ])
    .sort((a, b) => a[0] - b[0]);
}

/** The spectrum key for an entry: its image's spectrum, or its URL as a fingerprint seed. */
export async function spectrumKey(href: string, image?: string): Promise<string> {
  if (!image) return href;
  if (!cache.has(image)) cache.set(image, read(image).catch(e => { console.warn(`[spectrum] ${image}: ${e.message}`); return null; }));
  const lines = await cache.get(image)!;
  return lines?.length ? encode(lines) : href;
}
