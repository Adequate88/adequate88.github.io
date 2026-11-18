/**
 * Reading strip: on project and blog pages, once the header's band scrolls
 * away, a hairline spectrum pins to the top of the window. Its lines are the
 * post's sections (## long, #### short), placed where they fall in the text;
 * the continuum fills in as you read, and clicking a line jumps there.
 */
import { colorAt, MIN_NM, MAX_NM } from './spectrum';

let cleanup: (() => void) | null = null;

export function initReadingStrip() {
  cleanup?.();
  cleanup = null;

  const prose = document.querySelector<HTMLElement>('.prose');
  const head = document.querySelector<HTMLElement>('.post-head');
  const headings = prose ? [...prose.querySelectorAll<HTMLElement>('h2[id], h4[id]')] : [];
  if (!prose || !head || headings.length < 2) return;

  const strip = document.createElement('div');
  strip.className = 'toc';
  strip.setAttribute('aria-hidden', 'true');
  strip.innerHTML = '<span class="toc-fill"></span>';
  const marks = headings.map(h => {
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.tabIndex = -1;
    a.className = h.tagName === 'H2' ? 'toc-major' : 'toc-minor';
    const label = document.createElement('span');
    label.textContent = h.textContent?.trim() ?? '';
    a.append(label);
    strip.append(a);
    return a;
  });
  prose.closest('.doc')!.append(strip);

  let top = 0, height = 1;
  const layout = () => {
    const r = prose.getBoundingClientRect();
    top = r.top + scrollY;
    height = Math.max(1, r.height);
    strip.style.left = `${r.left}px`;
    strip.style.width = `${r.width}px`;
    headings.forEach((h, i) => {
      const t = Math.min(1, Math.max(0, (h.getBoundingClientRect().top + scrollY - top) / height));
      marks[i].style.setProperty('--x', `${(t * 100).toFixed(2)}%`);
      marks[i].style.setProperty('--c', colorAt(MIN_NM + t * (MAX_NM - MIN_NM)));
      marks[i].classList.toggle('toc-start', t < .15);
      marks[i].classList.toggle('toc-end', t > .85);
    });
    progress();
  };
  const progress = () => {
    const p = Math.min(1, Math.max(0, (scrollY + innerHeight * .35 - top) / height));
    strip.style.setProperty('--p', `${(p * 100).toFixed(2)}%`);
    headings.forEach((h, i) => marks[i].classList.toggle('toc-read', h.getBoundingClientRect().top < innerHeight * .35));
  };

  // Show the strip only once the header (and its band) is out of view.
  const seen = new IntersectionObserver(([e]) => strip.classList.toggle('toc--on', !e.isIntersecting));
  seen.observe(head);
  const sized = new ResizeObserver(layout);   // images loading change where sections sit
  sized.observe(prose);
  addEventListener('scroll', progress, { passive: true });
  addEventListener('resize', layout);
  layout();

  cleanup = () => {
    seen.disconnect();
    sized.disconnect();
    removeEventListener('scroll', progress);
    removeEventListener('resize', layout);
  };
}
