/**
 * Spectral lines — the site's visual signature.
 *
 * Each page shows a spectrum: a band from 380 to 760 nm with lines at real
 * wavelengths. In light mode it's an absorption spectrum (dark lines on the
 * continuous band), in dark mode an emission spectrum (the lines alone, in
 * their own colour). The home page's lines are the posts on a timeline and
 * the Work page's are their topics (both in entries.ts); About has an
 * element. A post's lines are its sections, placed where they fall in the
 * text (see flow.ts), or a stable fingerprint seeded by its URL when it has
 * too few sections.
 *
 * Shared by the Spectrum component (build time) and the client scripts that
 * slide the lines from one spectrum to another.
 */

/** [wavelength in nm, drawn width in px] */
export type Line = [number, number];

export const MIN_NM = 380;
export const MAX_NM = 760;
/** Every band renders this many line slots, so any spectrum can morph into any other. */
export const SLOTS = 20;

export const SPECTRA: Record<string, Line[]> = {
  // Fraunhofer lines in sunlight: K H G F b E D₂ D₁ C B A
  sun: [[393.4, 3], [396.8, 3], [430.8, 2], [486.1, 2], [517.3, 1], [527.0, 1], [589.0, 2], [589.6, 2], [656.3, 3], [686.7, 1], [759.4, 2]],
  // The Balmer series
  hydrogen: [[397.0, 1], [410.2, 1], [434.0, 2], [486.1, 2], [656.3, 3]],
  helium: [[447.1, 2], [471.3, 1], [492.2, 1], [501.6, 2], [587.6, 3], [667.8, 2], [706.5, 1]],
};

/** The continuous spectrum, as stops along the band (mirrors --stops in tokens.css). */
const STOPS: [number, string][] = [
  [0, '#7a5cff'], [.18, '#3f8cff'], [.26, '#3fb8ff'], [.40, '#4fdc8c'],
  [.53, '#f2e65a'], [.61, '#ffad42'], [.74, '#ff4d5e'], [1, '#c42a3e'],
];

const position = (nm: number) => (nm - MIN_NM) / (MAX_NM - MIN_NM);

/** The band's own colour at a wavelength, so an emission line matches where it sits. */
export function colorAt(nm: number): string {
  const t = Math.min(1, Math.max(0, position(nm)));
  const i = STOPS.findIndex(([s]) => s >= t);
  if (i <= 0) return STOPS[0][1];
  const [s0, c0] = STOPS[i - 1], [s1, c1] = STOPS[i];
  const k = (t - s0) / (s1 - s0);
  const ch = (c: string, o: number) => parseInt(c.slice(o, o + 2), 16);
  const mix = (o: number) => Math.round(ch(c0, o) + (ch(c1, o) - ch(c0, o)) * k).toString(16).padStart(2, '0');
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/** A stable, made-up spectrum for anything without an element of its own. */
export function fingerprint(seed: string): Line[] {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const n = 5 + Math.floor(rand() * 4);
  return Array.from({ length: n }, (): Line => [
    Math.round((MIN_NM + 8 + rand() * (MAX_NM - MIN_NM - 16)) * 10) / 10,
    1 + Math.floor(rand() * 3),
  ]).sort((a, b) => a[0] - b[0]);
}

/** Lines written into a key, so a computed spectrum can travel in a data attribute. */
export const encode = (lines: Line[]) => 'lines:' + lines.map(([nm, w]) => `${nm}/${w}`).join(',');

/** A spectrum by name, encoded lines, or a fingerprint for any other key (e.g. a URL). */
export function resolve(key: string): Line[] {
  if (key.startsWith('lines:')) {
    return key.slice(6).split(',').map(l => l.split('/').map(Number) as Line);
  }
  return SPECTRA[key] ?? fingerprint(key);
}

export interface Slot { x: string; w: string; c: string; on: 0 | 1 }

/** Lay a spectrum out over the fixed slots; spare slots wait, hidden, on the last line. */
export function slots(lines: Line[]): Slot[] {
  const used = lines.slice(0, SLOTS);
  const park = used[used.length - 1] ?? [570, 1];
  return Array.from({ length: SLOTS }, (_, i) => {
    const [nm, w] = used[i] ?? park;
    return { x: `${(position(nm) * 100).toFixed(2)}%`, w: `${w}px`, c: colorAt(nm), on: i < used.length ? 1 : 0 };
  });
}

/** Move a rendered band's lines to another spectrum; CSS transitions do the sliding. */
export function show(band: HTMLElement, key: string, instant = false) {
  if (band.dataset.shown === key) return;
  band.dataset.shown = key;
  if (instant) band.classList.add('spec--still');
  slots(resolve(key)).forEach((s, i) => {
    const line = band.children[i] as HTMLElement | undefined;
    if (!line) return;
    line.style.setProperty('--x', s.x);
    line.style.setProperty('--w', s.w);
    line.style.setProperty('--c', s.c);
    line.style.setProperty('--on', String(s.on));
  });
  if (instant) { void band.offsetWidth; band.classList.remove('spec--still'); }
}

