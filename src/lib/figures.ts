/**
 * Client-side behaviour for the fx- figures in posts (see styles/figures.css).
 * Every figure renders its default state as static HTML; this only adds
 * the pickers, the image viewer, the before/after slider and tooltips.
 * Runs on every astro:page-load, so each element is wired once (data-ready).
 */

const once = (el: HTMLElement) => (el.dataset.ready ? false : ((el.dataset.ready = '1'), true));

/* ── Tooltips: any element with data-tip ── */
let tip: HTMLDivElement | null = null;
function tooltips(root: ParentNode) {
  if (!tip || !document.body.contains(tip)) {
    tip = document.createElement('div');
    tip.className = 'fx-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }
  const t = tip;
  const place = (x: number, y: number) => {
    const r = t.getBoundingClientRect();
    const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 14));
    const top = y - r.height - 12 < 8 ? y + 18 : y - r.height - 12;
    t.style.left = `${left}px`;
    t.style.top = `${top}px`;
  };
  root.querySelectorAll<HTMLElement>('[data-tip]').forEach(el => {
    if (!once(el)) return;
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    const show = (x: number, y: number) => {
      // First line is the label (bold), the rest is detail.
      t.replaceChildren(...(el.dataset.tip ?? '').split('\n').map((line, i) => {
        const row = document.createElement(i ? 'span' : 'b');
        row.textContent = line;
        return row;
      }));
      t.classList.add('is-on'); place(x, y);
    };
    el.addEventListener('pointerenter', e => show(e.clientX, e.clientY));
    el.addEventListener('pointermove', e => place(e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => t.classList.remove('is-on'));
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); show(r.left + r.width / 2, r.top); });
    el.addEventListener('blur', () => t.classList.remove('is-on'));
  });
}

/* ── Image viewer: one image visible, tabs swap them ── */
function views(fig: HTMLElement) {
  if (!once(fig)) return;
  const btns = [...fig.querySelectorAll<HTMLButtonElement>('.fx-tabs button')];
  const imgs = [...fig.querySelectorAll<HTMLImageElement>('.fx-views img')];
  const note = fig.querySelector<HTMLElement>('.fx-views-note');
  btns.forEach((b, i) => b.addEventListener('click', () => {
    btns.forEach((o, j) => o.setAttribute('aria-pressed', String(i === j)));
    imgs.forEach((img, j) => img.classList.toggle('is-on', i === j));
    if (note) note.textContent = imgs[i]?.dataset.note ?? '';
  }));
}

/* ── Before/after slider ── */
function compare(fig: HTMLElement) {
  if (!once(fig)) return;
  const box = fig.querySelector<HTMLElement>('.fx-compare');
  const input = fig.querySelector<HTMLInputElement>('.fx-compare input');
  if (!box || !input) return;
  const set = () => box.style.setProperty('--x', `${input.value}%`);
  input.addEventListener('input', set);
  set();

  // Optional scene/view picker: data-steps holds, per scene, the colour-scale max,
  // tick step and mean steps per ray [RADV, TinyBVH] for each view.
  if (!fig.dataset.steps) return;
  type Scene = { name: string; vmax: number; step: number; means: [number, number][] };
  const scenes = JSON.parse(fig.dataset.steps) as Record<string, Scene>;
  const base = fig.dataset.base ?? '';
  const state: Record<string, string> = {};
  const btns = [...fig.querySelectorAll<HTMLButtonElement>('button[data-group]')];
  btns.forEach(b => { if (b.getAttribute('aria-pressed') === 'true') state[b.dataset.group!] = b.dataset.value!; });
  const [under, over] = [...box.querySelectorAll<HTMLImageElement>('img')];
  const tags = [...box.querySelectorAll<HTMLElement>('.fx-compare-tag b')];
  const ticks = fig.querySelector<HTMLElement>('.fx-heatscale-ticks');
  const where = fig.querySelector<HTMLElement>('.fx-compare-where');
  const show = () => {
    const s = scenes[state.scene], v = Number(state.view);
    over.src = `${base}/steps-${state.scene}-v${v}-native.jpg`;
    under.src = `${base}/steps-${state.scene}-v${v}-tinybvh.jpg`;
    s.means[v - 1].forEach((m, i) => { if (tags[i]) tags[i].textContent = m.toFixed(1); });
    if (ticks) {
      ticks.replaceChildren();
      for (let t = 0; t <= s.vmax; t += s.step) {
        const span = document.createElement('span');
        span.style.left = `${(100 * t / s.vmax).toFixed(2)}%`;
        span.textContent = String(t);
        ticks.appendChild(span);
      }
    }
    if (where) where.textContent = `${s.name}, view ${v}`;
  };
  btns.forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.group!;
    state[g] = b.dataset.value!;
    btns.filter(o => o.dataset.group === g).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    show();
  }));
}

/* ── Code tabs: buttons pick which <pre> is shown ── */
function codeTabs(fig: HTMLElement) {
  if (!once(fig)) return;
  const btns = [...fig.querySelectorAll<HTMLButtonElement>('.fx-tabs button')];
  const pres = [...fig.querySelectorAll<HTMLElement>(':scope > pre')];
  const show = (i: number) => {
    btns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    pres.forEach((p, j) => p.classList.toggle('is-on', i === j));
  };
  btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
  show(0);
  fig.classList.add('is-ready');
}

/* ── Column chart with a picker: data-states maps "key1|key2" to column heights, labels, tips and ticks.
   Optional "All" view (data-view="all"): a speed-up grid whose cells carry both trees' ratios in data-v. ── */
type ColState = { h?: number[]; val?: string[]; tip?: string[]; ticks?: [number, string][]; tick?: number; summary?: string };
function paintCell(c: HTMLElement, tree: string, trav: string) {
  const [mine, radv] = (JSON.parse(c.dataset.v!) as Record<string, [number, number]>)[tree];
  const v = trav === 'tb' ? radv : mine;
  const slow = v < 1;
  // Diverging around 1.0×: blue deepens to 2×, red deepens to 0.8×.
  const p = slow ? Math.min(1, (1 - v) / 0.2) * 55 : Math.min(1, (v - 1) / 1) * 100;
  c.style.setProperty('--p', `${p.toFixed(1)}%`);
  c.classList.toggle('is-slow', slow);
  c.classList.toggle('is-strong', !slow && p > 62);
  c.textContent = `${v.toFixed(2)}×`;
  c.dataset.tip = `${c.dataset.scene} · ${c.dataset.rays}\nMy kernel: ${mine.toFixed(2)}× native\nRADV's shader: ${radv.toFixed(2)}× native`;
}
function colSwitch(fig: HTMLElement) {
  if (!once(fig)) return;
  const states = JSON.parse(fig.dataset.states ?? '{}') as Record<string, ColState>;
  const keys = (fig.dataset.keys ?? '').split(',');
  const btns = [...fig.querySelectorAll<HTMLButtonElement>('button[data-group]')];
  const pick: Record<string, string> = {};
  btns.forEach(b => { if (b.getAttribute('aria-pressed') === 'true') pick[b.dataset.group!] = b.dataset.value!; });
  const chart = fig.querySelector<HTMLElement>('.fx-cols')!;
  const columns = [...fig.querySelectorAll<HTMLElement>('.fx-col')];
  const yAxis = fig.querySelector<HTMLElement>('.fx-cols-y')!;
  const summary = fig.querySelector<HTMLElement>('.fx-cols-summary');
  const allView = fig.querySelector<HTMLElement>('[data-view="all"]');
  const sceneView = fig.querySelector<HTMLElement>('[data-view="scene"]');
  const cells = [...fig.querySelectorAll<HTMLElement>('.fx-cell[data-v]')];
  const show = () => {
    const s = states[keys.map(k => pick[k]).join('|')];
    if (!s) return;
    const all = pick.scene === 'all';
    if (allView && sceneView) { allView.hidden = !all; sceneView.hidden = all; }
    fig.querySelectorAll<HTMLElement>('[data-only="all"]').forEach(el => { el.hidden = !all; });
    if (all) cells.forEach(c => paintCell(c, pick.tree, pick.trav ?? 'cl'));
    else if (s.h && s.val && s.tip && s.ticks && s.tick !== undefined) {
      columns.forEach((c, i) => {
        c.style.setProperty('--h', `${s.h![i]}%`);
        c.dataset.tip = s.tip![i];
        const v = c.querySelector('.fx-col-val');
        if (v) v.textContent = s.val![i];
      });
      chart.style.setProperty('--tick', `${s.tick}%`);
      yAxis.replaceChildren(...s.ticks.map(([pos, label]) => {
        const span = document.createElement('span');
        span.style.bottom = `${pos}%`;
        span.textContent = label;
        return span;
      }));
    }
    if (summary && s.summary) summary.innerHTML = s.summary; // static, author-written markup from data-states
  };
  const choose = (group: string, value: string) => {
    pick[group] = value;
    btns.filter(o => o.dataset.group === group).forEach(o => o.setAttribute('aria-pressed', String(o.dataset.value === value)));
    show();
  };
  btns.forEach(b => b.addEventListener('click', () => choose(b.dataset.group!, b.dataset.value!)));
  // Grid rows and cells jump to that scene's column chart
  fig.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => el.addEventListener('click', () => choose('scene', el.dataset.goto!)));
}

/* ── Further reading: shelf chips filter the cards, arrows page through them ── */
function reading(fig: HTMLElement) {
  if (!once(fig)) return;
  const track = fig.querySelector<HTMLElement>('.fx-reading-track');
  if (!track) return;
  const cards = [...track.querySelectorAll<HTMLElement>('.fx-read')];
  const chips = [...fig.querySelectorAll<HTMLButtonElement>('[data-shelf]')].filter(b => b.tagName === 'BUTTON');
  const [prev, next] = [...fig.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const ends = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
    track.classList.toggle('is-end', track.scrollLeft >= max - 2);
  };
  chips.forEach(chip => chip.addEventListener('click', () => {
    const shelf = chip.dataset.shelf!;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    cards.forEach(card => { card.hidden = shelf !== 'all' && card.dataset.shelf !== shelf; });
    track.scrollTo({ left: 0 });
    ends();
  }));
  [prev, next].forEach(b => b.addEventListener('click', () =>
    track.scrollBy({ left: Number(b.dataset.step) * track.clientWidth * .8, behavior: 'smooth' })));
  track.addEventListener('scroll', ends, { passive: true });
  new ResizeObserver(ends).observe(track);
  ends();
}

export function initFigures() {
  document.querySelectorAll<HTMLElement>('[data-fx="colswitch"]').forEach(colSwitch);
  document.querySelectorAll<HTMLElement>('[data-fx="views"]').forEach(views);
  document.querySelectorAll<HTMLElement>('[data-fx="compare"]').forEach(compare);
  document.querySelectorAll<HTMLElement>('[data-fx="codetabs"]').forEach(codeTabs);
  document.querySelectorAll<HTMLElement>('[data-fx="reading"]').forEach(reading);
  tooltips(document);
}
