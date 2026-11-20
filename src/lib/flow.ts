/**
 * Build-time: where each section of a post falls in its text.
 *
 * A post's ## and ### headings are placed by how much reading comes before
 * them, as a fraction t of the whole post (0 = top, 1 = end). That one number
 * gives a heading its colour (the spectrum at t), its line in the post's band
 * under the title and on the Work page, and its spacing on the contents rail.
 *
 * The page isn't laid out at build time, so the height of each block is
 * estimated from the Markdown for the ~650px text column: text by its length,
 * figures and images by a typical height. Measured against the rendered pages
 * this lands within a few percent of where the headings really sit.
 */
import { colorAt, encode, MIN_NM, MAX_NM, type Line } from './spectrum';

export interface Mark { depth: 2 | 3; text: string; t: number }

// Estimated heights in px at desktop width.
const CHARS_PER_LINE = 78;
const LINE = 30;            // body line height
const GAP = 24;             // space after a paragraph
const H2 = 150;             // a ## with its bar and the space above it
const H3 = 80;
const FIGURE = 420;         // a typical fx- figure with its caption
const IMAGE = 380;
const CODE_LINE = 21;

/** Visible text of a Markdown block: no tags, links reduced to their text. */
const visible = (s: string) => s
  .replace(/<[^>]+>/g, '')
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`]/g, '')
  .replace(/&[a-z#0-9]+;/gi, 'x');

const textHeight = (s: string) => Math.max(1, Math.ceil(visible(s).length / CHARS_PER_LINE)) * LINE;

function measure(body: string) {
  const lines = body.split('\n');
  const marks: { depth: 2 | 3; text: string; y: number }[] = [];
  let y = 0;
  let block: string[] = [];

  const flush = () => {
    if (!block.length) return;
    const first = block[0].trim();
    if (/^<figure|^<div class="fx/.test(first)) y += FIGURE;
    else if (/^(<p>)?<img|^!\[/.test(first)) y += IMAGE;
    else if (/^([-*]|\d+\.)\s/.test(first)) {
      // A list: each item wraps on its own, with a little space between items.
      let items: string[] = [];
      for (const l of block) {
        if (/^\s*([-*]|\d+\.)\s/.test(l)) items.push(l);
        else if (items.length) items[items.length - 1] += ' ' + l;
      }
      y += items.reduce((h, it) => h + textHeight(it) + 8, 0) + GAP;
    } else y += textHeight(block.join(' ')) + GAP;
    block = [];
  };

  // Code tabs show one of their code blocks at a time: count the longest.
  let fence = 0, tabs = false, tabMax = 0;
  for (const line of lines) {
    if (/^<div class="fx-codetabs/.test(line)) { flush(); tabs = true; tabMax = 0; y += 50; continue; }
    if (tabs && !fence && line.trim() === '</div>') { y += tabMax; tabs = false; continue; }
    if (/^\s*```/.test(line)) {
      if (!fence) { flush(); fence = 1; continue; }
      const h = fence * CODE_LINE + 48;
      if (tabs) tabMax = Math.max(tabMax, h); else y += h;
      fence = 0;
      continue;
    }
    if (tabs && !fence) continue;
    if (fence) { fence++; continue; }

    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const depth = h[1].length as 2 | 3;
      y += depth === 2 ? H2 * .45 : H3 * .45;   // the space above the heading comes before it
      marks.push({ depth, text: visible(h[2]).trim(), y });
      y += depth === 2 ? H2 * .55 : H3 * .55;
    } else if (!line.trim()) flush();
    else block.push(line);
  }
  flush();

  return { marks, total: Math.max(1, y) };
}

export function flow(body: string): Mark[] {
  const { marks, total } = measure(body);
  return marks.map(({ depth, text, y }) => ({ depth, text, t: Math.round((y / total) * 1000) / 1000 }));
}

/** A post's estimated length in px at desktop width, figures included. */
export const flowLength = (body: string) => measure(body).total;

/** The colour of the spectrum at a point t through the post. */
export const colorAtT = (t: number) => colorAt(MIN_NM + t * (MAX_NM - MIN_NM));

/** A post's band: a line where each section starts, ## heavier than ###. */
export function flowSpectrum(body: string): string | undefined {
  const marks = flow(body);
  if (marks.length < 2) return undefined;
  return encode(marks.map(({ depth, t }): Line => [Math.round((MIN_NM + t * (MAX_NM - MIN_NM)) * 10) / 10, depth === 2 ? 2 : 1]));
}
