import type { APIContext } from 'astro';
import { getEntries } from '../lib/entries';

/**
 * Minimal hand-rolled RSS 2.0 feed of everything on /work (projects and blog posts).
 * Absolute links need `site` set in astro.config.mjs.
 */
export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') ?? '';
  const entries = await getEntries();

  const esc = (s = '') =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const items = entries
    .map(
      (e) => `    <item>
      <title>${esc(e.title)}</title>
      <link>${site}${e.href}</link>
      <guid>${site}${e.href}</guid>
      <pubDate>${e.date.toUTCString()}</pubDate>
      <category>${e.kind}</category>
      <description>${esc(e.summary)}</description>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Alessandro Salo — Work</title>
    <link>${site}/work</link>
    <description>Projects and blog posts on rendering, GPUs and making things fast.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
