# The fx- figure vocabulary

What exists in `src/styles/figures.css` + `src/lib/figures.ts`, what each piece
is *for*, and where to see a working example. The way to learn the markup is to
open the example and copy its structure, then fill it with the new post's own
content. This is a vocabulary to compose from, not a menu to pick from. Most
posts will use a handful of these, and some posts will need something new.

Examples: **T** = `src/content/blog/tinybvh-amd-hardware-ray-tracing.md`;
project pages are in `src/content/projects/`.

## Shell pieces (every figure)

| Piece | Use | Example |
|---|---|---|
| `figure.fx > .fx-panel` | The bordered panel every figure sits in | any |
| `.fx-kicker`, `.fx-title` | `Figure N · topic` in mono caps, then a claim/question in serif | any |
| `.fx-cap` | Caption under the panel: how to read it + takeaway + method | any |
| `.fx-legend` + `.fx-sw` (`--c:var(--c-tb)`) | Series key; `.fx-sw--line` for dashed/line series | T fig 9, bvh.md fig 1 |
| `.fx-scroll` | Wrap wide content (tables, SVG with `min-width`) so phones scroll it | T fig 1 |
| `data-tip="Label&#10;detail"` | Hover/focus tooltip on any element | T figs 4–6, 9 |
| `.fx-controls > .fx-seg` | Labelled toggle-button group above a figure (`button[data-group][data-value][aria-pressed]`) | T figs 11, 13 |

## Numbers and results

| Component | Good for | Example |
|---|---|---|
| `.fx-glance` / `.fx-stats` / `.fx-stat` | "At a glance" headline numbers at the top of a post | T top |
| `.fx-cols` (column chart) | A few series compared across several categories, shared y-axis; `--h` per column, `--tick` for gridlines | T fig 9 |
| `data-fx="colswitch"` + `data-states` | Same column chart per scene/config, switched by a picker; optional "All" grid view | T figs 11, 12 |
| `.fx-bars` (horizontal bars) | One value per row, long labels, big ranges (before/after, ranking) | wavefront.md fig 2, LBVH.md fig 2, cloth.md fig 3 |
| `.fx-grid` / `.fx-cell` (heat grid) | Ratio per (row × column), diverging around 1.0× (blue = faster, red = slower) | T fig 11 "All" view |
| `.fx-table` (+ `.num`, `.fx-yes/.fx-part/.fx-no`, `tr.is-pick`) | Qualitative comparisons, or numbers that need exact values | T fig 1, bvh.md fig 2 |
| `.fx-stack100` | A 100%-stacked bar inside a table cell: where the time/bytes go | T fig 14 |
| `.fx-slots-row` / `.fx-slot` (`is-full`, `is-part --fill`) | Occupancy: how many of N slots are used | T fig 7 |

## Structure and process

| Component | Good for | Example |
|---|---|---|
| `.fx-strip` / `.fx-seg-b` (`--f` = width in bytes/bits) | Memory / bit layouts, row by row with `.fx-row-off` offsets; `is-empty`, `is-ref`, `is-strong`, `.fx-mark` for a split point | T figs 4–6 |
| `.fx-flow` / `.fx-node` / `.fx-arrow` | Steps of a pipeline or process as chips and arrows; `.fx-flow--line` + `.fx-call` to label each arrow; `.fx-stack` for alternatives; `is-ours` for what I added | T figs 3, 8 |
| `.fx-gens` / `.fx-gen` | Side-by-side columns of "what changed in each version/generation" | T fig 2 |
| `.fx-lanes` | SIMD/GPU lanes or registers as rows of cells | cloth.md fig 2 |
| `svg.fx-ill` | Anything spatial or bespoke: partitions, geometry, timelines, kernels over time. Use semantic classes from figures.css, never inline colours | bvh.md fig 1, wavefront.md fig 1, LBVH.md fig 1, cloth.md fig 1 |

## Images

| Component | Good for | Example |
|---|---|---|
| `data-fx="views"` + `.fx-views` | Tabs between alternative renders of the same frame (with a per-image `data-note`) | T fig 10 |
| `data-fx="compare"` + `.fx-compare` | Before/after slider of two aligned images, optional picker and heat-scale bar | T fig 13 |

## Text and code

| Component | Good for | Example |
|---|---|---|
| `data-fx="codetabs"` | The same code step in two versions (e.g. two GPU generations) | T "The traversal loop" |
| `data-fx="reading"` + `.fx-read` cards | Further reading shelf with filter chips; card `--c` uses spectrum colours per shelf | T end |

## When nothing fits

Design a new component instead of bending one of these (see "Extending the
figure system" in SKILL.md). Keep the same visual language so it looks like
part of the site:

- the panel, kicker, title and caption shell
- IBM Plex Mono for small labels and axis text, the body sans for values, and
  Spectral only for the figure title
- thin `--border` lines, a 3–6px radius, and no shadows or gradients except the
  spectrum
- colour only from the `--c-*` tokens, with their fixed meanings
- tooltips for detail
- a static default state that works without JS
