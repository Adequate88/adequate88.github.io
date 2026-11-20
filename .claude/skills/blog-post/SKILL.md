---
name: blog-post
description: The house standard for blog posts on Alessandro's portfolio site. Use for ANY work on a blog post in src/content/blog/ — drafting a new post, turning notes, a report or a thesis into a post, adding or changing figures, charts or diagrams, restructuring, or polishing the writing — even when the user just says "write up X", "make a post about Y", "add a graph here" or "the blog". Also use when adding fx- figures to a project page.
---

# Writing a blog post

The reference post is `src/content/blog/tinybvh-amd-hardware-ray-tracing.md`
(live at `/blog/tinybvh-amd-hardware-ray-tracing`). **Read it before writing or
changing any post.** It sets the standard for structure, voice, figure language
and rigour that every post should meet.

## What "the standard" means, and what it doesn't

Match the reference post's **kind** of writing and figures, not its contents.

- Do **not** copy its figures, or reach for a figure type because the reference
  used it. A byte-strip diagram belongs in a post about memory layouts; a
  scene-by-ray-set heat grid belongs in a post with that shape of data. Every
  figure must come from *this* post's own subject and data.
- Do design figures of the same **quality and type**: clean, data-honest,
  explanatory diagrams and charts built from HTML/CSS/SVG in the `fx-` system,
  one per idea a reader would otherwise have to hold in their head.
- If the subject needs a figure the system doesn't have yet (a timeline, a
  memory-hierarchy diagram, a scatter plot…), **build a new `fx-` component** in
  the same visual language rather than forcing an existing one to fit. See
  "Extending the figure system" below.
- A figure must earn its place: it shows a structure, a comparison or a result
  more clearly than a sentence could. No decorative figures, no figures that
  repeat a single number already in the text.

## File and frontmatter

`src/content/blog/<slug>.md` (plain Markdown with raw HTML; no MDX). Schema in
`src/content/config.ts`:

```yaml
---
title: "Plain, specific title"
date: 2026-11-18
excerpt: "2–4 sentences: the problem, what I did, the headline result."
tags: [graphics-programming, ray-tracing, ...]
image: /assets/blog/<short-name>/hero.png   # also used as the social card
readtime: 14 min read                        # estimate at ~220 words/min of prose
---
```

Assets go in `public/assets/blog/<short-name>/` and are referenced with absolute
paths. Use `.jpg` for renders/photos, `.png` for anything with flat colour or
text. Give every `<img>` real `alt` text, plus `loading="lazy" decoding="async"`.

## Anatomy of a post

1. **Tech line** right under the frontmatter: `**Tech:** C++, Vulkan, ...`
2. **"At a glance" stat row** (`fx-glance`), 3–4 headline numbers, each with a
   short key, the number, and a label saying exactly what it measures. Only for
   posts with real results; skip it for purely explanatory posts.
3. **Why should we care?** The motivation in plain terms, ending with the
   project's goals as a short numbered list of bold questions
   (`1. **Can we do X?** ...`). The results section answers them.
4. **Body sections** (`##`), each one idea, ordered so every section only needs
   what came before. Use `###` for steps or sub-results inside a section.
   The contents rail and the coloured heading bars are generated from `##`/`###`
   automatically: keep headings short (they appear in the rail) and never add
   your own numbering, bars or heading styles.
5. **Results** with `###` per comparison: setup (hardware, scenes, how it was
   measured) → figure → what stands out, often as bold-lead bullets.
6. **Next steps**: bold-lead bullets of honest open problems and limits.
7. **Takeaways**: a short personal paragraph on what the project taught me.
8. **Further reading**: the `fx-reading` shelf of cards (sources the project
   relied on + a starting point for newcomers), each card with a one-line *why*.
9. **Credits line** in italics: who proposed/supervised it, where the code lives.

Not every post needs every section, but the arc (why → how → does it work →
what's next) should always be there.

## Voice

- First person, conversational but precise: "I" for my own work, "we" when
  walking the reader through, or for work done with a supervisor.
- Explain *why* before *how*. Introduce every term the first time it appears.
- Be honest about surprises, failures and costs (e.g. "This result was
  unexpected", the build-time "catch" figure). Never oversell.
- Numbers always carry units and context (which GPU, which scene, median of how
  many runs).
- Inline code for identifiers (`BVH4_GPU`), bold for the one key term per
  paragraph at most. Don't overuse inline code in running prose; it breaks the
  line.
- Code blocks are short, simplified excerpts with comments, introduced by the
  sentence before them ("The loop looks something like:"). Use `fx-codetabs`
  when the same step exists in two versions.

## Figure rules

Full component catalogue with examples: [reference/figures.md](reference/figures.md).

- **Shell**: `<figure class="fx"><div class="fx-panel">` → `fx-kicker`
  (`Figure N · Short topic`) → `fx-title` (a claim or question, not a label:
  "Same 128 bytes, twice the children") → content → close panel →
  `<figcaption class="fx-cap">`.
- **Numbering** is sequential through the post, and the prose refers to every
  figure by number ("as Figure 9 shows"), *before or right after* it appears.
- **Captions** say how to read the figure and what to take away, plus any
  method details (sample counts, medians, what's excluded). If the figure is
  interactive, the caption says so ("Hover a field for details", "Drag to
  compare, and pick a scene above").
- **Colour has meaning** and is the same in every post (tokens in
  `src/styles/figures.css`):
  - `--c-tb` (blue): *my* work / the thing the post is about
  - `--c-ref` (grey): the baseline or reference I compare against
  - `--c-alt` (amber): an occasional third series
  - `--c-slow` (red): only for "worse than the baseline"
  Never hard-code hex colours in a figure; use the tokens so both themes work.
- **Data honesty**: every number in a figure is a real, measured value that is
  also stated or derivable from the prose. Never invent, round away or
  "illustrate" data. If the data isn't available, ask for it, or make the figure
  explanatory (a diagram) rather than quantitative.
- **Detail on hover, not on the page**: put secondary numbers in `data-tip`
  (first line = bold label, `&#10;` separates lines) rather than crowding labels.
- **Interactivity only when it reveals something**: a picker when the same chart
  exists per scene/config, a before/after slider when two images must be compared
  pixel-for-pixel, tabs for alternative renders. The default state must be
  complete, readable static HTML (no JS required to see the main point).
- **Width**: figures sit in a ~650px column and must work on a 390px phone.
  Wide content goes in `fx-scroll` with a sensible `min-width`.

### Markdown + HTML gotchas

- A blank line ends an HTML block, and 4-space indentation turns HTML into a
  code block. Write each figure as **one line of HTML** (or flush-left lines with
  no blank lines between them). When generating figure HTML from a script,
  strip each line and drop empty ones before writing it into the post.
- Fenced code inside `fx-codetabs` is the exception: put a blank line after the
  opening `<div ...>` line and before `</div>` so Markdown renders the fences.
- Escape `<`/`>` inside figure HTML as `&lt;`/`&gt;` (e.g. `MBVH&lt;M&gt;`).
- For data-heavy figures (column heights as `--h:%`, axis ticks, JSON in
  `data-states`), generate the HTML with a small script from the raw numbers
  instead of computing by hand, so the figure and the prose can't drift apart.
  Keep such one-off scripts in the scratchpad, not the repo, unless they'll be
  reused.

## Extending the figure system

- Styles: `src/styles/figures.css`. Add a new section with a `/* ── Name ── */`
  comment, prefix every class `fx-`, use only theme tokens (`--text`,
  `--text-subtle`, `--border`, `--fx-panel`, `--c-*`), and check both themes.
- Behaviour: `src/lib/figures.ts`. Add a function guarded by `once(el)`, hook it
  to a `data-fx="name"` attribute in `initFigures()`. It must enhance static
  HTML, never be required to render it.
- Some existing behaviours are still specific to the TinyBVH post: `compare()`
  builds image paths as `steps-<scene>-v<view>-{native,tinybvh}.jpg`, and
  `paintCell()` writes "My kernel / RADV's shader" tooltips. If a new post needs
  them, generalise them (paths and labels from data attributes) rather than
  copying or special-casing.
- Inline SVG illustrations use `class="fx-ill"` with semantic classes defined in
  figures.css (`.lbl`, `.frame`, `.b1`, ...), never inline fills, so they follow
  the theme. Add new semantic classes there as needed.

## Site style is global; don't restyle per post

Typography, heading spacing, the coloured `##` bars, the contents rail, body
font (IBM Plex Sans), heading font (Spectral) and colours are site-wide in
`src/styles/` (`tokens.css`, `fraunhofer.css`, `prose.css`, `contents.css`).
A post never carries its own `<style>`; if something looks wrong, fix it
globally and check the other posts and project pages still look right.

## Check before calling it done

1. `npm run build` passes (the content schema validates the frontmatter).
2. Screenshot the post in **light and dark** mode at desktop width and at
   **390px**, with headless Chromium against a static server on `dist/`:
   `chromium --headless --hide-scrollbars --virtual-time-budget=6000
   --window-size=1300,8000 [--force-dark-mode] --screenshot=out.png <url>`.
   Look at every figure: labels legible, nothing overflowing, colours readable
   in both themes (yellows are faint on the light background).
3. Every figure is referenced in the prose, numbered in order, and every number
   in it matches the text.
4. Click through interactive figures in a real browser if any were added or
   changed (headless screenshots don't exercise JS states).
