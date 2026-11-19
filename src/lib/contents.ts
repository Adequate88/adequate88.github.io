/**
 * Contents (see components/Contents.astro): tracks which section you're
 * reading, fills the rail up to it, opens that section's subsections, and
 * runs the narrow-screen pill (shown once the header scrolls away, hidden
 * again at the footer). Runs on every astro:page-load.
 */

let cleanup: (() => void) | null = null;

export function initContents() {
  cleanup?.();
  cleanup = null;

  const nav = document.querySelector<HTMLElement>('[data-contents]');
  const prose = document.querySelector<HTMLElement>('.prose');
  if (!nav || !prose) return;

  const body = nav.querySelector<HTMLElement>('.contents-body')!;
  const panel = nav.querySelector<HTMLElement>('.contents-panel')!;
  const toggle = nav.querySelector<HTMLButtonElement>('.contents-toggle')!;
  const now = nav.querySelector<HTMLElement>('[data-contents-now]')!;
  const index = nav.querySelector<HTMLElement>('[data-contents-index]')!;
  const sections = [...nav.querySelectorAll<HTMLElement>('.contents-section')];

  const pairs = [...nav.querySelectorAll<HTMLAnchorElement>('.contents-link')]
    .map(link => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((p): p is { link: HTMLAnchorElement; target: HTMLElement } => p.target !== null);
  const links = pairs.map(p => p.link);
  if (!links.length) return;

  nav.dataset.live = '';

  // Where each heading sits on the page; re-measured as images load and the layout shifts.
  let tops: number[] = [];
  let proseTop = 0, proseEnd = 1;
  const measure = () => {
    // A rail beside the text if the margin has room for one, otherwise the pill.
    const left = prose.getBoundingClientRect().right + 40;
    const width = Math.min(240, document.documentElement.clientWidth - left - 24);
    const rail = width >= 170;
    if (rail && nav.classList.contains('is-open')) setOpen(false);
    nav.classList.toggle('contents--rail', rail);
    nav.classList.toggle('contents--pill', !rail);
    nav.style.setProperty('--rail-left', `${Math.round(left)}px`);
    nav.style.setProperty('--rail-width', `${Math.round(width)}px`);

    // Measured after the mode is set: the plain list (no-JS fallback) took up room above the text.
    const r = prose.getBoundingClientRect();
    proseTop = r.top + scrollY;
    proseEnd = r.bottom + scrollY;
    tops = pairs.map(p => p.target.getBoundingClientRect().top + scrollY);
    update();
  };

  // A link's line, measured from the top of the rail.
  const lineY = (link: HTMLElement) => {
    const line = getComputedStyle(link, '::before');
    return link.offsetTop + parseFloat(line.top) + parseFloat(line.height) / 2;
  };

  let active = -2;
  const update = () => {
    const y = scrollY + innerHeight * .3;
    let i = -1;
    while (i + 1 < tops.length && tops[i + 1] <= y) i++;

    if (i !== active) {
      active = i;
      links.forEach((link, k) => {
        link.classList.toggle('is-read', k < i);
        link.classList.toggle('is-active', k === i);
        if (k === i) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const section = i < 0 ? 0 : sections.indexOf(links[i].closest<HTMLElement>('.contents-section')!);
      sections.forEach((s, k) => s.classList.toggle('is-open', k === section && i >= 0));
      now.textContent = sections[section].querySelector('.contents-link')!.textContent;
      index.textContent = String(section + 1);
      if (i >= 0) keepInView(links[i]);
    }

    // Fill the rail to the current line, then on toward the next as you read through the section.
    let fill = 0;
    if (i >= 0) {
      const from = lineY(links[i]);
      const to = i + 1 < links.length ? lineY(links[i + 1]) : body.offsetHeight;
      const end = i + 1 < tops.length ? tops[i + 1] : proseEnd;
      const f = Math.min(1, Math.max(0, (y - tops[i]) / Math.max(1, end - tops[i])));
      fill = from + f * (to - from);
    }
    body.style.setProperty('--fill', `${fill.toFixed(1)}px`);
    const p = Math.min(1, Math.max(0, (y - proseTop) / Math.max(1, proseEnd - proseTop)));
    nav.style.setProperty('--progress', `${(p * 100).toFixed(2)}%`);
  };

  // If the list scrolls (short windows, or the pill's sheet), keep the current entry visible.
  const keepInView = (link: HTMLElement) => {
    if (panel.scrollHeight <= panel.clientHeight) return;
    const top = link.offsetTop + body.offsetTop, bottom = top + link.offsetHeight;
    if (top < panel.scrollTop + 24) panel.scrollTop = top - 24;
    else if (bottom > panel.scrollTop + panel.clientHeight - 24) panel.scrollTop = bottom - panel.clientHeight + 24;
  };

  let frame = 0;
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };

  // The pill's sheet.
  const setOpen = (open: boolean) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open && active >= 0) keepInView(links[active]);
  };
  const onToggle = () => setOpen(!nav.classList.contains('is-open'));
  const onLink = (e: Event) => { if ((e.target as Element).closest('.contents-link')) setOpen(false); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  };
  const onOutside = (e: PointerEvent) => { if (!nav.contains(e.target as Node)) setOpen(false); };

  // The pill appears once the header is out of view and steps aside at the footer.
  const head = document.querySelector('.post-head');
  const foot = document.querySelector('.post-foot');
  const shown = new IntersectionObserver(([e]) => nav.classList.toggle('is-shown', !e.isIntersecting));
  const done = new IntersectionObserver(([e]) => {
    nav.classList.toggle('is-done', e.isIntersecting);
    if (e.isIntersecting) setOpen(false);
  });
  if (head) shown.observe(head); else nav.classList.add('is-shown');
  if (foot) done.observe(foot);

  const sizedProse = new ResizeObserver(measure);
  sizedProse.observe(prose);
  const sizedList = new ResizeObserver(update);   // subsections opening and closing move the lines
  sizedList.observe(body);

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  toggle.addEventListener('click', onToggle);
  panel.addEventListener('click', onLink);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onOutside);
  measure();

  cleanup = () => {
    cancelAnimationFrame(frame);
    shown.disconnect();
    done.disconnect();
    sizedProse.disconnect();
    sizedList.disconnect();
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', measure);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside);
  };
}
