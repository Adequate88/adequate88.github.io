import { getCollection } from 'astro:content';

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
  }));

  const posts = (await getCollection('blog')).map((p): Entry => ({
    kind: 'Blog',
    title: p.data.title,
    summary: p.data.excerpt,
    stack: '',
    date: p.data.date,
    href: `/blog/${p.slug}`,
    image: toPublicPath(p.data.image),
  }));

  return [...projects, ...posts].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
