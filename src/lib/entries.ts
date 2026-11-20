import { getCollection } from 'astro:content';
import { flowLength, flowSpectrum } from './flow';
import { colorAt, encode, MIN_NM, MAX_NM, SLOTS, type Line } from './spectrum';

/**
 * One list of everything on the Work page: projects and blog posts,
 * normalised to a common shape and sorted newest first.
 */
export interface Entry {
  kind: 'Project' | 'Blog';
  title: string;
  summary: string;
  /** Short secondary line: the tech stack for projects, empty for posts. */
  stack: string;
  date: Date;
  href: string;
  image?: string;
  /** Its spectral band: where its sections fall in the text (lib/flow.ts), or a fingerprint of the URL. */
  spectrum: string;
  /** Estimated length in px (lib/flow.ts), figures included. */
  length: number;
  /** Topic tags, as written in the post. */
  tags: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (d: Date) => MONTHS[d.getMonth()];
export const monthYear = (d: Date) => `${monthName(d)} ${d.getFullYear()}`;

// Content images are written as `assets/foo.png` or `/assets/foo.png`.
const toPublicPath = (p?: string) => (p ? '/' + p.replace(/^\//, '') : undefined);

export async function getEntries(): Promise<Entry[]> {
  const projects = (await getCollection('projects')).map((p): Entry => ({
    kind: 'Project',
    title: p.data.title,
    summary: p.data.description,
    stack: p.data.subtitle?.replace(/^Using\s+/i, '') ?? '',
    date: new Date(Number(p.data.year ?? 1970), Number(p.data.month ?? 1) - 1, 1),
    href: `/projects/${p.slug}`,
    image: toPublicPath(p.data.image),
    spectrum: flowSpectrum(p.body) ?? `/projects/${p.slug}`,
    length: flowLength(p.body),
    tags: p.data.tags,
  }));

  const posts = (await getCollection('blog')).map((p): Entry => ({
    kind: 'Blog',
    title: p.data.title,
    summary: p.data.excerpt,
    stack: '',
    date: p.data.date,
    href: `/blog/${p.slug}`,
    image: toPublicPath(p.data.image),
    spectrum: flowSpectrum(p.body) ?? `/blog/${p.slug}`,
    length: flowLength(p.body),
    tags: p.data.tags,
  }));

  return [...projects, ...posts].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

/** One post on the home page's timeline. */
export interface TimelinePost { href: string; title: string; when: string; x: string; c: string; edge: '' | 'start' | 'end' }

/**
 * The home page's band: a timeline of everything written. Each post is a line
 * at its date, from the first post (violet) to the day the site was built
 * (red), so it grows with every post, gaps show quiet stretches and the newest
 * posts sit in the warm end. Longer posts draw thicker lines.
 */
export async function timeline(): Promise<{ spectrum: string; posts: TimelinePost[] }> {
  const entries = (await getEntries()).slice(0, SLOTS);
  if (!entries.length) return { spectrum: 'sun', posts: [] };
  const start = Math.min(...entries.map(e => e.date.valueOf()));
  const span = Math.max(1, Date.now() - start);
  const placed = entries.map(e => {
    const t = .03 + .94 * Math.min(1, (e.date.valueOf() - start) / span);
    const nm = Math.round((MIN_NM + t * (MAX_NM - MIN_NM)) * 10) / 10;
    return { e, t, line: [nm, e.length < 8000 ? 1 : e.length < 14000 ? 2 : 3] as Line };
  }).sort((a, b) => a.t - b.t);
  return {
    spectrum: encode(placed.map(p => p.line)),
    posts: placed.map(({ e, t, line }) => ({
      href: e.href,
      title: e.title,
      when: monthYear(e.date),
      x: `${(t * 100).toFixed(2)}%`,
      c: colorAt(line[0]),
      edge: t < .25 ? 'start' : t > .75 ? 'end' : '',
    })),
  };
}

export const timelineSpectrum = async () => (await timeline()).spectrum;

/** One topic on the Work page's band. */
export interface Topic { tag: string; label: string; count: number; x: string; c: string; edge: '' | 'start' | 'end' }

/**
 * The Work page's band: what the posts are made of. Like an element's
 * spectral lines, each topic tag has its own fixed wavelength (from a hash of
 * its name, so it never moves) and draws thicker the more posts carry it.
 * A new topic adds a new line; writing more about one makes it heavier.
 */
export async function topics(): Promise<{ spectrum: string; topics: Topic[] }> {
  // Counted case-insensitively; the label keeps the spelling it was first written with.
  const counts = new Map<string, number>(), labels = new Map<string, string>();
  for (const e of await getEntries()) for (const label of e.tags) {
    const t = label.toLowerCase();
    counts.set(t, (counts.get(t) ?? 0) + 1);
    if (!labels.has(t)) labels.set(t, label);
  }
  if (!counts.size) return { spectrum: 'hydrogen', topics: [] };

  const place = (tag: string) => {
    let h = 2166136261;
    for (const c of tag) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return .03 + .94 * ((h >>> 0) / 4294967296);
  };
  // The most-used topics first, so the band keeps them if there are ever more topics than lines.
  const placed = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, SLOTS)
    .map(([tag, count]) => ({ tag, count, t: place(tag) }))
    .sort((a, b) => a.t - b.t);
  // Two topics that hash too close together are nudged apart so both stay visible.
  for (let i = 1; i < placed.length; i++) placed[i].t = Math.max(placed[i].t, placed[i - 1].t + .02);

  const lines = placed.map(({ count, t }): Line => [Math.round((MIN_NM + Math.min(t, 1) * (MAX_NM - MIN_NM)) * 10) / 10, Math.min(4, count)]);
  return {
    spectrum: encode(lines),
    topics: placed.map(({ tag, count, t }, i) => ({
      tag, label: labels.get(tag)!, count,
      x: `${(Math.min(t, 1) * 100).toFixed(2)}%`,
      c: colorAt(lines[i][0]),
      edge: t < .25 ? 'start' : t > .75 ? 'end' : '',
    })),
  };
}
